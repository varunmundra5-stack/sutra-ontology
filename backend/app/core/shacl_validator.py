"""SHACL validation — enforces the schema contract before writes land.

Usage:
    validator = ShaclValidator(shapes_path=settings.shacl_shapes_file)
    ok, report = validator.validate_graph(rdflib.Graph().parse(data=ttl_snippet, format="turtle"))
    if not ok: raise HTTPException(400, report)

We lazy-load the shapes graph once on first use, then reuse it.
"""
from __future__ import annotations

import logging
import threading
from pathlib import Path
from typing import Optional

from rdflib import Graph
from pyshacl import validate

from ..config import settings

log = logging.getLogger("uvicorn.error")


class ShaclValidator:
    _lock = threading.Lock()
    _shapes: Optional[Graph] = None

    def __init__(self, shapes_path: str | None = None):
        self.shapes_path = Path(shapes_path or settings.shacl_shapes_file)

    def _load_shapes(self) -> Graph:
        if ShaclValidator._shapes is not None:
            return ShaclValidator._shapes
        with ShaclValidator._lock:
            if ShaclValidator._shapes is None:
                g = Graph()
                if self.shapes_path.exists():
                    g.parse(str(self.shapes_path), format="turtle")
                    log.info(f"Loaded SHACL shapes: {len(g)} triples from {self.shapes_path}")
                else:
                    log.warning(f"SHACL shapes file not found: {self.shapes_path}")
                ShaclValidator._shapes = g
        return ShaclValidator._shapes

    def validate_graph(self, data_graph: Graph) -> tuple[bool, str]:
        shapes = self._load_shapes()
        if len(shapes) == 0:
            return True, "no shapes loaded"
        try:
            conforms, _report_graph, report_text = validate(
                data_graph=data_graph,
                shacl_graph=shapes,
                inference="rdfs",
                abort_on_first=False,
                meta_shacl=False,
                advanced=True,
                debug=False,
            )
            return bool(conforms), report_text or ""
        except Exception as e:
            log.error(f"SHACL validation error: {e}")
            return False, f"validator error: {e}"

    def validate_turtle(self, turtle_str: str) -> tuple[bool, str]:
        g = Graph()
        try:
            g.parse(data=turtle_str, format="turtle")
        except Exception as e:
            return False, f"invalid turtle: {e}"
        return self.validate_graph(g)


# Module-level singleton for convenient import.
validator = ShaclValidator()
