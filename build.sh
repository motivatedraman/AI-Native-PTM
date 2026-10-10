#!/usr/bin/env bash
set -e

echo "==> Installing backend dependencies..."
pip install -r backend/requirements.txt

echo "==> Building frontend..."
npm --prefix frontend install
npm --prefix frontend run build

echo "==> Ensuring database schema..."
# NOT `|| true`. Alembic aborts on the first revision that conflicts with
# the existing schema -- and this database was built by the app's
# create_all boot hook, not by alembic, so alembic_version is empty and
# `upgrade head` tries to run initial_schema against tables that already
# exist. It failed on every deploy and `|| true` hid it, so a migration
# that had never executed looked identical to one that had. If this fails,
# the deploy should stop: see the migration note in README.md for stamping
# an existing database.
PYTHONPATH=. alembic upgrade head

# Tables now exist (from alembic above, or from the boot hook on first run),
# so seeding is safe against Postgres too. Every insert is guarded by an
# existence check, so this is genuinely safe to re-run.
echo "==> Seeding if empty..."
PYTHONPATH=. python backend/seed.py

echo "==> Build complete!"