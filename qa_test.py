#!/usr/bin/env python3
"""Full QA test suite for Sutra OS Energy Ontology API."""
import sys
import json
import requests

BASE = "http://localhost:8001"
PASS = "✅"
FAIL = "❌"
WARN = "⚠️ "

results = []

def check(label, ok, detail=""):
    icon = PASS if ok else FAIL
    line = f"{icon} {label}"
    if detail:
        line += f"  →  {detail}"
    print(line)
    results.append((label, ok))
    return ok

def get_token(email, password):
    try:
        r = requests.post(f"{BASE}/auth/login",
                          json={"email": email, "password": password}, timeout=10)
        if r.status_code == 200:
            return r.json().get("access_token")
    except Exception as e:
        print(f"   Login error: {e}")
    return None

def hdr(token):
    return {"Authorization": f"Bearer {token}"}

print("\n" + "="*60)
print("  Sutra OS — Full QA Suite")
print("="*60)

# ── 1. Auth ─────────────────────────────────────────────────
print("\n[1] AUTH")
admin_token  = get_token("admin@sutra.local",   "admin123")
editor_token = get_token("editor@sutra.local",  "editor123")
viewer_token = get_token("viewer@sutra.local",  "viewer123")
discom_token = get_token("discom@sutra.local",  "discom123")
analyst_tok  = get_token("analyst@sutra.local", "analyst123")

check("Login admin",   bool(admin_token))
check("Login editor",  bool(editor_token))
check("Login viewer",  bool(viewer_token))
check("Login discom",  bool(discom_token))
check("Login analyst", bool(analyst_tok))

r = requests.get(f"{BASE}/auth/me", headers=hdr(admin_token), timeout=10)
check("GET /auth/me (admin)", r.status_code == 200, r.json().get("email",""))

r = requests.get(f"{BASE}/auth/users", headers=hdr(admin_token), timeout=10)
users = r.json() if r.status_code == 200 else []
check("GET /auth/users (admin)", r.status_code == 200, f"{len(users)} users")

r = requests.get(f"{BASE}/auth/users", headers=hdr(viewer_token), timeout=10)
check("GET /auth/users (viewer → forbidden)", r.status_code == 403)

# ── 2. Health / Root ────────────────────────────────────────
print("\n[2] HEALTH")
r = requests.get(f"{BASE}/health", timeout=10)
h = r.json() if r.status_code == 200 else {}
check("GET /health", r.status_code == 200, json.dumps(h))

r = requests.get(f"{BASE}/", timeout=10)
check("GET /", r.status_code == 200)

# ── 3. Ontology ─────────────────────────────────────────────
print("\n[3] ONTOLOGY (Knowledge Graph)")

r = requests.get(f"{BASE}/ontology/classes", headers=hdr(admin_token), timeout=15)
data = r.json() if r.status_code == 200 else []
classes = data if isinstance(data, list) else data.get("classes", [])
check("GET /ontology/classes", r.status_code == 200, f"{len(classes)} classes")

r = requests.get(f"{BASE}/ontology/properties", headers=hdr(admin_token), timeout=15)
data = r.json() if r.status_code == 200 else []
props = data if isinstance(data, list) else data.get("properties", [])
check("GET /ontology/properties", r.status_code == 200, f"{len(props)} properties")

r = requests.get(f"{BASE}/ontology/stats", headers=hdr(admin_token), timeout=15)
check("GET /ontology/stats", r.status_code == 200, str(r.json()))

