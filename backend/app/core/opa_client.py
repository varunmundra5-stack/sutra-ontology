"""OPA (Open Policy Agent) client.

We call OPA's HTTP Data API:
    POST {OPA_URL}/v1/data/{package}/{rule}
    body: {"input": <dict>}

Policies live under /policies (bind-mounted into the OPA container)
and are reloaded automatically by OPA's file watcher.
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from ..config import settings

log = logging.getLogger("uvicorn.error")


class PolicyDenied(Exception):
    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


def _eval(path: str, inp: dict[str, Any]) -> dict[str, Any]:
    url = f"{settings.opa_url.rstrip('/')}/v1/data/{path}"
    try:
        r = httpx.post(url, json={"input": inp}, timeout=3.0)
        r.raise_for_status()
        return r.json().get("result", {}) or {}
    except httpx.HTTPError as e:
        # Fail-closed: on any OPA error we refuse to authorise.
        log.warning(f"OPA eval failed ({url}): {e}")
        return {}


def check_rbac(user: dict, action: str, resource: dict) -> tuple[bool, str]:
    """Return (allow, reason). Reason is only populated on deny."""
    out = _eval(
        "sutra/rbac",
        {"user": user, "action": action, "resource": resource},
    )
    allow = bool(out.get("allow", False))
    reason = "" if allow else str(out.get("deny_reason") or "policy denied")
    return allow, reason


def check_consent(subject: dict, source: dict, purpose: str, consent: dict, now_iso: str) -> tuple[bool, str]:
    out = _eval(
        "sutra/consent",
        {
            "subject": subject,
            "source": source,
            "purpose": purpose,
            "consent": consent,
            "now": now_iso,
        },
    )
    allow = bool(out.get("allow", False))
    reason = "" if allow else str(out.get("deny_reason") or "consent denied")
    return allow, reason


def enforce_rbac(user: dict, action: str, resource: dict) -> None:
    allow, reason = check_rbac(user, action, resource)
    if not allow:
        raise PolicyDenied(reason or "forbidden")


def health() -> bool:
    try:
        r = httpx.get(f"{settings.opa_url.rstrip('/')}/health", timeout=2.0)
        return r.status_code == 200
    except Exception:
        return False
