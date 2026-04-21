"""GIS → RDF mapper. Emits Location triples only (no time-series)."""
from __future__ import annotations

from .base import Adapter, AdapterResult, TTL_PREFIX


class GisAdapter(Adapter):
    source_type = "GIS"

    def transform(self, payload: dict) -> AdapterResult:
        # payload: {"asset_uri": "...", "lat": .., "lon": .., "admin_boundary": "IN-KA-BLR"}
        asset = payload.get("asset_uri")
        lat = payload.get("lat")
        lon = payload.get("lon")
        admin = payload.get("admin_boundary", "")
        if not asset:
            return AdapterResult(source_type=self.source_type)

        loc_uri = f"{asset}/location"
        ttl = TTL_PREFIX + (
            f"<{loc_uri}> a es:Location ;\n"
            f"    es:latitude  \"{lat}\"^^xsd:double ;\n"
            f"    es:longitude \"{lon}\"^^xsd:double ;\n"
            f"    es:adminBoundary \"{admin}\" .\n"
            f"<{asset}> es:hasLocation <{loc_uri}> .\n"
        )
        return AdapterResult(turtle=ttl, source_type=self.source_type, source_id="gis")
