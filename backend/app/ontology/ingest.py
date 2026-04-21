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
import re
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

_PREFIX_RE = re.compile(r"@prefix\s+(\w*:)\s+<([^>]+)>\s*\.", re.IGNORECASE)


def _turtle_to_sparql_update(turtle: str) -> str:
    """Convert a Turtle snippet (with @prefix) into a valid SPARQL UPDATE string.

    SPARQL UPDATE uses ``PREFIX ns: <uri>`` (no @ or trailing dot), and the
    triples go inside ``INSERT DATA { ... }``.
    """
    sparql_prefixes: list[str] = []
    body_lines: list[str] = []
    for line in turtle.splitlines():
        m = _PREFIX_RE.match(line.strip())
        if m:
            sparql_prefixes.append(f"PREFIX {m.group(1)} <{m.group(2)}>")
        else:
            body_lines.append(line)
    body = " ".join(l for l in body_lines if l.strip())
    prefix_block = "\n".join(sparql_prefixes)
    return f"{prefix_block}\nINSERT DATA {{ {body} }}"


@router.get("/adapters")
def list_adapters() -> dict:
    """Return the list of available ingest adapter types."""
    return {"adapters": list(ADAPTERS.keys())}


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

    # 5. Write to Fuseki  (convert @prefix Turtle → SPARQL PREFIX + INSERT DATA)
    if result.turtle.strip():
        fuseki.sparql_update(_turtle_to_sparql_update(result.turtle))

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
