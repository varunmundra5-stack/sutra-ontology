"""ArcadeDB client — multi-model (Cypher + SPARQL + document) store.

Role in the stack:
  * Fuseki is the *authoritative* semantic store (OWL reasoning, SPARQL).
  * ArcadeDB mirrors product-profile sub-graphs as a property graph so
    the digital-twin product can run fast Cypher traversals over
    topology + health without paying OWL-reasoning overhead.

We talk to ArcadeDB over its HTTP API:
    POST {ARCADEDB_URL}/api/v1/command/{db}
    body: {"language": "sql" | "cypher" | "sparql", "command": "..."}
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from ..config import settings

log = logging.getLogger("uvicorn.error")


def _auth() -> tuple[str, str]:
    return (settings.arcadedb_user, settings.arcadedb_password)


def _base() -> str:
    return settings.arcadedb_url.rstrip("/")


def ensure_database() -> None:
    """Create the Sutra database if missing. ArcadeDB auto-creates via
    the env flag in docker-compose; this is a safety net."""
    try:
        r = httpx.post(
            f"{_base()}/api/v1/server",
            json={"command": f"create database {settings.arcadedb_database}"},
            auth=_auth(), timeout=5.0,
        )
        if r.status_code >= 400 and "already exists" not in r.text.lower():
            log.warning(f"ArcadeDB create db returned {r.status_code}: {r.text[:200]}")
    except Exception as e:
        log.warning(f"ArcadeDB ensure_database skipped: {e}")


def command(language: str, command: str) -> Any:
    """Execute a statement. language in {sql, cypher, sparql, gremlin}."""
    r = httpx.post(
        f"{_base()}/api/v1/command/{settings.arcadedb_database}",
        json={"language": language, "command": command},
        auth=_auth(), timeout=10.0,
    )
    r.raise_for_status()
    return r.json().get("result", [])


def health() -> bool:
    try:
        r = httpx.get(f"{_base()}/api/v1/ready", timeout=2.0)
        return r.status_code == 200
    except Exception:
        return False
