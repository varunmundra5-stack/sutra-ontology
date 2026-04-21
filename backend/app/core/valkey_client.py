"""Valkey (Apache-2.0 Redis fork) client — consent + session cache.

We talk to Valkey over the standard Redis protocol, so the mature
`redis-py` client works unchanged. Valkey gives us:
  * O(1) consent lookups in the ingest hot-path
  * Short-lived JWT denylist (logout/rotate)
  * Rate-limit counters
"""
from __future__ import annotations

import logging
from typing import Optional

import redis

from ..config import settings

log = logging.getLogger("uvicorn.error")

_client: Optional[redis.Redis] = None


def get_client() -> redis.Redis:
    """Return a singleton Valkey client. Lazy-initialised so import-order
    issues at test time don't force a connection at module load."""
    global _client
    if _client is None:
        _client = redis.from_url(
            settings.valkey_url,
            decode_responses=True,
            socket_timeout=2.0,
            socket_connect_timeout=2.0,
        )
    return _client


def ping() -> bool:
    try:
        return bool(get_client().ping())
    except Exception as e:
        log.warning(f"Valkey ping failed: {e}")
        return False


# ---------- Consent cache ----------
CONSENT_PREFIX = "consent:"
CONSENT_TTL_S = 60 * 15  # 15 min


def cache_consent(subject_id: str, payload: dict) -> None:
    """Cache a consent decision keyed by subject (consumer / asset id)."""
    import json

    try:
        get_client().setex(
            f"{CONSENT_PREFIX}{subject_id}",
            CONSENT_TTL_S,
            json.dumps(payload),
        )
    except Exception as e:
        log.debug(f"cache_consent({subject_id}) failed: {e}")


def read_consent(subject_id: str) -> dict | None:
    import json

    try:
        raw = get_client().get(f"{CONSENT_PREFIX}{subject_id}")
        return json.loads(raw) if raw else None
    except Exception as e:
        log.debug(f"read_consent({subject_id}) failed: {e}")
        return None


def invalidate_consent(subject_id: str) -> None:
    try:
        get_client().delete(f"{CONSENT_PREFIX}{subject_id}")
    except Exception:
        pass


# ---------- JWT denylist ----------
DENYLIST_PREFIX = "jwt_deny:"


def deny_token(jti: str, ttl_s: int) -> None:
    try:
        get_client().setex(f"{DENYLIST_PREFIX}{jti}", ttl_s, "1")
    except Exception:
        pass


def is_token_denied(jti: str) -> bool:
    try:
        return get_client().exists(f"{DENYLIST_PREFIX}{jti}") == 1
    except Exception:
        return False
