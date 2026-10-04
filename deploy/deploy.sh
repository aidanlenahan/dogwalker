#!/usr/bin/env bash
# Build and (re)start the production app on this host.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UV="${UV:-$HOME/.local/bin/uv}"

echo "==> Backend deps"
(cd "$ROOT/backend" && "$UV" sync --frozen)

echo "==> Frontend build"
(cd "$ROOT/frontend" && npm ci --no-audit --no-fund && npm run build)

echo "==> Restart (runs migrations first)"
install -m 644 "$ROOT/deploy/dogwalker.service" /etc/systemd/system/dogwalker.service
systemctl daemon-reload
systemctl enable --now dogwalker.service
systemctl restart dogwalker.service

for _ in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:8080/api/health >/dev/null; then
    echo "==> Healthy"; exit 0
  fi
  sleep 1
done
echo "!! Health check failed; see: journalctl -u dogwalker -n 50" >&2
exit 1
