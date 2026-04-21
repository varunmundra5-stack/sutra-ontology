"""
AI Model Plugin Framework for Sutra OS.

Supports plugging in any sklearn-compatible model (EBM, XGBoost, RandomForest, etc.)
for energy prediction tasks. Models are registered by name and can be invoked via REST.

EBM = Explainable Boosting Machine (Microsoft InterpretML) — preferred for energy
forecasting because it gives per-feature explanations alongside predictions.
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ..auth.dependencies import get_current_user
from ..auth.models import User

log = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/ai", tags=["ai"])

# ---------------------------------------------------------------------------
# In-memory model registry — in production, swap for MLflow / model store
# ---------------------------------------------------------------------------
_MODEL_REGISTRY: dict[str, dict[str, Any]] = {}


def register_model(name: str, model: Any, metadata: dict | None = None) -> None:
    """Register a fitted sklearn-compatible model by name."""
    _MODEL_REGISTRY[name] = {
        "model": model,
        "metadata": metadata or {},
        "type": type(model).__name__,
    }
    log.info(f"AI model registered: {name} ({type(model).__name__})")


def _seed_demo_models() -> None:
    """Seed a demo AT&C loss prediction model. Uses EBM if available, Ridge otherwise."""
    try:
        from interpret.glassbox import ExplainableBoostingRegressor  # type: ignore
        import numpy as np
        rng = np.random.default_rng(42)
        n = 300
        X = rng.uniform(0, 1, size=(n, 4))
        y = 5 + 15 * X[:, 0] + 8 * X[:, 2] + 3 * X[:, 3] + rng.normal(0, 1, n)
        ebm = ExplainableBoostingRegressor(random_state=42, max_bins=64)
        ebm.fit(X, y)
        register_model("atc_loss_ebm", ebm, {
            "description": "EBM — predicts AT&C loss % for a distribution feeder",
            "features": ["load_mw_norm", "power_factor_norm", "line_length_km_norm", "asset_age_norm"],
            "target": "atc_loss_pct",
            "framework": "InterpretML EBM",
        })
        log.info("EBM demo model seeded (InterpretML).")
    except ImportError:
        try:
            from sklearn.linear_model import Ridge  # type: ignore
            import numpy as np
            rng = np.random.default_rng(42)
            n = 300
            X = rng.uniform(0, 1, size=(n, 4))
            y = 5 + 15 * X[:, 0] + 8 * X[:, 2] + 3 * X[:, 3] + rng.normal(0, 1, n)
            m = Ridge().fit(X, y)
            register_model("atc_loss_ebm", m, {
                "description": "Ridge regression — AT&C loss predictor (install interpret for EBM)",
                "features": ["load_mw_norm", "power_factor_norm", "line_length_km_norm", "asset_age_norm"],
                "target": "atc_loss_pct",
                "framework": "sklearn Ridge (EBM fallback)",
            })
            log.info("Ridge demo model seeded (sklearn fallback).")
        except ImportError:
            log.warning("Neither interpret nor sklearn found — AI demo model skipped.")


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class PredictRequest(BaseModel):
    model_name: str
    features: dict[str, float]


class PredictResponse(BaseModel):
    model_name: str
    model_type: str
    prediction: float
    explanation: dict[str, Any] | None = None
    metadata: dict[str, Any]


class ModelInfo(BaseModel):
    name: str
    model_type: str
    metadata: dict[str, Any]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.get("/models", response_model=list[ModelInfo])
def list_models(_: User = Depends(get_current_user)):
    """List all registered AI models."""
    return [
        ModelInfo(name=k, model_type=v["type"], metadata=v["metadata"])
        for k, v in _MODEL_REGISTRY.items()
    ]


@router.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest, _: User = Depends(get_current_user)):
    """Run inference. EBM models also return per-feature explanations."""
    if req.model_name not in _MODEL_REGISTRY:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Model '{req.model_name}' not registered")
    entry = _MODEL_REGISTRY[req.model_name]
    model = entry["model"]
    meta = entry["metadata"]
    expected_features: list[str] = meta.get("features", list(req.features.keys()))
    try:
        import numpy as np
        X = np.array([[req.features.get(f, 0.0) for f in expected_features]])
        pred = float(model.predict(X)[0])
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Prediction failed: {e}")
    explanation: dict[str, Any] | None = None
    try:
        expl = model.explain_local(X)
        scores = expl.data(0)
        explanation = {
            "intercept": float(scores.get("intercept", 0)),
            "feature_contributions": {
                name: float(score)
                for name, score in zip(scores["names"], scores["scores"])
            },
        }
    except Exception:
        pass
    return PredictResponse(
        model_name=req.model_name,
        model_type=entry["type"],
        prediction=pred,
        explanation=explanation,
        metadata=meta,
    )


@router.get("/models/{model_name}", response_model=ModelInfo)
def get_model(model_name: str, _: User = Depends(get_current_user)):
    """Get info about a specific registered model."""
    if model_name not in _MODEL_REGISTRY:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Model '{model_name}' not found")
    entry = _MODEL_REGISTRY[model_name]
    return ModelInfo(name=model_name, model_type=entry["type"], metadata=entry["metadata"])
