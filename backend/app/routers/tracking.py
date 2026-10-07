"""Live GPS heartbeats for the "recording paused" alert (see app/tracking.py)."""

import time
from typing import Annotated

from fastapi import APIRouter, Depends, Path, status
from pydantic import BaseModel, Field

from app.deps import current_user
from app.models import User
from app.tracking import tracker

router = APIRouter(prefix="/api/tracking", tags=["tracking"])

# A walk UUID later; the GPS spike uses ISO timestamps.
SessionId = Annotated[str, Path(pattern=r"^[A-Za-z0-9_.:-]{1,64}$")]


class HeartbeatIn(BaseModel):
    # Where the notification opens. Same-origin path only.
    # Only a heartbeat sent while visible cancels a pending "hidden" alert.
    visible: bool = True
    resume_url: str = Field(default="/dashboard", max_length=200, pattern=r"^/([^/\s\\][^\s\\]*)?$")


@router.post("/{session_id}/heartbeat", status_code=status.HTTP_204_NO_CONTENT)
def heartbeat(session_id: SessionId, body: HeartbeatIn, user: User = Depends(current_user)) -> None:
    tracker.heartbeat(user.id, session_id, body.resume_url, time.time(), body.visible)


@router.post("/{session_id}/hidden", status_code=status.HTTP_204_NO_CONTENT)
def hidden(session_id: SessionId, user: User = Depends(current_user)) -> None:
    """Sent with navigator.sendBeacon when the page is hidden; no body."""
    tracker.hidden(user.id, session_id, time.time())


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def stop(session_id: SessionId, user: User = Depends(current_user)) -> None:
    tracker.stop(user.id, session_id)
