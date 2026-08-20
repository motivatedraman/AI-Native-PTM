#!/usr/bin/env bash
set -e
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

# Kill any existing processes first
pkill -f "uvicorn backend.app.main" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

echo "Starting backend on :8000 ..."
PYTHONUNBUFFERED=1 setsid "$PROJECT_ROOT/backend/.venv/bin/uvicorn" backend.app.main:app --host 0.0.0.0 --port 8000 > "$PROJECT_ROOT/backend.log" 2>&1 &

echo "Starting frontend on :5173 ..."
cd "$PROJECT_ROOT/frontend"
setsid npx vite --host 0.0.0.0 > "$PROJECT_ROOT/frontend.log" 2>&1 &

sleep 2
echo "Done. Backend: http://localhost:8000 | Frontend: http://localhost:5173"
