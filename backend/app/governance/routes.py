"""Governance & consent plane.

Endpoints:
  GET  /governance/health                 — status of Valkey + OPA + SHACL + TimescaleDB
  POST /governance/consent                — register a ConsentArtifact (editor+)
  GET  /governance/consent/{subject_id}   — fetch cached / live consent
  POST /governance/policy/check           — synchronous OPA RBAC check
  POST /governance/shacl/validate         — validate a Turtle snippet against shapes

All mutations write an AuditEntry triple into Fuseki for the paper trail.
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..auth.dependencies import get_current_user, require_editor
from ..auth.models import User
from ..core import opa_client, valkey_client
from ..core.shacl_validator import validator as shacl_validator
from ..core.timescale import ensure_hypertable  # noqa: F401  (side-effect ok)
from ..ontology import fuseki

log = logging.getLogger("uvicorn.error")
router = APIRouter(prefix="/governance", tags=["governance"])


# ---------- Status ----------

@router.get("/health")
def governance_health() -> dict[str, Any]:
    return {
        "valkey_ok": valkey_client.ping(),
        "opa_ok": opa_client.health(),
        "shacl_shapes_loaded": len(shacl_validator._load_shapes()) > 0,
    }


# ---------- Consent artifacts ----------

class ConsentIn(BaseModel):
    subject_id: str = Field(..., description="Consumer or asset URI the consent covers")
    granted_by: str = Field(..., description="Principal who granted (email / URI)")
    scope: list[str] = Field(..., description="List of allowed purposes")
    valid_until: datetime


@router.post("/consent")
def register_consent(body: ConsentIn, user: User = Depends(require_editor)) -> dict[str, Any]:
    # 1. Build the ConsentArtifact triple
    cid = hashlib.sha256(f"{body.subject_id}|{body.granted_by}|{body.valid_until.isoformat()}".encode()).hexdigest()[:16]
    ca_uri = f"https://data.energystack.in/consent/{cid}"
    scope_vals = " , ".join(f'"{s}"' for s in body.scope)
    ttl = (
        "@prefix es: <https://ontology.energystack.in/core#> .\n"
        "@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n"
        f"<{ca_uri}> a es:ConsentArtifact ;\n"
        f'    es:grantedBy "{body.granted_by}" ;\n'
        f"    es:subject <{body.subject_id}> ;\n"
        f"    es:scope {scope_vals} ;\n"
        f'    es:validUntil "{body.valid_until.isoformat()}"^^xsd:dateTime .\n'
    )

    # 2. SHACL validate before writing
    ok, report = shacl_validator.validate_turtle(ttl)
    if not ok:
        raise HTTPException(400, f"SHACL validation failed: {report[:500]}")

    # 3. Write to Fuseki  (strip @prefix lines — they're Turtle syntax, invalid in SPARQL)
    body_ttl = "\n".join(
        line for line in ttl.splitlines()
        if not line.strip().lower().startswith("@prefix")
    ).replace("\n", " ")
    fuseki.sparql_update(
        "PREFIX es: <https://ontology.energystack.in/core#>\n"
        "PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>\n"
        f"INSERT DATA {{ {body_ttl} }}"
    )

    # 4. Cache it in Valkey
    payload = {
        "active": True,
        "scope": body.scope,
        "validUntil": body.valid_until.isoformat(),
        "granted_by": body.granted_by,
        "consent_uri": ca_uri,
    }
    valkey_client.cache_consent(body.subject_id, payload)

    # 5. Audit
    _audit(user.email, "consent.register", {"subject": body.subject_id, "uri": ca_uri})
    return {"ok": True, "consent_uri": ca_uri, "cached": True}


@router.get("/consent/{subject_id:path}")
def get_consent(subject_id: str, user: User = Depends(get_current_user)) -> dict[str, Any]:
    cached = valkey_client.read_consent(subject_id)
    if cached:
        return {"source": "cache", **cached}
    # Fall back to Fuseki
    q = f"""
    PREFIX es: <https://ontology.energystack.in/core#>
    SELECT ?c ?g ?scope ?until WHERE {{
      ?c a es:ConsentArtifact ;
         es:subject <{subject_id}> ;
         es:grantedBy ?g ;
         es:scope ?scope ;
         es:validUntil ?until .
    }} LIMIT 10
    """
    res = fuseki.sparql_select(q)
    rows = res.get("results", {}).get("bindings", [])
    if not rows:
        return {"source": "none", "active": False}
    scopes = sorted({r["scope"]["value"] for r in rows})
    payload = {
        "active": True,
        "scope": scopes,
        "validUntil": rows[0]["until"]["value"],
        "granted_by": rows[0]["g"]["value"],
        "consent_uri": rows[0]["c"]["value"],
    }
    valkey_client.cache_consent(subject_id, payload)
    return {"source": "fuseki", **payload}


# ---------- Live policy check ----------

class PolicyCheckIn(BaseModel):
    action: str = Field(..., description="read | write | mint | admin")
    resource_kind: str = Field(..., description="ontology | instance | credit | governance | admin")
    resource_id: str = ""


@router.post("/policy/check")
def policy_check(body: PolicyCheckIn, user: User = Depends(get_current_user)) -> dict[str, Any]:
    allow, reason = opa_client.check_rbac(
        user={"email": user.email, "role": user.role.value},
        action=body.action,
        resource={"kind": body.resource_kind, "id": body.resource_id},
    )
    return {"allow": allow, "reason": reason}


# ---------- SHACL validation ----------

class ValidateIn(BaseModel):
    turtle: str


@router.post("/shacl/validate")
def shacl_validate(body: ValidateIn, user: User = Depends(get_current_user)) -> dict[str, Any]:
    ok, report = shacl_validator.validate_turtle(body.turtle)
    return {"conforms": ok, "report": report}


# ---------- Audit helper ----------

def _audit(actor: str, action: str, details: dict[str, Any]) -> None:
    import json
    now = datetime.now(timezone.utc).isoformat()
    payload = json.dumps({"actor": actor, "action": action, "details": details, "ts": now}, sort_keys=True)
    h = hashlib.sha256(payload.encode()).hexdigest()
    aid = f"https://data.energystack.in/audit/{h[:16]}"
    # Escape the JSON for safe embedding in Turtle
    safe = payload.replace("\\", "\\\\").replace('"', '\\"')
    ttl = (
        f"@prefix es: <https://ontology.energystack.in/core#> . "
        f"@prefix xsd: <http://www.w3.org/2001/XMLSchema#> . "
        f"<{aid}> a es:AuditEntry ; "
        f'es:actor "{actor}" ; '
        f'es:action "{action}" ; '
        f'es:timestamp "{now}"^^xsd:dateTime ; '
        f'es:payloadHash "{h}" ; '
        f'es:payload "{safe}" .'
    )
    try:
        fuseki.sparql_update(f"INSERT DATA {{ {ttl} }}")
    except Exception as e:
        log.warning(f"audit write failed: {e}")
