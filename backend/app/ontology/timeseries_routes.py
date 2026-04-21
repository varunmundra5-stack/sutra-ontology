"""Time-series (TimescaleDB) read routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from ..auth.dependencies import get_current_user
from ..auth.models import User
from ..core import timescale

router = APIRouter(prefix="/timeseries", tags=["timeseries"])


@router.get("/asset")
def readings_for_asset(
    asset_uri: str = Query(..., description="Full asset URI"),
    limit: int = Query(100, ge=1, le=5000),
    _user: User = Depends(get_current_user),
):
    rows = timescale.latest_readings_for_asset(asset_uri, limit=limit)
    return {"asset_uri": asset_uri, "count": len(rows), "rows": rows}


@router.get("/feeder/load")
def feeder_load_ts(
    feeder_uri: str = Query(...),
    hours: int = Query(24, ge=1, le=720),
    _user: User = Depends(get_current_user),
):
    rows = timescale.feeder_load_timeseries(feeder_uri, hours=hours)
    return {"feeder_uri": feeder_uri, "hours": hours, "count": len(rows), "rows": rows}
