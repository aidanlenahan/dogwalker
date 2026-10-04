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


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
