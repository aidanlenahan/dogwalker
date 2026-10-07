import pytest
from fastapi.testclient import TestClient
from pywebpush import WebPushException
from requests import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import push
from app.config import get_settings
from app.models import PushSubscription, User

from .conftest import make_user

APPLE = "https://web.push.apple.com/QGuQyavXutnMH"
SUB = {"endpoint": APPLE, "keys": {"p256dh": "BPk", "auth": "c2Vj"}}


@pytest.fixture
def vapid(monkeypatch: pytest.MonkeyPatch) -> list[tuple[str, str]]:
    """Configure fake VAPID keys and capture sends instead of hitting the network."""
    settings = get_settings()
    monkeypatch.setattr(settings, "vapid_public_key", "pub")
    monkeypatch.setattr(settings, "vapid_private_key", "priv")
    sent: list[tuple[str, str]] = []
    monkeypatch.setattr(
        push, "_send", lambda sub, data, _s, _ttl: sent.append((sub.endpoint, data))
    )
    return sent


def test_config_hides_key_when_not_configured(authed_client: TestClient) -> None:
    assert authed_client.get("/api/push/config").json() == {"public_key": None}


def test_config_returns_public_key(authed_client: TestClient, vapid: list) -> None:
    assert authed_client.get("/api/push/config").json() == {"public_key": "pub"}


def test_push_endpoints_require_login(client: TestClient) -> None:
    assert client.get("/api/push/config").status_code == 401
    assert client.put("/api/push/subscriptions", json=SUB).status_code == 401


def test_subscribe_is_idempotent(authed_client: TestClient, db: Session) -> None:
    assert authed_client.put("/api/push/subscriptions", json=SUB).status_code == 204
    assert authed_client.put("/api/push/subscriptions", json=SUB).status_code == 204
    assert len(db.scalars(select(PushSubscription)).all()) == 1


@pytest.mark.parametrize(
    "endpoint",
    ["http://web.push.apple.com/x", "https://evil.example.com/x", "https://apple.com.evil.io/x"],
)
def test_subscribe_rejects_non_push_endpoints(authed_client: TestClient, endpoint: str) -> None:
    r = authed_client.put("/api/push/subscriptions", json={**SUB, "endpoint": endpoint})
    assert r.status_code == 422


def test_allowed_endpoints() -> None:
    assert push.is_allowed_endpoint(APPLE)
    assert push.is_allowed_endpoint("https://fcm.googleapis.com/fcm/send/abc")
    assert push.is_allowed_endpoint("https://updates.push.services.mozilla.com/wpush/v2/x")


def test_unsubscribe_only_removes_own(authed_client: TestClient, db: Session) -> None:
    other = make_user(db, "other")
    db.add(PushSubscription(user_id=other.id, endpoint=APPLE, p256dh="k", auth="a"))
    db.commit()
    authed_client.post("/api/push/unsubscribe", json={"endpoint": APPLE})
    assert db.scalar(select(PushSubscription)) is not None


def test_test_push_503_without_keys(authed_client: TestClient) -> None:
    assert authed_client.post("/api/push/test").status_code == 503


def test_test_push_sends_to_each_device(authed_client: TestClient, vapid: list) -> None:
    authed_client.put("/api/push/subscriptions", json=SUB)
    authed_client.put(
        "/api/push/subscriptions",
        json={**SUB, "endpoint": "https://fcm.googleapis.com/fcm/send/abc"},
    )
    assert authed_client.post("/api/push/test").json() == {"sent": 2}
    assert len(vapid) == 2


def test_gone_subscriptions_are_deleted(
    db: Session, user: User, vapid: list, monkeypatch: pytest.MonkeyPatch
) -> None:
    db.add(PushSubscription(user_id=user.id, endpoint=APPLE, p256dh="k", auth="a"))
    db.commit()

    def gone(*_: object) -> None:
        r = Response()
        r.status_code = 410
        raise WebPushException("gone", response=r)

    monkeypatch.setattr(push, "_send", gone)
    assert push.send_to_user(db, user.id, {"title": "x"}, get_settings()) == 0
    assert db.scalar(select(PushSubscription)) is None
