#!/usr/bin/env bash
# Local development: FastAPI on :8000 (auto-reload) + Vite on :5173 (proxies /api).
# Open http://localhost:5173. Ctrl-C stops both.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { echo "No .env found. Copy .env.example to .env and add OPENAI_API_KEY."; exit 1; }
[ -d frontend/node_modules ] || (cd frontend && npm install)
uv sync -q

uv run uvicorn app.main:app --app-dir backend --reload --reload-dir backend --port 8000 &
BACKEND=$!
trap 'kill $BACKEND 2>/dev/null' EXIT

cd frontend && npm run dev
