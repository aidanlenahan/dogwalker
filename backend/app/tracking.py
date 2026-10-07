"""Live GPS watchdog.

iOS suspends a Home Screen PWA (and its `watchPosition`) shortly after the screen
locks or the walker switches apps, so the phone can't warn about it itself. While
recording, the client sends a heartbeat every few seconds and a beacon when it is
hidden; when those stop, the server pushes a "GPS recording paused" notification.

State is in memory: the app runs as a single worker, and a restart only loses
sessions until their next heartbeat re-registers them.
"""

import asyncio
import logging
import threading
import time
from dataclasses import dataclass

from app.config import Settings
from app.db import get_sessionmaker
from app.push import is_configured, send_to_user

log = logging.getLogger(__name__)

CHECK_INTERVAL_SECONDS = 5
# Forget sessions that went quiet this long ago (walk abandoned without Stop).
FORGET_AFTER_SECONDS = 12 * 3600


@dataclass
class TrackedSession:
    user_id: int
    session_id: str
    resume_url: str
    last_seen: float
    hidden_at: float | None = None
    alerted: bool = False


class LiveTracker:
    def __init__(self) -> None:
        self._sessions: dict[tuple[int, str], TrackedSession] = {}
        self._lock = threading.Lock()

    def heartbeat(self, user_id: int, session_id: str, resume_url: str, now: float) -> None:
        with self._lock:
            key = (user_id, session_id)
            s = self._sessions.get(key)
            if s is None:
                self._sessions[key] = TrackedSession(user_id, session_id, resume_url, now)
                return
            # Still running (possibly hidden on Android, where JS keeps going), so
            # any earlier hidden beacon or alert no longer applies.
            s.last_seen = now
            s.resume_url = resume_url
            s.hidden_at = None
            s.alerted = False

    def hidden(self, user_id: int, session_id: str, now: float) -> None:
        with self._lock:
            s = self._sessions.get((user_id, session_id))
            if s is not None and s.hidden_at is None:
                s.hidden_at = now

    def stop(self, user_id: int, session_id: str) -> None:
        with self._lock:
            self._sessions.pop((user_id, session_id), None)

    def get(self, user_id: int, session_id: str) -> TrackedSession | None:
        return self._sessions.get((user_id, session_id))

    def due(self, now: float, hidden_grace: float, stale: float) -> list[TrackedSession]:
        """Sessions that just went quiet. Each lapse is reported once."""
        out: list[TrackedSession] = []
        with self._lock:
            for key, s in list(self._sessions.items()):
                if now - s.last_seen > FORGET_AFTER_SECONDS:
                    del self._sessions[key]
                    continue
                if s.alerted:
                    continue
                hidden_long = s.hidden_at is not None and now - s.hidden_at >= hidden_grace
                if hidden_long or now - s.last_seen >= stale:
                    s.alerted = True
                    out.append(s)
        return out


tracker = LiveTracker()


def paused_payload(s: TrackedSession) -> dict[str, str]:
    return {
        "title": "GPS recording paused",
        "body": "Your phone locked or Dogwalker was closed, so the route isn't being "
        "recorded. Open the app to resume.",
        "url": s.resume_url,
        # Replaces an earlier alert for the same recording instead of stacking.
        "tag": f"gps-paused:{s.session_id}",
    }


def check_once(settings: Settings, now: float | None = None) -> int:
    """Send alerts for sessions that went quiet. Returns how many sessions alerted."""
    due = tracker.due(
        time.time() if now is None else now,
        settings.tracking_hidden_grace_seconds,
        settings.tracking_stale_seconds,
    )
    if not due:
        return 0
    with get_sessionmaker()() as db:
        for s in due:
            # Short TTL: if the phone was offline, a late "paused" alert is just noise.
            sent = send_to_user(db, s.user_id, paused_payload(s), settings, ttl=120)
            log.info("GPS paused alert for user %s: %s device(s)", s.user_id, sent)
    return len(due)


async def watchdog(settings: Settings) -> None:
    if not is_configured(settings):
        log.warning("VAPID keys not set; live GPS pause alerts are disabled")
        return
    while True:
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)
        try:
            await asyncio.to_thread(check_once, settings)
        except Exception:
            log.exception("GPS watchdog check failed")
