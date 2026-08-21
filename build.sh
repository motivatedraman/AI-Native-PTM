#!/usr/bin/env bash
set -e

echo "==> Installing backend dependencies..."
pip install -r backend/requirements.txt

echo "==> Building frontend..."
npm --prefix frontend install
npm --prefix frontend run build

echo "==> Running database migrations..."
PYTHONPATH=. alembic upgrade head || true

echo "==> Initializing seed data if empty..."
PYTHONPATH=. python backend/seed.py || true

echo "==> Build complete!"
