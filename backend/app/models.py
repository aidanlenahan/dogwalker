"""Database schema (PRD §31).

Walks and their child rows use UUID primary keys so the client can generate IDs
offline and retry uploads idempotently (PRD §26). Walk IDs are still never used
as the public share mechanism; that is `walks.share_token`.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    SmallInteger,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

WALK_STATUSES = ("created", "active", "completed", "published")
WALK_VISIBILITIES = ("private", "unlisted", "public")
EVENT_TYPES = ("pee", "poop", "water", "fed", "note", "other")
# PRD §12.1: record live with the app open, or record elsewhere and upload a GPX.
GPS_MODES = ("live", "upload")


def _in(column: str, values: tuple[str, ...]) -> str:
    return f"{column} IN ({', '.join(repr(v) for v in values)})"


def _created_at() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now())


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Stored lowercase; used in /u/:username.
    username: Mapped[str] = mapped_column(String(32), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(100))
    bio: Mapped[str | None] = mapped_column(Text)
    service_area: Mapped[str | None] = mapped_column(String(200))
    profile_photo: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")
    created_at: Mapped[datetime] = _created_at()


class AuthSession(Base):
    """Server-side login session. Only a SHA-256 of the cookie token is stored."""

    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = _created_at()
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(lazy="joined")


class PushSubscription(Base):
    """A browser's Web Push subscription. One per device; the endpoint is the identity."""

    __tablename__ = "push_subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    endpoint: Mapped[str] = mapped_column(Text, unique=True)
    p256dh: Mapped[str] = mapped_column(String(255))
    auth: Mapped[str] = mapped_column(String(255))
    user_agent: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = _created_at()


class Dog(Base):
    __tablename__ = "dogs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    owner_name: Mapped[str | None] = mapped_column(String(100))
    photo: Mapped[str | None] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = _created_at()


class Walk(Base):
    __tablename__ = "walks"
    __table_args__ = (
        CheckConstraint(_in("status", WALK_STATUSES), name="status"),
        CheckConstraint(_in("visibility", WALK_VISIBILITIES), name="visibility"),
        CheckConstraint(_in("gps_mode", GPS_MODES), name="gps_mode"),
        Index("ix_walks_user_id_started_at", "user_id", "started_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    dog_id: Mapped[int] = mapped_column(ForeignKey("dogs.id", ondelete="RESTRICT"), index=True)
    status: Mapped[str] = mapped_column(String(16), server_default="created")
    visibility: Mapped[str] = mapped_column(String(16), server_default="private")

    # Tracking options chosen on the New Walk screen (PRD §9).
    track_gps: Mapped[bool] = mapped_column(Boolean, server_default="true")
    track_stats: Mapped[bool] = mapped_column(Boolean, server_default="true")
    track_photos: Mapped[bool] = mapped_column(Boolean, server_default="true")
    track_activity: Mapped[bool] = mapped_column(Boolean, server_default="true")
    # Null when GPS isn't tracked.
    gps_mode: Mapped[str | None] = mapped_column(String(16))

    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    distance_meters: Mapped[float | None] = mapped_column(Float)
    pre_walk_notes: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)

    # Random, unguessable, set on publish (PRD §18). Never sequential.
    share_token: Mapped[str | None] = mapped_column(String(64), unique=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = _created_at()

    dog: Mapped[Dog] = relationship(lazy="joined")
    events: Mapped[list["WalkEvent"]] = relationship(
        order_by="WalkEvent.timestamp", cascade="all, delete-orphan", passive_deletes=True
    )


class WalkEvent(Base):
    __tablename__ = "walk_events"
    __table_args__ = (
        CheckConstraint(_in("type", EVENT_TYPES), name="type"),
        Index("ix_walk_events_walk_id_timestamp", "walk_id", "timestamp"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    walk_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("walks.id", ondelete="CASCADE"))
    type: Mapped[str] = mapped_column(String(16))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    notes: Mapped[str | None] = mapped_column(Text)


class GpsPoint(Base):
    __tablename__ = "gps_points"
    __table_args__ = (Index("ix_gps_points_walk_id_timestamp", "walk_id", "timestamp"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    walk_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("walks.id", ondelete="CASCADE"))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    accuracy: Mapped[float | None] = mapped_column(Float)
    altitude: Mapped[float | None] = mapped_column(Float)
    speed: Mapped[float | None] = mapped_column(Float)
    # Set by accuracy/jump filtering (PRD §12); rejected points stay for debugging.
    accepted: Mapped[bool] = mapped_column(Boolean, server_default="true")


class Photo(Base):
    __tablename__ = "photos"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    walk_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("walks.id", ondelete="CASCADE"), index=True
    )
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    storage_path: Mapped[str] = mapped_column(String(255))
    caption: Mapped[str | None] = mapped_column(Text)
    size_bytes: Mapped[int | None] = mapped_column(BigInteger)


class Testimonial(Base):
    __tablename__ = "testimonials"
    __table_args__ = (CheckConstraint("rating BETWEEN 1 AND 5", name="rating"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    client_name: Mapped[str] = mapped_column(String(100))
    rating: Mapped[int | None] = mapped_column(SmallInteger)
    text: Mapped[str] = mapped_column(Text)
    visible: Mapped[bool] = mapped_column(Boolean, server_default="true")
    created_at: Mapped[datetime] = _created_at()
