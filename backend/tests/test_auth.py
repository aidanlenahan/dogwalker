from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import AuthSession, User

from .conftest import TEST_PASSWORD


def login(client: TestClient, username: str = "walker", password: str = TEST_PASSWORD):
    return client.post("/api/auth/login", json={"username": username, "password": password})


def test_me_requires_login(client: TestClient) -> None:
    assert client.get("/api/auth/me").status_code == 401


def test_login_sets_httponly_session_cookie(client: TestClient, user: User) -> None:
    r = login(client)
    assert r.status_code == 200
    assert r.json() == {"id": user.id, "username": "walker", "display_name": "Walker"}
    cookie = r.headers["set-cookie"].lower()
    assert "httponly" in cookie
    assert "samesite=lax" in cookie
    assert client.get("/api/auth/me").json()["username"] == "walker"


def test_login_is_case_insensitive_on_username(client: TestClient, user: User) -> None:
    assert login(client, username="  Walker ").status_code == 200


def test_session_token_is_stored_hashed(client: TestClient, user: User, db: Session) -> None:
    login(client)
    token = client.cookies[get_settings().session_cookie_name]
    stored = db.scalars(select(AuthSession.token_hash)).all()
    assert len(stored) == 1
    assert token not in stored[0]


def test_wrong_password_and_unknown_user_look_the_same(client: TestClient, user: User) -> None:
    a = login(client, password="nope")
    b = login(client, username="nobody")
    assert a.status_code == b.status_code == 401
    assert a.json() == b.json()


def test_logout_revokes_session(client: TestClient, user: User, db: Session) -> None:
    login(client)
    token = client.cookies[get_settings().session_cookie_name]
    assert client.post("/api/auth/logout").status_code == 204
    assert db.scalar(select(func.count()).select_from(AuthSession)) == 0
    # Replaying the old cookie must not work.
    client.cookies.set(get_settings().session_cookie_name, token)
    assert client.get("/api/auth/me").status_code == 401


def test_expired_session_is_rejected(client: TestClient, user: User, db: Session) -> None:
    login(client)
    session = db.scalar(select(AuthSession))
    session.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    db.commit()
    assert client.get("/api/auth/me").status_code == 401


def test_session_is_renewed_after_half_its_ttl(client: TestClient, user: User, db: Session) -> None:
    login(client)
    session = db.scalar(select(AuthSession))
    session.expires_at = datetime.now(UTC) + timedelta(days=1)
    db.commit()
    r = client.get("/api/auth/me")
    assert r.status_code == 200
    assert "set-cookie" in r.headers
    db.refresh(session)
    assert session.expires_at > datetime.now(UTC) + timedelta(days=30)


def test_inactive_user_cannot_use_session(client: TestClient, user: User, db: Session) -> None:
    login(client)
    user.is_active = False
    db.commit()
    assert client.get("/api/auth/me").status_code == 401


def test_repeated_failures_are_throttled(client: TestClient, user: User) -> None:
    for _ in range(get_settings().login_max_failures):
        assert login(client, password="wrong").status_code == 401
    # Even the right password is refused while throttled.
    assert login(client).status_code == 429


def test_cross_origin_post_is_blocked(client: TestClient, user: User) -> None:
    r = client.post(
        "/api/auth/login",
        json={"username": "walker", "password": TEST_PASSWORD},
        headers={"origin": "https://evil.example"},
    )
    assert r.status_code == 403


def test_same_origin_post_is_allowed(client: TestClient, user: User) -> None:
    r = client.post(
        "/api/auth/login",
        json={"username": "walker", "password": TEST_PASSWORD},
        headers={"origin": "http://testserver"},
    )
    assert r.status_code == 200
