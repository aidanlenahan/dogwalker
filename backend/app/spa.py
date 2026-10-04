"""Serves the built frontend (frontend/dist) from the same origin as the API."""

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse

# Must always revalidate so new deploys and service-worker updates are picked up.
NO_CACHE = {"Cache-Control": "no-cache"}
# Vite emits content-hashed filenames under assets/.
IMMUTABLE = {"Cache-Control": "public, max-age=31536000, immutable"}


def mount_spa(app: FastAPI, dist: Path) -> None:
    dist = dist.resolve()
    index = dist / "index.html"

    @app.api_route("/{path:path}", methods=["GET", "HEAD"], include_in_schema=False)
    def spa(path: str) -> FileResponse:
        if path == "api" or path.startswith("api/"):
            raise HTTPException(404, "Not found")

        candidate = (dist / path).resolve()
        if path and candidate.is_file() and candidate.is_relative_to(dist):
            headers = IMMUTABLE if path.startswith("assets/") else NO_CACHE
            return FileResponse(candidate, headers=headers)
        # Client-side routes (/dashboard, /w/:token, ...) all get the app shell.
        return FileResponse(index, headers=NO_CACHE)
