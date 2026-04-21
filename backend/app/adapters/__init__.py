"""Adapter layer.

Each adapter takes a raw, system-specific payload and returns:
    (turtle_snippet, timeseries_rows)

Where:
    turtle_snippet  — RDF Turtle to land in Fuseki (schema-shaped)
    timeseries_rows — list[dict] of rows for the TimescaleDB hypertable

This is the "RDF Mappers" box in the architecture diagram.
"""

from .scada import ScadaAdapter
from .ami import AmiAdapter
from .gis import GisAdapter
from .billing import BillingAdapter

ADAPTERS = {
    "SCADA":   ScadaAdapter,
    "AMI":     AmiAdapter,
    "GIS":     GisAdapter,
    "Billing": BillingAdapter,
}

__all__ = ["ADAPTERS", "ScadaAdapter", "AmiAdapter", "GisAdapter", "BillingAdapter"]
