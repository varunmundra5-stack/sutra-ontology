# Sutra OS — Energy Ontology

Open-source semantic layer for India's energy sector. Powers three
downstream products: **DISCOM AI**, **Grid Asset Digital Twin**, and
**Carbon & Subsidy Ledger**.

## Stack

Everything in the stack is Apache 2.0 or MIT licensed:

| Layer           | Component              |
|-----------------|------------------------|
| Schema          | OWL 2 + SHACL          |
| Semantic store  | Apache Jena Fuseki     |
| Graph store     | ArcadeDB               |
| Time-series     | TimescaleDB            |
| Consent cache   | Valkey                 |
| Policy engine   | OPA                    |
| API             | FastAPI                |
| UI              | React + Vite + Tailwind|

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full data-flow diagram.

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

Then:

| URL                            | Purpose                         |
|--------------------------------|---------------------------------|
| http://localhost:5173          | Web console (React)             |
| http://localhost:8000/docs     | FastAPI OpenAPI                 |
| http://localhost:3030          | Fuseki admin (user: `admin`)    |
| http://localhost:2480          | ArcadeDB Studio                 |
| http://localhost:8181          | OPA API                         |

Default admin login: `admin@sutra.local` / `admin123` (change in `.env`).

## Layout

```
sutra-ontology/
├── docker-compose.yml         # 7 services: db, fuseki, arcadedb, valkey, opa, backend, frontend
├── ARCHITECTURE.md            # Data-flow diagram, ports, module map
├── ontology/                  # OWL / SHACL files
│   ├── core.ttl               # Root classes + shared properties
│   ├── grid_asset.ttl · consumer.ttl · measurement.ttl
│   ├── transaction.ttl · compliance.ttl · consent_policy.ttl
│   ├── shacl_shapes.ttl       # Runtime validation shapes
│   ├── discom_ai.ttl          # Product profile 1
│   ├── digital_twin.ttl       # Product profile 2
│   ├── carbon_ledger.ttl      # Product profile 3
│   ├── synthetic_data.ttl     # Seed data (~12k triples)
│   └── generate_synthetic.py
├── policies/                  # OPA Rego (bind-mounted live into OPA)
│   ├── rbac.rego
│   └── consent.rego
├── backend/
│   └── app/
│       ├── main.py            # FastAPI entry
│       ├── config.py
│       ├── auth/              # JWT + RBAC (3 roles)
│       ├── adapters/          # SCADA / AMI / GIS / Billing → RDF
│       ├── core/              # Valkey · OPA · Timescale · SHACL · ArcadeDB clients
│       ├── governance/        # Consent + policy + SHACL endpoints
│       └── ontology/          # Fuseki, SPARQL lib, ingest, time-series
└── frontend/
    └── src/
        ├── App.tsx            # Route table
        ├── pages/             # Dashboard, Ontology, Instances, Analytics,
        │                      # SPARQL, Governance, Admin, Login, Register
        ├── components/        # Navbar, Layout, Protected, ThemeToggle
        └── context/           # Auth + Theme providers
```

## Notable endpoints

| Method | Path                                     | Role         | Purpose                                     |
|--------|------------------------------------------|--------------|---------------------------------------------|
| GET    | `/health`                                | public       | Status of Fuseki, Valkey, OPA, ArcadeDB     |
| POST   | `/auth/register` / `/auth/login`         | public       | Create account / sign in                    |
| GET    | `/ontology/classes` / `/properties`      | viewer       | OWL class + property registry               |
| POST   | `/ontology/sparql`                       | viewer       | Read-only SPARQL (mutations blocked)        |
| POST   | `/ingest/raw`                            | editor       | Adapter-mediated feed ingest                |
| POST   | `/governance/consent`                    | editor       | Register a ConsentArtifact                  |
| POST   | `/governance/policy/check`               | any signed-in| Evaluate OPA RBAC for the user              |
| POST   | `/governance/shacl/validate`             | any signed-in| Validate Turtle snippet against shapes      |
| GET    | `/timeseries/asset?asset_uri=…`          | viewer       | Latest N readings for an asset              |
| POST   | `/ontology/compliance/credits/mint`      | editor       | Mint a carbon credit (OWL chain enforced)   |

## Auth

- `admin` — full access, user management
- `editor` — read + write instances, register consent, mint credits
- `viewer` — read-only (default for self-registered users)

JWT tokens are signed with `JWT_SECRET` and denied on logout via Valkey.

## Validation

SHACL shapes enforce at runtime:
- Positive transformer rating, voltage level from a fixed enum
- Feeder / consumer categories from enums
- LoadReading must have `atTime` + non-negative `kwh`
- ATCLossRecord `lossPct` in `[0, 100]`
- **CarbonCredit** must reference exactly one MRVRecord **and** at least one
  GridAsset, with `tonnesCO2e > 0` (this is the mint-chain contract)
- ConsentArtifact needs `grantedBy`, `scope`, `validUntil`
