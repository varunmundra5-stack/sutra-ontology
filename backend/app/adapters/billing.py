"""Billing → RDF mapper. Emits BillingEvent + an amount-due time-series row."""
from __future__ import annotations

from datetime import datetime

from .base import Adapter, AdapterResult, TTL_PREFIX


class BillingAdapter(Adapter):
    source_type = "Billing"

    def transform(self, payload: dict) -> AdapterResult:
        # payload: {"consumer_uri": ..., "period_end":"2026-03-31", "amount_inr": 1234.5, "billed_kwh": 120}
        consumer = payload.get("consumer_uri")
        period_end = payload.get("period_end")
        amount = float(payload.get("amount_inr", 0.0))
        billed_kwh = float(payload.get("billed_kwh", 0.0))
        source_id = payload.get("source_id", "billing")
        if not consumer or not period_end:
            return AdapterResult(source_type=self.source_type)

        evt_uri = f"{consumer}/billing/{period_end}"
        ttl = TTL_PREFIX + (
            f"<{evt_uri}> a es:BillingEvent ;\n"
            f"    es:billedTo <{consumer}> ;\n"
            f"    es:amountInr \"{amount}\"^^xsd:double ;\n"
            f"    es:billedKwh \"{billed_kwh}\"^^xsd:double ;\n"
            f"    es:periodEnd \"{period_end}T00:00:00Z\"^^xsd:dateTime ;\n"
            f"    es:sourcedFrom <urn:billing:{source_id}> .\n"
            f"<urn:billing:{source_id}> a es:DataSource ;\n"
            f"    es:sourceType \"Billing\" ;\n"
            f"    es:entityId \"{source_id}\" .\n"
        )

        # We also drop billed_kwh into the time-series table so it can be
        # reconciled against metered consumption (AMI).
        ts_rows = [dict(
            ts=datetime.fromisoformat(f"{period_end}T00:00:00+00:00"),
            asset_uri=consumer, feeder_uri=None,
            reading_type="billed_kwh", value=billed_kwh,
            unit="kWh", source_id=source_id, quality=100,
        )]

        return AdapterResult(
            turtle=ttl,
            timeseries=ts_rows,
            source_type=self.source_type,
            source_id=source_id,
        )
