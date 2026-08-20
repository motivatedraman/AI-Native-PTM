#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "Starting backend on :8000 ..."
nohup backend/.venv/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &

echo "Starting frontend on :5173 ..."
cd frontend
nohup npx vite --host 0.0.0.0 > frontend.log 2>&1 &

sleep 2
echo "Done. Backend: http://localhost:8000 | Frontend: http://localhost:5173"
