"""AMI (smart-meter) → RDF mapper.

Expected raw payload:
    {
      "meter_uri":    "https://data.energystack.in/meter/M-123",
      "consumer_uri": "https://data.energystack.in/consumer/C-456",
      "feeder_uri":   "https://data.energystack.in/asset/feeder/FD-7",
      "readings": [ {"ts":"…", "kwh": 12.3} ]
    }

Consumer-linked → the ingest route MUST consult the consent policy before
calling this adapter.
"""
from __future__ import annotations

from datetime import datetime

from .base import Adapter, AdapterResult, TTL_PREFIX


class AmiAdapter(Adapter):
    source_type = "AMI"

    def transform(self, payload: dict) -> AdapterResult:
        meter = payload.get("meter_uri")
        consumer = payload.get("consumer_uri")
        feeder = payload.get("feeder_uri")
        readings = payload.get("readings", [])
        source_id = payload.get("source_id", "ami")

        ts_rows: list[dict] = []
        for r in readings:
            ts = datetime.fromisoformat(r["ts"].replace("Z", "+00:00"))
            kwh = float(r.get("kwh", 0.0))
            ts_rows.append(dict(
                ts=ts, asset_uri=meter, feeder_uri=feeder,
                reading_type="kwh", value=kwh,
                unit="kWh", source_id=source_id, quality=int(r.get("quality", 100)),
            ))

        ttl_parts = [TTL_PREFIX]
        if meter and consumer:
            ttl_parts.append(
                f"<{meter}> a es:SensorReading ;\n"
                f"    es:meteredFor <{consumer}> ;\n"
                f"    es:sourcedFrom <urn:ami:{source_id}> .\n"
                f"<urn:ami:{source_id}> a es:DataSource ;\n"
                f"    es:sourceType \"AMI\" ;\n"
                f"    es:entityId \"{source_id}\" .\n"
            )

        return AdapterResult(
            turtle="".join(ttl_parts),
            timeseries=ts_rows,
            source_type=self.source_type,
            source_id=source_id,
        )
