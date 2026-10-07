from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import current_user, get_owned
from app.models import Dog, User, Walk

router = APIRouter(prefix="/api/dogs", tags=["dogs"])


class DogIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    owner_name: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None, max_length=5000)


class DogPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    owner_name: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None, max_length=5000)


class DogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    owner_name: str | None
    notes: str | None
    created_at: datetime


def _clean(value: str | None) -> str | None:
    value = value.strip() if value else None
    return value or None


@router.get("", response_model=list[DogOut])
def list_dogs(user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[Dog]:
    return list(db.scalars(select(Dog).where(Dog.user_id == user.id).order_by(Dog.name)))


@router.post("", response_model=DogOut, status_code=status.HTTP_201_CREATED)
def create_dog(
    body: DogIn, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> Dog:
    name = body.name.strip()
    if not name:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Name is required")
    dog = Dog(
        user_id=user.id, name=name, owner_name=_clean(body.owner_name), notes=_clean(body.notes)
    )
    db.add(dog)
    db.commit()
    return dog


@router.get("/{dog_id}", response_model=DogOut)
def get_dog(dog_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)) -> Dog:
    return get_owned(db, Dog, dog_id, user)


@router.patch("/{dog_id}", response_model=DogOut)
def update_dog(
    dog_id: int, body: DogPatch, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> Dog:
    dog = get_owned(db, Dog, dog_id, user)
    fields = body.model_dump(exclude_unset=True)
    if "name" in fields:
        name = (fields["name"] or "").strip()
        if not name:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Name is required")
        dog.name = name
    if "owner_name" in fields:
        dog.owner_name = _clean(fields["owner_name"])
    if "notes" in fields:
        dog.notes = _clean(fields["notes"])
    db.commit()
    return dog


@router.delete("/{dog_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dog(
    dog_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> None:
    dog = get_owned(db, Dog, dog_id, user)
    if db.scalar(select(exists().where(Walk.dog_id == dog.id))):
        raise HTTPException(status.HTTP_409_CONFLICT, "This dog has walks, so it can't be deleted")
    db.delete(dog)
    db.commit()
