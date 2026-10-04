import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import cli
from app.models import User
from app.security import verify_password


def test_create_user_hashes_password(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(cli.getpass, "getpass", lambda _prompt: "a-long-password")
    assert cli.main(["create-user", "Aidan", "--display-name", "Aidan"]) == 0

    user = db.scalar(select(User).where(User.username == "aidan"))
    assert user is not None
    assert user.password_hash.startswith("$argon2id$")
    assert verify_password(user.password_hash, "a-long-password")


def test_create_user_rejects_bad_username(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(cli.getpass, "getpass", lambda _prompt: "a-long-password")
    assert cli.main(["create-user", "no spaces", "--display-name", "X"]) == 1
