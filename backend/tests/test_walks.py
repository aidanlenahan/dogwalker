import uuid
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Dog, Walk

from .conftest import TEST_PASSWORD, make_user

T0 = datetime(2026, 10, 1, 12, 0, tzinfo=UTC)


def iso(dt: datetime) -> str:
    return dt.isoformat()


@pytest.fixture
def dog_id(authed_client: TestClient) -> int:
    return authed_client.post("/api/dogs", json={"name": "Bailey"}).json()["id"]


def new_walk(client: TestClient, dog_id: int, **extra: object) -> dict:
    r = client.post("/api/walks", json={"id": str(uuid.uuid4()), "dog_id": dog_id, **extra})
    assert r.status_code == 201, r.text
    return r.json()


def test_walk_lifecycle_with_events(authed_client: TestClient, dog_id: int) -> None:
    walk = new_walk(authed_client, dog_id, gps_mode="upload", pre_walk_notes=" Hot day ")
    assert walk["status"] == "created"
    assert walk["gps_mode"] == "upload"
    assert walk["pre_walk_notes"] == "Hot day"
    assert walk["dog"] == {"id": dog_id, "name": "Bailey"}
    wid = walk["id"]

    r = authed_client.post(f"/api/walks/{wid}/start", json={"started_at": iso(T0)})
    assert r.json()["status"] == "active"

    for minutes, kind in ((3, "pee"), (1, "water")):
        r = authed_client.post(
            f"/api/walks/{wid}/events",
            json={
                "id": str(uuid.uuid4()),
                "type": kind,
                "timestamp": iso(T0 + timedelta(minutes=minutes)),
            },
        )
        assert r.status_code == 201

    r = authed_client.post(
        f"/api/walks/{wid}/finish", json={"ended_at": iso(T0 + timedelta(minutes=30))}
    )
    done = r.json()
    assert done["status"] == "completed"
    assert done["ended_at"].startswith("2026-10-01T12:30")
    # Events come back in time order.
    assert [e["type"] for e in done["events"]] == ["water", "pee"]


def test_gps_mode_defaults_and_clears(authed_client: TestClient, dog_id: int) -> None:
    assert new_walk(authed_client, dog_id)["gps_mode"] == "live"
    assert new_walk(authed_client, dog_id, track_gps=False, gps_mode="live")["gps_mode"] is None


def test_retried_writes_are_idempotent(authed_client: TestClient, dog_id: int) -> None:
    body = {"id": str(uuid.uuid4()), "dog_id": dog_id}
    assert authed_client.post("/api/walks", json=body).status_code == 201
    assert authed_client.post("/api/walks", json=body).status_code == 200
    wid = body["id"]

    start = {"started_at": iso(T0)}
    authed_client.post(f"/api/walks/{wid}/start", json=start)
    later = {"started_at": iso(T0 + timedelta(minutes=5))}
    r = authed_client.post(f"/api/walks/{wid}/start", json=later)
    assert r.json()["started_at"].startswith("2026-10-01T12:00")  # first start wins

    event = {"id": str(uuid.uuid4()), "type": "poop", "timestamp": iso(T0)}
    assert authed_client.post(f"/api/walks/{wid}/events", json=event).status_code == 201
    assert authed_client.post(f"/api/walks/{wid}/events", json=event).status_code == 200

    end = {"ended_at": iso(T0 + timedelta(minutes=20))}
    authed_client.post(f"/api/walks/{wid}/finish", json=end)
    r = authed_client.post(f"/api/walks/{wid}/finish", json=end)
    assert r.status_code == 200
    assert len(r.json()["events"]) == 1

    eid = event["id"]
    assert authed_client.delete(f"/api/walks/{wid}/events/{eid}").status_code == 204
    assert authed_client.delete(f"/api/walks/{wid}/events/{eid}").status_code == 204


def test_finish_rules(authed_client: TestClient, dog_id: int) -> None:
    wid = new_walk(authed_client, dog_id)["id"]
    r = authed_client.post(f"/api/walks/{wid}/finish", json={"ended_at": iso(T0)})
    assert r.status_code == 409  # not started
    authed_client.post(f"/api/walks/{wid}/start", json={"started_at": iso(T0)})
    r = authed_client.post(
        f"/api/walks/{wid}/finish", json={"ended_at": iso(T0 - timedelta(minutes=1))}
    )
    assert r.status_code == 422


