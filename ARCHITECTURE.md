# Sutra OS — Architecture (revised, open-source)

The ontology product is the **semantic spine** for three downstream products:
DISCOM AI, Grid Asset Digital Twin, and Carbon & Subsidy Ledger.

Every component in the stack is permissively licensed (Apache 2.0 / MIT).

## Component map

```
┌─────────────┐   ┌────────────────┐
│ IES Rails   │   │ Govt / PSU     │
│ (v0.3 Open  │   │ URJA · SLDC ·  │
│ API)        │   │ CEA · MRV      │
└──────┬──────┘   └──────┬─────────┘
       │                 │
       ▼                 ▼
     ┌───────────────────────────────┐
     │ Adapter Layer (RDF Mappers)   │
     │ SCADA · AMI · GIS · Billing   │  ← backend/app/adapters/*
     └──────────┬──────────┬─────────┘
                │          │
                ▼          ▼
  ┌──────────────────────┐  ┌────────────────────┐
  │ Consent & Governance │  │ Time-Series Store  │
  │ Plane                │  │ TimescaleDB        │
  │ OPA + SHACL +        │  │ (hypertable:       │
  │ Valkey cache         │  │  sensor_reading)   │
  └──────────┬───────────┘  └─────────┬──────────┘
             │                        │
             └───────────┬────────────┘
                         ▼
           ┌──────────────────────────────┐
           │ Ontology Core                │
           │ OWL 2 + SHACL / RDF triples  │
           │ Apache Jena Fuseki           │
           │ 6 modules + shacl_shapes.ttl │
           └──────────┬───────────────────┘
                      │
     ┌────────────────┼────────────────┐
     ▼                ▼                ▼
 discom_ai.ttl   digital_twin.ttl  carbon_ledger.ttl
     │                │                │
     ▼                ▼                ▼
 DISCOM AI      Grid-Asset DT      Carbon & Subsidy
 Platform       (sync → ArcadeDB)  Ledger
```

## Service inventory

| Layer           | Component                       | License     | Role                                                |
|-----------------|---------------------------------|-------------|-----------------------------------------------------|
| Schema          | OWL 2 + SHACL                   | W3C         | Logical model + validation contract                 |
| Semantic store  | Apache Jena Fuseki 4.10         | Apache 2.0  | RDF triples, OWL reasoning, SPARQL query / update   |
| Graph store     | ArcadeDB 24.11                  | Apache 2.0  | Property-graph mirror for digital-twin traversals   |
| Time-series     | TimescaleDB (PG-16)             | Apache 2.0  | High-freq telemetry + relational/auth DB            |
| Consent cache   | Valkey 7.2                      | BSD / Apache 2.0 | Sub-ms consent + JWT denylist + rate limits   |
| Policy engine   | OPA 0.69                        | Apache 2.0  | Runtime RBAC + consent decision logic (Rego)        |
| API             | FastAPI 0.115                   | MIT         | REST surface, DI, OpenAPI                           |
| UI              | React 18 + Vite + Tailwind      | MIT         | Web console                                         |

Postgres is deliberately replaced by **TimescaleDB** (a Postgres-16 base image
with the `timescaledb` extension) so one service handles both the auth
relational schema and the sensor_reading hypertable — no duplicated pgdata,
no extra networking.

## Data paths

### 1. Ingest path (`POST /ingest/raw`)

```
raw JSON ─▶ consent check (OPA + Valkey) ─▶ adapter.transform()
        ─▶ SHACL validate (pyshacl) ─▶ Fuseki INSERT + Timescale bulk-insert
        ─▶ AuditEntry written to Fuseki
```

Consumer-linked feeds (AMI, Billing) cannot land without an active
`ConsentArtifact` whose `scope` covers the declared `purpose`.

### 2. Read path (ontology)

Queries against OWL/RDF run against Fuseki via `POST /ontology/sparql`
(mutations blocked at the API boundary). Raw time-series reads hit
`/timeseries/asset` and `/timeseries/feeder/load`.

### 3. Governance path

`/governance/policy/check` — synchronous OPA RBAC evaluation, returns
`allow` + denial reason.
`/governance/shacl/validate` — validate any Turtle snippet against the
runtime shapes graph.
`/governance/consent` — register a `ConsentArtifact` (editor-only);
cached in Valkey for hot ingest lookups.

## Ontology modules

Core (loaded by default):
1. `core.ttl` — root classes + shared properties (PROV-O aligned)
2. `grid_asset.ttl` — Transformer, Feeder, Substation, Line, AssetState
3. `consumer.ttl` — Consumer, Utility, ServiceConnection, Tariff
4. `measurement.ttl` — SensorReading, LoadReading, ATCLossRecord, DemandForecast
5. `transaction.ttl` — Billing, Payment, Subsidy, Anomaly
6. `compliance.ttl` — MRVRecord, CarbonCredit, EmissionFactor, RegulatoryReport
7. `consent_policy.ttl` — ConsentArtifact, AccessPolicy, AuditEntry
8. `shacl_shapes.ttl` — SHACL constraints (runtime-enforced)

Product profiles (loaded alongside core; each `owl:imports` core):
- `discom_ai.ttl` — RevenueRiskScore, TheftAlert, SubsidyReconciliation
- `digital_twin.ttl` — TopologyLink, HealthScore, FailureForecast
- `carbon_ledger.ttl` — CreditBuyer, IssueEvent / TransferEvent / RetirementEvent, BRSRReport

## Ports (local dev)

| Service     | Port | Purpose                              |
|-------------|------|--------------------------------------|
| TimescaleDB | 5433 | Postgres protocol (mapped from 5432) |
| Fuseki      | 3030 | HTTP admin + SPARQL                  |
| ArcadeDB    | 2480 | HTTP + Studio                        |
| ArcadeDB    | 2424 | Binary protocol                      |
| Valkey      | 6379 | Redis protocol                       |
| OPA         | 8181 | Data API + Health                    |
| Backend     | 8000 | FastAPI                              |
| Frontend    | 5173 | Vite dev server                      |
