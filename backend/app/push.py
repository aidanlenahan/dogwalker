"""Web Push delivery (VAPID). Used for the live-GPS "recording paused" alert.

iOS delivers web push only to Home Screen PWAs (16.4+), and only after the user
grants permission from a tap inside the app.
"""

import json
import logging
from typing import Any
from urllib.parse import urlsplit

from py_vapid import Vapid
from pywebpush import WebPushException, webpush
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import Settings
from app.models import PushSubscription

log = logging.getLogger(__name__)

# The server POSTs to whatever endpoint a browser hands us, so only accept the
# real push services (Apple, Google/Chrome, Mozilla, Microsoft) to rule out SSRF.
PUSH_HOST_SUFFIXES = (
    ".push.apple.com",
    "fcm.googleapis.com",
    ".push.services.mozilla.com",
    ".notify.windows.com",
)


def is_allowed_endpoint(endpoint: str) -> bool:
    parts = urlsplit(endpoint)
    host = parts.hostname or ""
    return parts.scheme == "https" and any(
        host == s.lstrip(".") or host.endswith(s) for s in PUSH_HOST_SUFFIXES
    )


def is_configured(settings: Settings) -> bool:
    return bool(settings.vapid_public_key and settings.vapid_private_key)


def _send(sub: PushSubscription, data: str, settings: Settings, ttl: int) -> None:
    """One delivery. Separate so tests can replace it."""
    webpush(
        subscription_info={
            "endpoint": sub.endpoint,
            "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
        },
        data=data,
        vapid_private_key=Vapid.from_string(settings.vapid_private_key or ""),
        # Fresh dict each call: pywebpush writes aud/exp into it.
        vapid_claims={"sub": settings.vapid_subject},
        ttl=ttl,
        timeout=10,
        headers={"Urgency": "high"},
    )


def send_to_user(
    db: Session, user_id: int, payload: dict[str, Any], settings: Settings, ttl: int = 600
) -> int:
    """Push `payload` to every device the user subscribed. Returns how many accepted it.

    `ttl`: seconds the push service holds it for an offline device before dropping it.

    Subscriptions the push service reports as gone (404/410) are deleted.
    """
    if not is_configured(settings):
        return 0
    data = json.dumps(payload)
    subs = db.scalars(select(PushSubscription).where(PushSubscription.user_id == user_id)).all()
    sent = 0
    gone: list[int] = []
    for sub in subs:
        try:
            _send(sub, data, settings, ttl)
            sent += 1
        except WebPushException as e:
            status = e.response.status_code if e.response is not None else None
            if status in (404, 410):
                gone.append(sub.id)
            else:
                log.warning("Push to subscription %s failed: %s", sub.id, e)
        except Exception:
            log.exception("Push to subscription %s failed", sub.id)
    if gone:
        db.execute(delete(PushSubscription).where(PushSubscription.id.in_(gone)))
        db.commit()
    return sent
