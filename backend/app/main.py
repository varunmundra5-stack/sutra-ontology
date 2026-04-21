import asyncio
import logging
import time
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, SessionLocal, engine
from .auth.models import Role, User
from .auth.routes import router as auth_router
from .auth.security import hash_password
from .core import arcadedb_client, opa_client, timescale, valkey_client
from .core.shacl_validator import validator as shacl_validator
from .governance.routes import router as governance_router
from .ontology import fuseki
from .ontology.routes import router as ontology_router
from .ontology.ingest import router as ingest_router
from .ontology.timeseries_routes import router as timeseries_router

log = logging.getLogger("uvicorn.error")


def _wait_for(url: str, name: str, max_wait_s: int = 60) -> bool:
    start = time.time()
    while time.time() - start < max_wait_s:
        try:
            r = httpx.get(url, timeout=2.0)
            if r.status_code in (200, 204):
                return True
        except Exception:
            pass
        time.sleep(1.5)
    log.warning(f"{name} not reachable at {url} after {max_wait_s}s (continuing)")
    return False


def _seed_admin() -> None:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == settings.seed_admin_email).first()
        if existing:
            return
        u = User(
            email=settings.seed_admin_email,
            hashed_password=hash_password(settings.seed_admin_password),
            full_name="Sutra Admin",
            role=Role.admin,
        )
        db.add(u)
        db.commit()
        log.info(f"Seeded admin user: {settings.seed_admin_email}")
    finally:
        db.close()


def _seed_ontology() -> None:
    try:
        fuseki.ensure_dataset()
    except Exception as e:
        log.warning(f"ensure_dataset failed (continuing): {e}")
    try:
        n = fuseki.count_triples()
    except Exception:
        n = 0
    if n > 100:
        log.info(f"Ontology already loaded ({n} triples) — skipping reseed.")
        return
    log.info("Loading ontology + SHACL + synthetic data into Fuseki…")
    loaded = fuseki.load_all_ontology()
    n = fuseki.count_triples()
    log.info(f"Loaded {len(loaded)} TTL files → {n} triples")


def _critical_startup() -> None:
    """Synchronous DB setup — runs in thread pool so event loop stays free."""
    try:
        Base.metadata.create_all(bind=engine)
        log.info("DB schema ready.")
    except Exception as e:
        log.error(f"DB schema creation failed: {e}")

    try:
        _seed_admin()
    except Exception as e:
        log.error(f"Admin seeding failed: {e}")

    try:
        timescale.ensure_hypertable()
    except Exception as e:
        log.warning(f"Hypertable setup failed: {e}")


async def _background_init() -> None:
    """Slow startup tasks — fire-and-forget after server is live.

    Runs in thread-pool workers so blocking I/O (HTTP polls, file reads)
    never stalls the event loop or the /health endpoint.
    """
    loop = asyncio.get_running_loop()

    # Wait for soft dependencies
    try:
        await loop.run_in_executor(
            None, lambda: _wait_for(f"{settings.fuseki_url}/$/ping", "Fuseki")
        )
    except Exception as e:
        log.warning(f"Fuseki wait failed: {e}")

    try:
        await loop.run_in_executor(
            None, lambda: _wait_for(f"{settings.opa_url}/health", "OPA", max_wait_s=30)
        )
    except Exception as e:
        log.warning(f"OPA wait failed: {e}")

    # Load ontology into Fuseki
    try:
        await loop.run_in_executor(None, _seed_ontology)
    except Exception as e:
        log.error(f"Ontology seeding failed (server still up): {e}")

    # Preload SHACL shapes
    try:
        await loop.run_in_executor(None, shacl_validator._load_shapes)
    except Exception as e:
        log.warning(f"SHACL preload failed: {e}")

    # Touch optional services
    try:
        valkey_ok = await loop.run_in_executor(None, valkey_client.ping)
        if valkey_ok:
            log.info("Valkey: connected.")
        else:
            log.warning("Valkey: not reachable (non-fatal).")
    except Exception as e:
        log.warning(f"Valkey check failed: {e}")

    try:
        arcade_ok = await loop.run_in_executor(None, arcadedb_client.health)
        if arcade_ok:
            await loop.run_in_executor(None, arcadedb_client.ensure_database)
            log.info("ArcadeDB: connected.")
        else:
            log.warning("ArcadeDB: not reachable (non-fatal).")
    except Exception as e:
        log.warning(f"ArcadeDB check failed: {e}")

    log.info("Background init complete.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run critical (but gracefully-failing) DB setup in thread pool
    # so the event loop is never blocked and /health works immediately.
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _critical_startup)

    # Kick off slow background work — server is live from here
    asyncio.create_task(_background_init())

    yield
    # Shutdown — nothing to tear down


app = FastAPI(
    title="Sutra OS — Energy Ontology API",
    description=(
        "Open-source semantic layer for India's energy sector. "
        "Stack: OWL 2 + SHACL · Apache Jena Fuseki · ArcadeDB · "
        "TimescaleDB · Valkey · OPA · FastAPI."
    ),
    version="1.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(ontology_router)
app.include_router(governance_router)
app.include_router(ingest_router)
app.include_router(timeseries_router)


@app.get("/health")
def health():
    try:
        n = fuseki.count_triples()
        fuseki_ok = True
    except Exception:
        n = 0
        fuseki_ok = False
    return {
        "status": "ok",
        "fuseki_ok": fuseki_ok,
        "triples": n,
        "dataset": settings.fuseki_dataset,
        "valkey_ok": valkey_client.ping(),
        "opa_ok": opa_client.health(),
        "arcadedb_ok": arcadedb_client.health(),
    }


@app.get("/")
def root():
    return {
        "name": "Sutra OS — Energy Ontology API",
        "stack": {
            "schema": "OWL 2 + SHACL",
            "semantic_store": "Apache Jena Fuseki",
            "graph_store": "ArcadeDB",
            "time_series": "TimescaleDB",
            "consent_cache": "Valkey",
            "policy_engine": "OPA",
            "api": "FastAPI",
        },
        "docs": "/docs",
        "health": "/health",
    }
