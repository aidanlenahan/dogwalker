import asyncio
import contextlib
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from urllib.parse import urlsplit

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routers import auth, health, push, tracking
from app.spa import mount_spa
from app.tracking import watchdog

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    # Keeps share-token paths out of Referer headers sent to third parties (e.g. map tiles).
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(self), camera=(self), microphone=()",
}


def create_app() -> FastAPI:
    settings = get_settings()
    is_prod = settings.env == "production"

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        task = asyncio.create_task(watchdog(settings))
        yield
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task

    app = FastAPI(
        lifespan=lifespan,
        title="Dogwalker API",
        docs_url=None if is_prod else "/api/docs",
        redoc_url=None,
        openapi_url=None if is_prod else "/api/openapi.json",
    )

    @app.middleware("http")
    async def same_origin_and_headers(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        # CSRF defense in depth alongside SameSite=Lax: a browser-sent Origin on a
        # state-changing request must match the host it was sent to.
        origin = request.headers.get("origin")
        host = request.headers.get("host")
        if request.method in UNSAFE_METHODS and origin and urlsplit(origin).netloc != host:
            return JSONResponse({"detail": "Cross-origin request blocked"}, status_code=403)

        response = await call_next(request)
        for name, value in SECURITY_HEADERS.items():
            response.headers.setdefault(name, value)
        if request.url.path.startswith("/api/"):
            response.headers.setdefault("Cache-Control", "no-store")
        return response

    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(push.router)
    app.include_router(tracking.router)

    if (settings.frontend_dist / "index.html").is_file():
        mount_spa(app, settings.frontend_dist)

    return app


app = create_app()
