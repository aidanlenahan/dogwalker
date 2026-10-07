import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app import push, tracking
from app.config import get_settings
from app.models import PushSubscription, User
from app.tracking import LiveTracker, tracker

GRACE, STALE = 15, 45


def test_hidden_beacon_alerts_after_grace() -> None:
    t = LiveTracker()
    t.heartbeat(1, "s", "/dev/gps", now=0)
    t.hidden(1, "s", now=5)
    assert t.due(now=19, hidden_grace=GRACE, stale=STALE) == []
    assert [s.session_id for s in t.due(now=20, hidden_grace=GRACE, stale=STALE)] == ["s"]
    # Only once per lapse.
    assert t.due(now=30, hidden_grace=GRACE, stale=STALE) == []


def test_missing_heartbeats_alert_without_beacon() -> None:
    t = LiveTracker()
    t.heartbeat(1, "s", "/", now=0)
    assert t.due(now=44, hidden_grace=GRACE, stale=STALE) == []
    assert len(t.due(now=45, hidden_grace=GRACE, stale=STALE)) == 1


def test_heartbeat_after_hidden_means_still_running() -> None:
    # Android keeps JS running in the background: heartbeats continue, no alert.
    t = LiveTracker()
    t.heartbeat(1, "s", "/", now=0)
    t.hidden(1, "s", now=1)
    t.heartbeat(1, "s", "/", now=6)
    assert t.due(now=20, hidden_grace=GRACE, stale=STALE) == []


def test_resumed_session_can_alert_again() -> None:
    t = LiveTracker()
    t.heartbeat(1, "s", "/", now=0)
    assert len(t.due(now=50, hidden_grace=GRACE, stale=STALE)) == 1
    t.heartbeat(1, "s", "/", now=60)
    assert len(t.due(now=110, hidden_grace=GRACE, stale=STALE)) == 1


def test_stopped_and_unknown_sessions_never_alert() -> None:
    t = LiveTracker()
    t.hidden(1, "never-started", now=0)
    t.heartbeat(1, "s", "/", now=0)
    t.stop(1, "s")
    assert t.due(now=1000, hidden_grace=GRACE, stale=STALE) == []


def test_sessions_are_per_user() -> None:
    t = LiveTracker()
    t.heartbeat(1, "s", "/", now=0)
    t.hidden(2, "s", now=1)
    t.stop(2, "s")
    assert t.get(1, "s") is not None
    assert t.get(1, "s").hidden_at is None  # type: ignore[union-attr]


@pytest.fixture(autouse=True)
def _fresh_tracker() -> None:
    tracker._sessions.clear()


def test_endpoints_drive_the_shared_tracker(authed_client: TestClient, user: User) -> None:
    sid = "2026-10-07T12:00:00.000Z"
    r = authed_client.post(f"/api/tracking/{sid}/heartbeat", json={"resume_url": "/dev/gps"})
    assert r.status_code == 204
    assert authed_client.post(f"/api/tracking/{sid}/hidden").status_code == 204
    s = tracker.get(user.id, sid)
    assert s is not None and s.hidden_at is not None and s.resume_url == "/dev/gps"
    assert authed_client.delete(f"/api/tracking/{sid}").status_code == 204
    assert tracker.get(user.id, sid) is None


@pytest.mark.parametrize("url", ["//evil.com", "https://evil.com", "dashboard", "/a b"])
def test_resume_url_must_be_same_origin_path(authed_client: TestClient, url: str) -> None:
    r = authed_client.post("/api/tracking/s/heartbeat", json={"resume_url": url})
    assert r.status_code == 422


def test_tracking_requires_login(client: TestClient) -> None:
    assert client.post("/api/tracking/s/heartbeat", json={}).status_code == 401


def test_check_once_pushes_paused_alert(
    db: Session, user: User, monkeypatch: pytest.MonkeyPatch
) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "vapid_public_key", "pub")
    monkeypatch.setattr(settings, "vapid_private_key", "priv")
    sent: list[dict] = []
    monkeypatch.setattr(push, "_send", lambda _sub, data, _s, _ttl: sent.append(json.loads(data)))
    db.add(
        PushSubscription(
            user_id=user.id, endpoint="https://web.push.apple.com/x", p256dh="k", auth="a"
        )
    )
    db.commit()

    tracker.heartbeat(user.id, "walk-1", "/walk/1/live", now=0)
    tracker.hidden(user.id, "walk-1", now=1)
    assert tracking.check_once(settings, now=10) == 0
    assert tracking.check_once(settings, now=16) == 1
    assert sent[0]["title"] == "GPS recording paused"
    assert sent[0]["url"] == "/walk/1/live"
    assert sent[0]["tag"] == "gps-paused:walk-1"
