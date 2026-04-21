"""Seven REST endpoints over the Fuseki-backed ontology.

1. GET  /ontology/classes                 — List OWL classes
2. GET  /ontology/properties              — List OWL properties
3. GET  /ontology/instances                — Instances of a class (paginated)
4. GET  /ontology/stats                    — Count by class
5. POST /ontology/sparql                   — Raw SPARQL SELECT (power user)
6. GET  /ontology/analytics/atc-loss       — Q1: AT&C loss by feeder
7. POST /ontology/compliance/credits/mint  — Mint a carbon credit with OWL chain check
   GET  /ontology/compliance/credits/{id}/audit — Q3: audit chain for a credit
"""
from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..auth.dependencies import require_admin, require_editor, require_viewer
from ..auth.models import User
from . import fuseki
from . import sparql_lib as ql
from .schemas import (
    ClassInfo,
    CountByClass,
    MintCreditRequest,
    MintCreditResponse,
    PropertyInfo,
    SparqlRequest,
    SparqlResponse,
)

router = APIRouter(prefix="/ontology", tags=["ontology"])


def _local(uri: str) -> str:
    for sep in ("#", "/"):
        if sep in uri:
            return uri.rsplit(sep, 1)[1]
    return uri


def _audit(actor: str, action: str, target: str) -> None:
    """Write an immutable AuditEntry triple to Fuseki."""
    ts = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    hid = f"data:audit_{uuid.uuid4().hex[:12]}"
    sha = hashlib.sha256(f"{actor}|{action}|{target}|{ts}".encode()).hexdigest()
    fuseki.sparql_update(ql.PREFIX + f"""
INSERT DATA {{
  {hid} a es:AuditEntry ;
    es:auditActor "{actor}" ;
    es:auditAction "{action}" ;
    es:auditTimestamp "{ts}"^^xsd:dateTime ;
    es:auditHash "{sha}" .
}}
""")


# 1. Classes
@router.get("/classes", response_model=list[ClassInfo])
def list_classes(_: User = Depends(require_viewer)):
    res = fuseki.sparql_select(ql.q_classes())
    out = []
    for b in res.get("results", {}).get("bindings", []):
        uri = b["cls"]["value"]
        out.append(ClassInfo(
            uri=uri,
            local_name=_local(uri),
            label=b.get("label", {}).get("value"),
            comment=b.get("comment", {}).get("value"),
        ))
    return out


# 2. Properties
@router.get("/properties", response_model=list[PropertyInfo])
def list_properties(_: User = Depends(require_viewer)):
    res = fuseki.sparql_select(ql.q_properties())
    out = []
    for b in res.get("results", {}).get("bindings", []):
        uri = b["prop"]["value"]
        out.append(PropertyInfo(
            uri=uri,
            local_name=_local(uri),
            type=b["type"]["value"],
            domain=b.get("domain", {}).get("value"),
            range=b.get("range", {}).get("value"),
            label=b.get("label", {}).get("value"),
        ))
    return out


# 3. Instances (of a specific class, paginated)
@router.get("/instances")
def list_instances(
    class_uri: str = Query(..., description="Full URI of the class, e.g. https://ontology.energystack.in/core#Transformer"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    _: User = Depends(require_viewer),
):
    res = fuseki.sparql_select(ql.q_instances_of(class_uri, limit=limit, offset=offset))
    # Group triples by subject
    grouped: dict[str, dict[str, list[str]]] = {}
    for b in res.get("results", {}).get("bindings", []):
        s = b["s"]["value"]
        p = _local(b["p"]["value"])
        o = b["o"]["value"]
        grouped.setdefault(s, {"uri": s, "local_name": _local(s)}).setdefault(p, []).append(o)
    # Flatten single-value lists
    for s, bucket in grouped.items():
        for k, v in list(bucket.items()):
            if isinstance(v, list) and len(v) == 1:
                bucket[k] = v[0]
    return {"class_uri": class_uri, "count": len(grouped), "instances": list(grouped.values())}


# 4. Stats
@router.get("/stats", response_model=list[CountByClass])
def stats(_: User = Depends(require_viewer)):
    res = fuseki.sparql_select(ql.q_count_by_class())
    out = []
    for b in res.get("results", {}).get("bindings", []):
        uri = b["cls"]["value"]
        out.append(CountByClass(
            class_uri=uri,
            class_name=_local(uri),
            n=int(b["n"]["value"]),
        ))
    return out


# 5. Raw SPARQL SELECT
@router.post("/sparql", response_model=SparqlResponse)
def sparql(req: SparqlRequest, user: User = Depends(require_viewer)):
    q = req.query.strip()
    lowered = q.lower()
    # Safety: only allow read queries via this endpoint. Mutations go through dedicated routes.
    forbidden = ("insert", "delete", "drop", "clear", "create", "load")
    if any(kw in lowered for kw in forbidden):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Mutations are not allowed on /sparql. Use the dedicated routes.")
    try:
        return fuseki.sparql_select(q)
    except Exception as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"SPARQL error: {e}")


