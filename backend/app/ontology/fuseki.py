"""Thin Fuseki SPARQL client + dataset bootstrapper.

Fuseki exposes:
- GET  /{dataset}/query    for SELECT/ASK/CONSTRUCT
- POST /{dataset}/update   for INSERT/DELETE
- POST /{dataset}/data     for RDF upload
- Admin on /$/datasets     (Basic auth)
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import httpx

from ..config import settings

ADMIN_AUTH = ("admin", settings.fuseki_admin_password)


def _query_url() -> str:
    return f"{settings.fuseki_url}/{settings.fuseki_dataset}/query"


def _update_url() -> str:
    return f"{settings.fuseki_url}/{settings.fuseki_dataset}/update"


def _data_url() -> str:
    return f"{settings.fuseki_url}/{settings.fuseki_dataset}/data"


def _admin_url(path: str) -> str:
    return f"{settings.fuseki_url}{path}"


def ensure_dataset() -> None:
    """Create the TDB2 dataset on Fuseki if it does not exist."""
    with httpx.Client(timeout=10.0) as c:
        r = c.get(_admin_url("/$/datasets"), auth=ADMIN_AUTH)
        if r.status_code != 200:
            raise RuntimeError(f"Fuseki admin unreachable: {r.status_code} {r.text}")
        existing = [ds["ds.name"].strip("/") for ds in r.json().get("datasets", [])]
        if settings.fuseki_dataset in existing:
            return
        r = c.post(
            _admin_url("/$/datasets"),
            auth=ADMIN_AUTH,
            data={"dbName": settings.fuseki_dataset, "dbType": "tdb2"},
        )
        if r.status_code not in (200, 201):
            raise RuntimeError(f"Failed to create dataset: {r.status_code} {r.text}")


def load_ttl_file(path: str) -> int:
    """Upload a single .ttl file into the dataset's default graph. Returns bytes uploaded."""
    data = Path(path).read_bytes()
    with httpx.Client(timeout=60.0) as c:
        r = c.post(
            _data_url(),
            content=data,
            headers={"Content-Type": "text/turtle; charset=utf-8"},
            auth=ADMIN_AUTH,
        )
        r.raise_for_status()
    return len(data)


def load_all_ontology() -> dict[str, int]:
    """Load every .ttl file in ONTOLOGY_DIR into Fuseki. Returns map of filename → bytes."""
    loaded: dict[str, int] = {}
    d = Path(settings.ontology_dir)
    if not d.exists():
        return loaded
    for f in sorted(d.glob("*.ttl")):
        loaded[f.name] = load_ttl_file(str(f))
    return loaded


def sparql_select(query: str) -> dict[str, Any]:
    """Execute a SELECT/ASK SPARQL query and return the JSON bindings."""
    with httpx.Client(timeout=30.0) as c:
        r = c.post(
            _query_url(),
            data={"query": query},
            headers={"Accept": "application/sparql-results+json"},
        )
        r.raise_for_status()
        return r.json()


def sparql_update(query: str) -> None:
    with httpx.Client(timeout=30.0) as c:
        r = c.post(
            _update_url(),
            data={"update": query},
            headers={"Accept": "application/json"},
            auth=ADMIN_AUTH,
        )
        r.raise_for_status()


def count_triples() -> int:
    res = sparql_select("SELECT (COUNT(*) AS ?c) WHERE { ?s ?p ?o }")
    try:
        return int(res["results"]["bindings"][0]["c"]["value"])
    except (KeyError, IndexError, ValueError):
        return 0


def reset_dataset() -> None:
    """Drop all triples in the default graph. Admin-only."""
    sparql_update("CLEAR DEFAULT")
