"""Ingest route — the hot path from raw feeds into the graph.

Flow:
    raw payload
       │
       ▼
   consent check  (OPA /v1/data/sutra/consent/allow, using Valkey cache)
       │
       ▼
   adapter.transform() → (turtle, timeseries_rows)
       │
       ▼
   SHACL validate turtle
       │
       ▼
   Fuseki INSERT + Timescale bulk insert
       │
       ▼
   AuditEntry written
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..adapters import ADAPTERS
from ..auth.dependencies import require_editor
from ..auth.models import User
from ..core import opa_client, timescale, valkey_client
from ..core.shacl_validator import validator as shacl_validator
from ..governance.routes import _audit
from . import fuseki

log = logging.getLogger("uvicorn.error")
router = APIRouter(prefix="/ingest", tags=["ingest"])


class IngestIn(BaseModel):
    source_type: str           # SCADA | AMI | GIS | Billing
    purpose: str = "operations"
    subject_id: str | None = None   # consumer / asset URI that grants consent
    payload: dict[str, Any]


@router.post("/raw")
def ingest_raw(body: IngestIn, user: User = Depends(require_editor)) -> dict[str, Any]:
    # 1. Pick adapter
    adapter_cls = ADAPTERS.get(body.source_type)
    if not adapter_cls:
        raise HTTPException(400, f"unknown source_type: {body.source_type}")
    adapter = adapter_cls()

    # 2. Consent check (only for consumer-linked feeds)
    if body.source_type in ("AMI", "Billing"):
        subject = body.subject_id or body.payload.get("consumer_uri", "")
        consent = valkey_client.read_consent(subject) or {"active": False, "scope": [], "validUntil": "1970-01-01T00:00:00Z"}
        now_iso = datetime.now(timezone.utc).isoformat()
        allow, reason = opa_client.check_consent(
            subject={"entityId": subject, "kind": "consumer"},
            source={"id": body.payload.get("source_id", ""), "type": body.source_type},
            purpose=body.purpose,
            consent=consent,
            now_iso=now_iso,
        )
        if not allow:
            raise HTTPException(403, f"consent denied: {reason}")

    # 3. Transform
    result = adapter.transform(body.payload)

    # 4. SHACL validate the Turtle snippet
    if result.turtle.strip():
        ok, report = shacl_validator.validate_turtle(result.turtle)
        if not ok:
            raise HTTPException(400, f"SHACL validation failed: {report[:500]}")

    # 5. Write to Fuseki
    if result.turtle.strip():
        fuseki.sparql_update(f"INSERT DATA {{ {result.turtle.replace(chr(10), ' ')} }}")

    # 6. Stream telemetry into TimescaleDB
    rows_written = timescale.insert_readings_bulk(result.timeseries) if result.timeseries else 0

    # 7. Audit
    _audit(user.email, "ingest.raw", {
        "source_type": body.source_type,
        "purpose": body.purpose,
        "rows_timescale": rows_written,
        "triples_written": result.turtle.count("\n"),
    })

    return {
        "ok": True,
        "source_type": body.source_type,
        "rows_timescale": rows_written,
        "triples_written": result.turtle.count(" ."),
    }
