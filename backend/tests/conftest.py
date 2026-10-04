import os
from collections.abc import Iterator

import pytest

from app.config import Settings

_test_url = Settings().test_database_url  # type: ignore[call-arg]
if not _test_url:
    raise RuntimeError("Set DOGWALKER_TEST_DATABASE_URL to a disposable database to run tests.")

# Must happen before the app builds its engine/settings.
os.environ["DOGWALKER_DATABASE_URL"] = _test_url
os.environ["DOGWALKER_COOKIE_SECURE"] = "false"  # TestClient talks plain http
os.environ["DOGWALKER_ENV"] = "test"

from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from alembic import command  # noqa: E402
from app.db import Base, get_engine, get_sessionmaker  # noqa: E402
from app.main import create_app  # noqa: E402
from app.models import User  # noqa: E402
from app.ratelimit import login_limiter  # noqa: E402
from app.security import hash_password  # noqa: E402

TEST_PASSWORD = "correct horse battery"


@pytest.fixture(scope="session", autouse=True)
def _migrated_db() -> Iterator[None]:
    """Run the real migrations down and up so tests exercise them too."""
    cfg = Config(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))
    cfg.attributes["database_url"] = _test_url
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")
    yield
    get_engine().dispose()


@pytest.fixture(autouse=True)
def _clean_tables() -> Iterator[None]:
    yield
    tables = ", ".join(t.name for t in Base.metadata.sorted_tables)
    with get_engine().begin() as conn:
        conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
    login_limiter.reset()


@pytest.fixture
def db() -> Iterator[Session]:
    with get_sessionmaker()() as session:
        yield session


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())


def make_user(db: Session, username: str = "walker", password: str = TEST_PASSWORD) -> User:
    user = User(
        username=username, display_name=username.title(), password_hash=hash_password(password)
    )
    db.add(user)
    db.commit()
    return user


@pytest.fixture
def user(db: Session) -> User:
    return make_user(db)


@pytest.fixture
def authed_client(client: TestClient, user: User) -> TestClient:
    r = client.post("/api/auth/login", json={"username": user.username, "password": TEST_PASSWORD})
    assert r.status_code == 200
    return client
