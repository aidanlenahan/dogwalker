from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import get_db
from app.models import AuthSession, User
from app.security import hash_token


def set_session_cookie(response: Response, token: str, settings: Settings) -> None:
    response.set_cookie(
        settings.session_cookie_name,
        token,
        max_age=settings.session_ttl_days * 86400,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


def current_session(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> AuthSession:
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in")

    session = db.scalar(select(AuthSession).where(AuthSession.token_hash == hash_token(token)))
    now = datetime.now(UTC)
    if session is None or session.expires_at <= now or not session.user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in")

    # Sliding expiry: renew once the session is past half its lifetime.
    ttl = timedelta(days=settings.session_ttl_days)
    if session.expires_at - now < ttl / 2:
        session.expires_at = now + ttl
        db.commit()
        set_session_cookie(response, token, settings)
    return session


def current_user(session: AuthSession = Depends(current_session)) -> User:
    return session.user


def get_owned[M](db: Session, model: type[M], id: Any, user: User) -> M:
    """Load a row owned by `user`, or 404. Use for every management endpoint (PRD §25).

    Returns 404 rather than 403 so other users' IDs aren't confirmed to exist.
    """
    obj = db.get(model, id)
    if obj is None or getattr(obj, "user_id", None) != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    return obj