# 6. Analytics: Q1 AT&C loss
@router.get("/analytics/atc-loss")
def atc_loss(_: User = Depends(require_viewer)):
    res = fuseki.sparql_select(ql.q1_atc_loss_by_zone())
    rows = []
    for b in res.get("results", {}).get("bindings", []):
        rows.append({
            "feeder_uri": b["feeder"]["value"],
            "feeder_name": _local(b["feeder"]["value"]),
            "billed_kwh": float(b["billed"]["value"]),
            "distributed_kwh": float(b["distributed"]["value"]),
            "loss_pct": float(b["lossPct"]["value"]),
        })
    return {"count": len(rows), "rows": rows}


# 6b. Analytics: Q2 feeder load summary
@router.get("/analytics/feeder-load")
def feeder_load(_: User = Depends(require_viewer)):
    res = fuseki.sparql_select(ql.q2_feeder_load_summary())
    rows = []
    for b in res.get("results", {}).get("bindings", []):
        rows.append({
            "feeder_uri": b["feeder"]["value"],
            "feeder_name": _local(b["feeder"]["value"]),
            "total_kwh": float(b["totalKwh"]["value"]),
            "readings": int(b["readings"]["value"]),
        })
    return {"count": len(rows), "rows": rows}


# 7. Mint carbon credit (OWL chain enforcement)
@router.post("/compliance/credits/mint", response_model=MintCreditResponse)
def mint_credit(
    req: MintCreditRequest,
    user: User = Depends(require_editor),
):
    # Verify asset exists
    check = fuseki.sparql_select(ql.PREFIX + f"""
ASK {{ <{req.asset_uri}> a ?t . FILTER(?t = es:Transformer || ?t = es:Feeder || ?t = es:Substation || ?t = es:GridAsset || ?t = es:Line) }}
""")
    if not check.get("boolean"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Asset {req.asset_uri} does not exist as a GridAsset.")

    ts = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    mrv_id = f"data:mrv_{uuid.uuid4().hex[:10]}"
    credit_id = f"data:credit_{uuid.uuid4().hex[:10]}"
    # tCO2e = kWh * (baseline - project) / 1000  (kg → t)
    qty = max(0.0, (req.baseline_ef - req.project_ef) * req.mrv_kwh / 1000.0)

    fuseki.sparql_update(ql.PREFIX + f"""
INSERT DATA {{
  {mrv_id} a es:MRVRecord ;
    es:mrvAsset <{req.asset_uri}> ;
    es:mrvActivity "{req.mrv_activity}" ;
    es:mrvKwh {req.mrv_kwh} ;
    es:mrvStatus "verified" .

  {credit_id} a es:CarbonCredit ;
    es:verifiedBy {mrv_id} ;
    es:sourceAsset <{req.asset_uri}> ;
    es:creditVintage {req.vintage} ;
    es:creditQty {qty} ;
    es:methodology "{req.methodology}" ;
    es:createdAt "{ts}"^^xsd:dateTime .
}}
""")
    _audit(user.email, "mint_credit", credit_id)

    return MintCreditResponse(
        credit_uri=f"https://ontology.energystack.in/data#{credit_id.split(':')[1]}",
        mrv_uri=f"https://ontology.energystack.in/data#{mrv_id.split(':')[1]}",
        credit_qty_tco2e=round(qty, 4),
        status="minted",
    )


@router.get("/compliance/credits/{credit_local}/audit")
def audit_credit(credit_local: str, _: User = Depends(require_viewer)):
    credit_uri = f"https://ontology.energystack.in/data#{credit_local}"
    res = fuseki.sparql_select(ql.q3_carbon_credit_audit_chain(credit_uri))
    bindings = res.get("results", {}).get("bindings", [])
    if not bindings:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Credit {credit_local} not found or missing audit chain.")
    b = bindings[0]
    return {
        "credit_uri": b["credit"]["value"],
        "mrv_uri": b["mrv"]["value"],
        "asset_uri": b["asset"]["value"],
        "asset_type": _local(b["assetType"]["value"]),
        "location_uri": b.get("loc", {}).get("value"),
    }


# Admin utility: reload ontology
@router.post("/admin/reload", status_code=200)
def reload_ontology(user: User = Depends(require_admin)):
    fuseki.reset_dataset()
    loaded = fuseki.load_all_ontology()
    n = fuseki.count_triples()
    _audit(user.email, "reload_ontology", f"{len(loaded)} files")
    return {"files": loaded, "triples": n}
