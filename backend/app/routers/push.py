from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import get_db
from app.deps import current_user
from app.models import PushSubscription, User
from app.push import is_allowed_endpoint, is_configured, send_to_user

router = APIRouter(prefix="/api/push", tags=["push"])


class PushConfigOut(BaseModel):
    # Null when the server has no VAPID keys; the client then hides push UI.
    public_key: str | None


class SubscriptionKeys(BaseModel):
    p256dh: str = Field(min_length=1, max_length=255)
    auth: str = Field(min_length=1, max_length=255)


class SubscriptionIn(BaseModel):
    endpoint: str = Field(min_length=1, max_length=2048)
    keys: SubscriptionKeys


class EndpointIn(BaseModel):
    endpoint: str = Field(min_length=1, max_length=2048)


class TestOut(BaseModel):
    sent: int


@router.get("/config", response_model=PushConfigOut)
def config(
    _: User = Depends(current_user), settings: Settings = Depends(get_settings)
) -> PushConfigOut:
    return PushConfigOut(public_key=settings.vapid_public_key if is_configured(settings) else None)


@router.put("/subscriptions", status_code=status.HTTP_204_NO_CONTENT)
def subscribe(
    body: SubscriptionIn,
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> None:
    """Save this device's subscription. Idempotent; the client re-sends it on every app load."""
    if not is_allowed_endpoint(body.endpoint):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Unsupported push endpoint")
    sub = db.scalar(select(PushSubscription).where(PushSubscription.endpoint == body.endpoint))
    if sub is None:
        sub = PushSubscription(endpoint=body.endpoint)
        db.add(sub)
    # Same device, possibly a different account signed in now: it belongs to whoever saved it last.
    sub.user_id = user.id
    sub.p256dh = body.keys.p256dh
    sub.auth = body.keys.auth
    sub.user_agent = (request.headers.get("user-agent") or "")[:255] or None
    db.commit()


@router.post("/unsubscribe", status_code=status.HTTP_204_NO_CONTENT)
def unsubscribe(
    body: EndpointIn, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> None:
    db.execute(
        delete(PushSubscription).where(
            PushSubscription.endpoint == body.endpoint, PushSubscription.user_id == user.id
        )
    )
    db.commit()


@router.post("/test", response_model=TestOut)
def test(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> TestOut:
    if not is_configured(settings):
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Push isn't set up on the server")
    payload = {
        "title": "Notifications are on",
        "body": "You'll get an alert here if live GPS recording stops.",
        "url": "/settings",
        "tag": "test",
    }
    return TestOut(sent=send_to_user(db, user.id, payload, settings))
