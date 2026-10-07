from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """All runtime settings come from DOGWALKER_* env vars (or the repo-root .env)."""

    model_config = SettingsConfigDict(
        env_prefix="DOGWALKER_", env_file=REPO_ROOT / ".env", extra="ignore"
    )

    env: str = "development"
    database_url: str
    test_database_url: str | None = None

    # Session cookie. Secure must be true anywhere served over HTTPS.
    cookie_secure: bool = True
    session_cookie_name: str = "dw_session"
    session_ttl_days: int = 90

    # Built frontend served by FastAPI in production. Absent in dev (Vite serves it).
    frontend_dist: Path = REPO_ROOT / "frontend" / "dist"

    # Failed-login throttle, per client IP + username.
    login_max_failures: int = 10
    login_failure_window_seconds: int = 15 * 60

    # Web Push (VAPID). Generate with `python -m app.cli generate-vapid-keys`.
    # Push is disabled (endpoints return 503) until both keys are set.
    vapid_public_key: str | None = None
    vapid_private_key: str | None = None
    vapid_subject: str = "mailto:admin@example.com"

    # Live GPS watchdog (app/tracking.py): push "GPS paused" when a recording
    # client goes quiet. Heartbeats arrive every ~5 s while the app is open.
    # The hidden beacon is the main signal; missed heartbeats alone (no beacon) can
    # also mean "no signal", so that fallback waits longer.
    tracking_hidden_grace_seconds: int = 15
    tracking_stale_seconds: int = 60


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
