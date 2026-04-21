from typing import Any
from pydantic import BaseModel, Field


class SparqlRequest(BaseModel):
    query: str = Field(..., description="SPARQL SELECT/ASK/CONSTRUCT query")


class SparqlResponse(BaseModel):
    head: dict[str, Any] = {}
    results: dict[str, Any] = {}


class ClassInfo(BaseModel):
    uri: str
    label: str | None = None
    comment: str | None = None
    local_name: str


class PropertyInfo(BaseModel):
    uri: str
    local_name: str
    type: str  # "object" | "datatype"
    domain: str | None = None
    range: str | None = None
    label: str | None = None


class CountByClass(BaseModel):
    class_uri: str
    class_name: str
    n: int


class MintCreditRequest(BaseModel):
    asset_uri: str = Field(..., description="URI of the GridAsset")
    mrv_kwh: float = Field(..., gt=0)
    mrv_activity: str
    methodology: str = "CEA-grid-displacement"
    vintage: int = 2026
    baseline_ef: float = Field(0.82, gt=0)  # kgCO2e/kWh
    project_ef: float = Field(0.04, ge=0)


class MintCreditResponse(BaseModel):
    credit_uri: str
    mrv_uri: str
    credit_qty_tco2e: float
    status: str
