#!/usr/bin/env bash
set -e

echo "==> Installing backend dependencies..."
pip install -r backend/requirements.txt

echo "==> Building frontend..."
npm --prefix frontend install
npm --prefix frontend run build

echo "==> Ensuring database schema..."
# Tables are also created on boot by the app's startup hook, so this is
# belt-and-braces. Alembic is kept for environments that track it.
PYTHONPATH=. alembic upgrade head || true

# Tables now exist (from alembic above, or from the boot hook on first run),
# so seeding is safe against Postgres too.
echo "==> Seeding if empty..."
PYTHONPATH=. python backend/seed.py || true

echo "==> Build complete!"