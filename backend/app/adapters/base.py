"""Adapter base + shared helpers."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone


ES = "https://ontology.energystack.in/core#"
TTL_PREFIX = (
    "@prefix es:   <https://ontology.energystack.in/core#> .\n"
    "@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .\n"
    "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n"
)


@dataclass
class AdapterResult:
    turtle: str = ""                        # schema-shaped Turtle for Fuseki
    timeseries: list[dict] = field(default_factory=list)  # rows for TimescaleDB
    source_type: str = ""                   # SCADA | AMI | GIS | Billing
    source_id: str = ""

    def has_timeseries(self) -> bool:
        return bool(self.timeseries)


class Adapter(ABC):
    """Contract every adapter implements."""

    source_type: str = "UNKNOWN"

    @abstractmethod
    def transform(self, payload: dict) -> AdapterResult:
        ...


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
