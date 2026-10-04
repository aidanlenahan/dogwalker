from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import get_db
from app.deps import current_session, current_user, set_session_cookie
from app.models import AuthSession, User
from app.ratelimit import login_limiter
from app.security import hash_password, hash_token, needs_rehash, new_session_token, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=32)
    password: str = Field(min_length=1, max_length=256)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: str


def _client_ip(request: Request) -> str:
    # The app listens only on localhost behind Cloudflare Tunnel, which sets this header.
    return request.headers.get("cf-connecting-ip") or (
        request.client.host if request.client else "unknown"
    )


@router.post("/login", response_model=UserOut)
def login(
    body: LoginIn,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> User:
    username = body.username.strip().lower()
    limit_key = f"{_client_ip(request)}:{username}"
    window = settings.login_failure_window_seconds
    if login_limiter.is_blocked(limit_key, settings.login_max_failures, window):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS, "Too many failed attempts. Try again later."
        )

    user = db.scalar(select(User).where(User.username == username, User.is_active.is_(True)))
    if not verify_password(user.password_hash if user else None, body.password) or user is None:
        login_limiter.record_failure(limit_key)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect username or password")
    login_limiter.reset(limit_key)

    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(body.password)

    now = datetime.now(UTC)
    # Opportunistic cleanup so the sessions table doesn't grow forever.
    db.execute(delete(AuthSession).where(AuthSession.expires_at < func.now()))
    token = new_session_token()
    db.add(
        AuthSession(
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=now + timedelta(days=settings.session_ttl_days),
        )
    )
    db.commit()
    set_session_cookie(response, token, settings)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    session: AuthSession = Depends(current_session),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> None:
    db.execute(delete(AuthSession).where(AuthSession.id == session.id))
    db.commit()
    response.delete_cookie(
        settings.session_cookie_name,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)) -> User:
    return user