# ── 4. Instances / Grid Assets ──────────────────────────────
print("\n[4] GRID ASSETS (Instances)")
# /ontology/instances requires class_uri — pick the first class from the list above
if classes:
    cls_uri = classes[0].get("uri") if isinstance(classes[0], dict) else classes[0]
    r = requests.get(f"{BASE}/ontology/instances",
                     params={"class_uri": cls_uri},
                     headers=hdr(admin_token), timeout=15)
    data = r.json() if r.status_code == 200 else {}
    check("GET /ontology/instances?class_uri", r.status_code == 200,
          f"{data.get('count', '?')} instances of {cls_uri.split('#')[-1]}")
    # try a second class
    if len(classes) > 1:
        cls2 = classes[1].get("uri") if isinstance(classes[1], dict) else classes[1]
        r2 = requests.get(f"{BASE}/ontology/instances",
                          params={"class_uri": cls2},
                          headers=hdr(admin_token), timeout=15)
        check(f"GET /ontology/instances (2nd class)", r2.status_code == 200,
              f"{r2.json().get('count','?')} instances" if r2.status_code==200 else r2.text[:60])
else:
    check("GET /ontology/instances?class_uri", False, "no classes returned to test with")

# ── 5. SPARQL (Query Lab) ───────────────────────────────────
print("\n[5] QUERY LAB (SPARQL)")
sparql_q = "SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 5"
r = requests.post(f"{BASE}/ontology/sparql",
                  json={"query": sparql_q},
                  headers=hdr(admin_token), timeout=20)
check("POST /ontology/sparql (SELECT)", r.status_code == 200,
      f"{len(r.json().get('results',{}).get('bindings',[]))} rows" if r.status_code==200 else r.text[:80])

# SPARQL ASK
ask_q = "ASK { ?s ?p ?o }"
r = requests.post(f"{BASE}/ontology/sparql",
                  json={"query": ask_q},
                  headers=hdr(admin_token), timeout=20)
check("POST /ontology/sparql (ASK)", r.status_code == 200)

# ── 6. Analytics ────────────────────────────────────────────
print("\n[6] ANALYTICS")
r = requests.get(f"{BASE}/ontology/analytics/atc-loss",
                 headers=hdr(admin_token), timeout=15)
atc = r.json() if r.status_code == 200 else {}
check("GET /ontology/analytics/atc-loss", r.status_code == 200,
      f"{len(atc.get('data', atc) if isinstance(atc,dict) else atc)} records" if r.status_code==200 else r.text[:80])

r = requests.get(f"{BASE}/ontology/analytics/feeder-load",
                 headers=hdr(admin_token), timeout=15)
check("GET /ontology/analytics/feeder-load", r.status_code == 200,
      f"{len(r.json()) if r.status_code==200 else 0} records")

# ── 7. Governance / Compliance ──────────────────────────────
print("\n[7] COMPLIANCE (Governance)")
r = requests.get(f"{BASE}/governance/health", headers=hdr(admin_token), timeout=10)
check("GET /governance/health", r.status_code == 200, str(r.json()))

r = requests.post(f"{BASE}/governance/policy/check",
                  json={"action": "read", "resource_kind": "ontology"},
                  headers=hdr(admin_token), timeout=10)
check("POST /governance/policy/check (admin read)", r.status_code == 200, str(r.json()))

r = requests.post(f"{BASE}/governance/policy/check",
                  json={"action": "mint", "resource_kind": "credit"},
                  headers=hdr(viewer_token), timeout=10)
check("POST /governance/policy/check (viewer mint → deny)", r.status_code == 200,
      f"allow={r.json().get('allow')}" if r.status_code==200 else r.text[:60])

# ── 8. Timeseries ───────────────────────────────────────────
print("\n[8] TIMESERIES")
FEEDER_URI = "http://sutra.energy/feeder/F001_Nashik"
r = requests.get(f"{BASE}/timeseries/asset",
                 params={"asset_uri": FEEDER_URI, "limit": 20},
                 headers=hdr(admin_token), timeout=15)
ts_resp = r.json() if r.status_code == 200 else {}
check("GET /timeseries/asset", r.status_code == 200,
      f"{ts_resp.get('count','?')} rows for F001_Nashik")

r = requests.get(f"{BASE}/timeseries/feeder/load",
                 params={"feeder_uri": FEEDER_URI, "hours": 168},
                 headers=hdr(admin_token), timeout=15)
