"""SCADA → RDF mapper.

Expected raw payload:
    {
      "station": "SS-12",
      "asset_uri": "https://data.energystack.in/asset/transformer/TR-101",
      "feeder_uri": "https://data.energystack.in/asset/feeder/FD-7",
      "readings": [
         {"ts": "2026-04-21T10:00:00Z", "kw": 412.3, "voltage": 11020.1}
      ]
    }

Behaviour:
  * High-frequency values (kw / voltage) → TimescaleDB hypertable (not the triple store).
  * We only write a small provenance Turtle snippet to Fuseki so the
    asset knows there is telemetry for it.
"""
from __future__ import annotations

from datetime import datetime

from .base import Adapter, AdapterResult, TTL_PREFIX, _now_iso


class ScadaAdapter(Adapter):
    source_type = "SCADA"

    def transform(self, payload: dict) -> AdapterResult:
        asset = payload.get("asset_uri")
        feeder = payload.get("feeder_uri")
        readings = payload.get("readings", [])
        source_id = payload.get("station", "scada")

        ts_rows: list[dict] = []
        for r in readings:
            ts = _parse_ts(r["ts"])
            if "kw" in r:
                ts_rows.append(dict(
                    ts=ts, asset_uri=asset, feeder_uri=feeder,
                    reading_type="kw", value=float(r["kw"]),
                    unit="kW", source_id=source_id, quality=int(r.get("quality", 100)),
                ))
            if "voltage" in r:
                ts_rows.append(dict(
                    ts=ts, asset_uri=asset, feeder_uri=feeder,
                    reading_type="voltage", value=float(r["voltage"]),
                    unit="V", source_id=source_id, quality=int(r.get("quality", 100)),
                ))

        # Tiny provenance triple — records that telemetry exists for this asset.
        ttl = TTL_PREFIX + (
            f"<{asset}> es:sourcedFrom <urn:scada:{source_id}> .\n"
            f"<urn:scada:{source_id}> a es:DataSource ;\n"
            f"    es:sourceType \"SCADA\" ;\n"
            f"    es:entityId \"{source_id}\" .\n"
        ) if asset else ""

        return AdapterResult(
            turtle=ttl,
            timeseries=ts_rows,
            source_type=self.source_type,
            source_id=source_id,
        )


def _parse_ts(s: str) -> datetime:
    # Accept both "…Z" and offset-aware strings.
    return datetime.fromisoformat(s.replace("Z", "+00:00"))
