import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.deps import get_owned
from app.models import Dog

from .conftest import make_user


def test_get_owned_returns_own_rows_and_hides_others(db: Session) -> None:
    alice = make_user(db, "alice")
    bob = make_user(db, "bob")
    dog = Dog(user_id=alice.id, name="Bailey")
    db.add(dog)
    db.commit()

    assert get_owned(db, Dog, dog.id, alice) is dog
    with pytest.raises(HTTPException) as exc:
        get_owned(db, Dog, dog.id, bob)
    assert exc.value.status_code == 404
    with pytest.raises(HTTPException):
        get_owned(db, Dog, 999_999, alice)
