# Dogwalker

A mobile-first PWA for recording dog walks and sharing a polished report with the dog's owner.
Spec: [docs/PRD.md](docs/PRD.md). Build plan: [TODO.md](TODO.md).

- `frontend/`: React + TypeScript + Vite PWA
- `backend/`: FastAPI + SQLAlchemy + Alembic on PostgreSQL
- `deploy/`: systemd units and the deploy script for the production host
- `cloudflared/`: Cloudflare Tunnel config for `dogwalker.alenahan.net`

## Configuration

All settings come from `DOGWALKER_*` environment variables, read from the repo-root `.env`.
Copy [.env.example](.env.example) to `.env` and fill it in. `.env` is git-ignored.

## Local development (native)

Needs Python 3.12 via [uv](https://docs.astral.sh/uv/), Node 22, and PostgreSQL.

```sh
# Backend: http://127.0.0.1:8000 (API docs at /api/docs)
cd backend
uv sync
uv run alembic upgrade head
uv run python -m app.cli create-user <username> --display-name "<Name>"
uv run uvicorn app.main:app --reload --port 8000

# Frontend: http://127.0.0.1:5173 (proxies /api to :8000)
cd frontend
npm install
npm run dev
```

On the production host, the root `.env` points at the production database. Override
`DOGWALKER_DATABASE_URL` in your shell if you want a separate dev database there.

## Local development (Docker Compose)

```sh
cp .env.example .env   # set POSTGRES_PASSWORD
docker compose up
docker compose exec backend python -m app.cli create-user <username> --display-name "<Name>"
```

The app is at http://localhost:5173. Postgres is not published to the host.

## Checks

```sh
cd backend && uv run ruff check . && uv run ruff format --check . && uv run pytest
cd frontend && npm run lint && npm run typecheck && npm test
```

Backend tests run real migrations against `DOGWALKER_TEST_DATABASE_URL` and wipe it.

## Production

One process serves everything: uvicorn on `127.0.0.1:8080` runs the API under `/api/` and
serves the built frontend (`frontend/dist`) for every other path. Cloudflare Tunnel
(`cloudflared-dogwalker.service`) is the only thing that connects to it, and it provides HTTPS.
PostgreSQL listens on localhost only.

```sh
./deploy/deploy.sh                      # deps, build, migrate, restart, health check
journalctl -u dogwalker -f              # app logs
cd backend && .venv/bin/python -m app.cli set-password <username>   # reset + sign out everywhere
```

### Database migrations

```sh
cd backend
uv run alembic revision --autogenerate -m "describe change"   # review the generated file
uv run alembic upgrade head
```

`dogwalker.service` also runs `alembic upgrade head` on every start.

## App icons

Edit `frontend/public/logo.svg`, then run `npm run generate-icons` in `frontend/`.