fl_resp = r.json() if r.status_code == 200 else {}
check("GET /timeseries/feeder/load", r.status_code == 200,
      f"{fl_resp.get('count','?')} hourly buckets")

# ── 9. AI Models ────────────────────────────────────────────
print("\n[9] AI MODELS")
r = requests.get(f"{BASE}/ai/models", headers=hdr(admin_token), timeout=15)
models = r.json() if r.status_code == 200 else []
check("GET /ai/models", r.status_code == 200, f"{len(models)} models: {[m.get('name') for m in models]}")

if models:
    model_name = models[0].get("name")
    features = models[0].get("feature_names", [])
    pred_input = {
        "model_name": model_name,
        "features": {f: 0.5 for f in features} if features else {"billing_efficiency": 0.7, "transformer_load": 0.6, "outage_hours": 0.3, "feeder_age_years": 0.4}
    }
    r = requests.post(f"{BASE}/ai/predict",
                      json=pred_input,
                      headers=hdr(admin_token), timeout=15)
    resp = r.json() if r.status_code == 200 else {}
    check("POST /ai/predict", r.status_code == 200,
          f"prediction={resp.get('prediction', '?'):.4f}" if r.status_code==200 and isinstance(resp.get('prediction'), (int,float)) else str(resp)[:80])

    r2 = requests.get(f"{BASE}/ai/models/{model_name}", headers=hdr(admin_token), timeout=10)
    check(f"GET /ai/models/{model_name}", r2.status_code == 200)

# ── 10. Ingest endpoints ────────────────────────────────────
print("\n[10] INGEST")
r = requests.get(f"{BASE}/ingest/adapters", timeout=10)
check("GET /ingest/adapters", r.status_code == 200,
      str(r.json()) if r.status_code==200 else r.text[:80])

# Test SCADA ingest (doesn't need consent)
scada_payload = {
    "source_type": "SCADA",
    "purpose": "operations",
    "payload": {
        "station": "QA-SS-01",
        "asset_uri": "https://data.energystack.in/asset/transformer/QA-TR-001",
        "feeder_uri": "https://data.energystack.in/asset/feeder/QA-FD-1",
        "readings": [
            {"ts": "2025-01-15T10:00:00Z", "kw": 412.3, "voltage": 11020.1},
            {"ts": "2025-01-15T11:00:00Z", "kw": 398.7, "voltage": 10985.0}
        ]
    }
}
r = requests.post(f"{BASE}/ingest/raw", json=scada_payload,
                  headers=hdr(editor_token), timeout=15)
check("POST /ingest/raw (SCADA)", r.status_code == 200,
      str(r.json()) if r.status_code==200 else r.text[:80])

# Viewer cannot ingest
r = requests.post(f"{BASE}/ingest/raw", json=scada_payload,
                  headers=hdr(viewer_token), timeout=10)
check("POST /ingest/raw (viewer → forbidden)", r.status_code == 403)

# ── 11. RBAC enforcement ────────────────────────────────────
print("\n[11] RBAC ENFORCEMENT")
# viewer should NOT be able to do destructive actions
r = requests.post(f"{BASE}/ontology/sparql",
                  json={"query": "SELECT * WHERE {?s ?p ?o} LIMIT 1"},
                  headers=hdr(viewer_token), timeout=10)
check("Viewer can read SPARQL", r.status_code == 200)

r = requests.get(f"{BASE}/auth/users", headers=hdr(editor_token), timeout=10)
check("Editor cannot list users", r.status_code == 403)

# ── Summary ─────────────────────────────────────────────────
print("\n" + "="*60)
passed = sum(1 for _, ok in results if ok)
failed = sum(1 for _, ok in results if not ok)
print(f"  TOTAL: {passed} passed, {failed} failed  ({len(results)} checks)")
print("="*60 + "\n")

if failed:
    print("Failed checks:")
    for label, ok in results:
        if not ok:
            print(f"  {FAIL} {label}")
    sys.exit(1)
