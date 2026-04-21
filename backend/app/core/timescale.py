"""TimescaleDB helpers — high-frequency telemetry lands in a Postgres
hypertable, not in the Fuseki triple store. The triple store keeps
aggregates + references; raw readings stream through Timescale.

This keeps the semantic layer small and fast while preserving every
raw datapoint in a columnar, time-optimised table.
"""
from __future__ import annotations

import logging
from contextlib import contextmanager
from datetime import datetime
from typing import Iterable

from sqlalchemy import text

from ..database import engine

log = logging.getLogger("uvicorn.error")


HYPERTABLE_DDL = """
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS sensor_reading (
    ts             TIMESTAMPTZ       NOT NULL,
    asset_uri      TEXT              NOT NULL,
    feeder_uri     TEXT,
    reading_type   TEXT              NOT NULL,   -- kwh | kw | voltage | current | temperature
    value          DOUBLE PRECISION  NOT NULL,
    unit           TEXT,
    source_id      TEXT,
    quality        SMALLINT          DEFAULT 100
);

SELECT create_hypertable(
    'sensor_reading', 'ts',
    if_not_exists => TRUE,
    migrate_data  => TRUE
);

CREATE INDEX IF NOT EXISTS idx_sensor_reading_asset_ts
    ON sensor_reading (asset_uri, ts DESC);

CREATE INDEX IF NOT EXISTS idx_sensor_reading_feeder_ts
    ON sensor_reading (feeder_uri, ts DESC)
    WHERE feeder_uri IS NOT NULL;
"""


def ensure_hypertable() -> None:
    """Idempotent: creates the hypertable on first boot, no-op thereafter."""
    try:
        with engine.begin() as conn:
            for stmt in _split_sql(HYPERTABLE_DDL):
                conn.execute(text(stmt))
        log.info("TimescaleDB hypertable 'sensor_reading' ready.")
    except Exception as e:
        # If the timescaledb extension isn't installed we fall back to a
        # plain table — the API keeps working, just without Timescale's
        # chunking / compression benefits.
        log.warning(f"Could not enable TimescaleDB hypertable ({e}); falling back to plain table.")
        try:
            with engine.begin() as conn:
                conn.execute(text(
                    """
                    CREATE TABLE IF NOT EXISTS sensor_reading (
                        ts             TIMESTAMPTZ       NOT NULL,
                        asset_uri      TEXT              NOT NULL,
                        feeder_uri     TEXT,
                        reading_type   TEXT              NOT NULL,
                        value          DOUBLE PRECISION  NOT NULL,
                        unit           TEXT,
                        source_id      TEXT,
                        quality        SMALLINT          DEFAULT 100
                    )
                    """
                ))
                conn.execute(text(
                    "CREATE INDEX IF NOT EXISTS idx_sensor_reading_asset_ts "
                    "ON sensor_reading (asset_uri, ts DESC)"
                ))
        except Exception as e2:
            log.error(f"Plain-table fallback also failed: {e2}")


def _split_sql(blob: str) -> Iterable[str]:
    for stmt in blob.split(";"):
        s = stmt.strip()
        if s:
            yield s


# ---------- Ingest ----------

def insert_reading(
    ts: datetime,
    asset_uri: str,
    reading_type: str,
    value: float,
    feeder_uri: str | None = None,
    unit: str | None = None,
    source_id: str | None = None,
    quality: int = 100,
) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO sensor_reading (ts, asset_uri, feeder_uri, reading_type, value, unit, source_id, quality)
                VALUES (:ts, :asset, :feeder, :rtype, :value, :unit, :src, :q)
                """
            ),
            {
                "ts": ts, "asset": asset_uri, "feeder": feeder_uri,
                "rtype": reading_type, "value": value, "unit": unit,
                "src": source_id, "q": quality,
            },
        )


def insert_readings_bulk(rows: list[dict]) -> int:
    if not rows:
        return 0
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO sensor_reading (ts, asset_uri, feeder_uri, reading_type, value, unit, source_id, quality)
                VALUES (:ts, :asset_uri, :feeder_uri, :reading_type, :value, :unit, :source_id, :quality)
                """
            ),
            rows,
        )
    return len(rows)


# ---------- Query ----------

def latest_readings_for_asset(asset_uri: str, limit: int = 100) -> list[dict]:
    with engine.begin() as conn:
        rs = conn.execute(
            text(
                """
                SELECT ts, reading_type, value, unit
                  FROM sensor_reading
                 WHERE asset_uri = :a
              ORDER BY ts DESC
                 LIMIT :lim
                """
            ),
            {"a": asset_uri, "lim": limit},
        )
        return [dict(r._mapping) for r in rs]


def feeder_load_timeseries(feeder_uri: str, hours: int = 24) -> list[dict]:
    with engine.begin() as conn:
        rs = conn.execute(
            text(
                """
                SELECT date_trunc('hour', ts) AS bucket,
                       SUM(value)             AS total_kwh
                  FROM sensor_reading
                 WHERE feeder_uri = :f
                   AND reading_type = 'kwh'
                   AND ts >= NOW() - (:h || ' hours')::interval
              GROUP BY bucket
              ORDER BY bucket ASC
                """
            ),
            {"f": feeder_uri, "h": hours},
        )
        return [dict(r._mapping) for r in rs]
