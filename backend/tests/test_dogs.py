import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Dog

from .conftest import TEST_PASSWORD, make_user


def test_dog_crud(authed_client: TestClient) -> None:
    r = authed_client.post(
        "/api/dogs", json={"name": "  Bailey ", "owner_name": "Sam", "notes": ""}
    )
    assert r.status_code == 201
    dog = r.json()
    assert (dog["name"], dog["owner_name"], dog["notes"]) == ("Bailey", "Sam", None)

    authed_client.post("/api/dogs", json={"name": "Archie"})
    assert [d["name"] for d in authed_client.get("/api/dogs").json()] == ["Archie", "Bailey"]

    r = authed_client.patch(f"/api/dogs/{dog['id']}", json={"notes": "Pulls near traffic"})
    assert r.json()["notes"] == "Pulls near traffic"
    assert r.json()["owner_name"] == "Sam"

    assert authed_client.delete(f"/api/dogs/{dog['id']}").status_code == 204
    assert authed_client.get(f"/api/dogs/{dog['id']}").status_code == 404


def test_blank_name_rejected(authed_client: TestClient) -> None:
    assert authed_client.post("/api/dogs", json={"name": "   "}).status_code == 422
    dog = authed_client.post("/api/dogs", json={"name": "Bailey"}).json()
    assert authed_client.patch(f"/api/dogs/{dog['id']}", json={"name": " "}).status_code == 422


def test_dog_with_walks_cannot_be_deleted(authed_client: TestClient) -> None:
    dog = authed_client.post("/api/dogs", json={"name": "Bailey"}).json()
    authed_client.post("/api/walks", json={"id": str(uuid.uuid4()), "dog_id": dog["id"]})
    assert authed_client.delete(f"/api/dogs/{dog['id']}").status_code == 409


def test_other_users_dogs_are_hidden(client: TestClient, db: Session) -> None:
    other = make_user(db, "other")
    db.add(Dog(user_id=other.id, name="Rex"))
    db.commit()
    make_user(db, "walker")
    client.post("/api/auth/login", json={"username": "walker", "password": TEST_PASSWORD})
    assert client.get("/api/dogs").json() == []
    rex = db.query(Dog).one()
    assert client.get(f"/api/dogs/{rex.id}").status_code == 404
    assert client.patch(f"/api/dogs/{rex.id}", json={"name": "Mine"}).status_code == 404
    assert client.delete(f"/api/dogs/{rex.id}").status_code == 404