def test_rejects_future_and_naive_times(authed_client: TestClient, dog_id: int) -> None:
    wid = new_walk(authed_client, dog_id)["id"]
    future = datetime.now(UTC) + timedelta(hours=1)
    assert (
        authed_client.post(f"/api/walks/{wid}/start", json={"started_at": iso(future)}).status_code
        == 422
    )
    r = authed_client.post(f"/api/walks/{wid}/start", json={"started_at": "2026-10-01T12:00:00"})
    assert r.status_code == 422


def test_edit_and_delete_events(authed_client: TestClient, dog_id: int) -> None:
    wid = new_walk(authed_client, dog_id)["id"]
    eid = str(uuid.uuid4())
    authed_client.post(
        f"/api/walks/{wid}/events", json={"id": eid, "type": "note", "timestamp": iso(T0)}
    )
    r = authed_client.patch(f"/api/walks/{wid}/events/{eid}", json={"notes": " Met a cat "})
    assert r.json()["notes"] == "Met a cat"
    r = authed_client.patch(f"/api/walks/{wid}/events/{eid}", json={"type": "other"})
    assert r.json()["type"] == "other"
    authed_client.delete(f"/api/walks/{wid}/events/{eid}")
    assert authed_client.get(f"/api/walks/{wid}").json()["events"] == []


def test_invalid_event_type(authed_client: TestClient, dog_id: int) -> None:
    wid = new_walk(authed_client, dog_id)["id"]
    r = authed_client.post(
        f"/api/walks/{wid}/events",
        json={"id": str(uuid.uuid4()), "type": "zoomies", "timestamp": iso(T0)},
    )
    assert r.status_code == 422


def test_published_walks_are_locked(authed_client: TestClient, dog_id: int, db: Session) -> None:
    wid = new_walk(authed_client, dog_id)["id"]
    walk = db.get(Walk, uuid.UUID(wid))
    assert walk is not None
    walk.status = "published"
    db.commit()
    event = {"id": str(uuid.uuid4()), "type": "pee", "timestamp": iso(T0)}
    assert authed_client.post(f"/api/walks/{wid}/events", json=event).status_code == 409
    assert authed_client.patch(f"/api/walks/{wid}", json={"notes": "x"}).status_code == 409
    assert authed_client.delete(f"/api/walks/{wid}").status_code == 409


def test_list_walks(authed_client: TestClient, dog_id: int) -> None:
    older = new_walk(authed_client, dog_id)["id"]
    authed_client.post(f"/api/walks/{older}/start", json={"started_at": iso(T0)})
    authed_client.post(
        f"/api/walks/{older}/events",
        json={"id": str(uuid.uuid4()), "type": "pee", "timestamp": iso(T0)},
    )
    authed_client.post(f"/api/walks/{older}/finish", json={"ended_at": iso(T0)})
    newer = new_walk(authed_client, dog_id)["id"]
    authed_client.post(
        f"/api/walks/{newer}/start", json={"started_at": iso(T0 + timedelta(days=1))}
    )

    walks = authed_client.get("/api/walks").json()
    assert [w["id"] for w in walks] == [newer, older]
    assert walks[1]["event_count"] == 1

    active = authed_client.get("/api/walks", params={"status": "active"}).json()
    assert [w["id"] for w in active] == [newer]


def test_other_users_walks_are_hidden(client: TestClient, db: Session) -> None:
    other = make_user(db, "other")
    rex = Dog(user_id=other.id, name="Rex")
    db.add(rex)
    db.commit()
    theirs = Walk(user_id=other.id, dog_id=rex.id)
    db.add(theirs)
    db.commit()

    make_user(db, "walker")
    client.post("/api/auth/login", json={"username": "walker", "password": TEST_PASSWORD})
    assert client.get("/api/walks").json() == []
    assert client.get(f"/api/walks/{theirs.id}").status_code == 404
    assert (
        client.post(f"/api/walks/{theirs.id}/start", json={"started_at": iso(T0)}).status_code
        == 404
    )
    event = {"id": str(uuid.uuid4()), "type": "pee", "timestamp": iso(T0)}
    assert client.post(f"/api/walks/{theirs.id}/events", json=event).status_code == 404
    # Can't start a walk for their dog, or reuse their walk ID.
    assert (
        client.post("/api/walks", json={"id": str(uuid.uuid4()), "dog_id": rex.id}).status_code
        == 404
    )
    assert (
        client.post("/api/walks", json={"id": str(theirs.id), "dog_id": rex.id}).status_code == 409
    )
