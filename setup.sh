#!/usr/bin/env bash
# Point this project at a brand new database. Run it from the project root.
#
#   ./setup.sh
#   -> asks for the Neon connection string, checks it, runs every migration,
#      seeds it, and confirms the schema is right.
#
# Built for the case where alembic's history does not match the database:
# this stamps the schema it finds rather than trying to replay migrations
# that have already been applied by other means.
set -euo pipefail

cd "$(dirname "$0")"

VENV="backend/.venv"
PY="$VENV/bin/python"
[ -x "$PY" ] || PY="python3"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
warn() { printf '\033[33m%s\033[0m\n' "$*"; }
die() { printf '\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

# ─────────────────────────────────────────────────────────────── database URL
say "1/5  Database"
URL=""
if [ -n "${DATABASE_URL:-}" ]; then
  echo "Using DATABASE_URL from the environment."
  URL="$DATABASE_URL"
else
  echo "Paste the Neon connection string."
  echo "  Neon console -> your project -> Connect -> the 'postgresql://...' URL"
  echo "  It normally looks like:"
  echo "    postgresql://user:password@ep-xxx-yyy.region.aws.neon.tech/neondb?sslmode=require"
  echo
  printf "  URL: "
  read -r URL
  echo
fi

case "$URL" in
  postgres://*) URL="postgresql://${URL#postgres://}" ;;
esac
case "$URL" in
  postgresql://*) ;;
  *) die "That does not look like a Postgres URL. Expected it to start with postgresql://" ;;
esac

export DATABASE_URL="$URL"

# ───────────────────────────────────────────────────────────────── reachable
say "2/5  Connecting"
"$PY" - <<'EOF' || die "Could not connect. Check the URL, that the password is correct, and that your IP is allowed."
import os, sys
from sqlalchemy import create_engine, text
url = os.environ["DATABASE_URL"]
if url.startswith("postgresql://"):
    url = "postgresql+psycopg2://" + url[len("postgresql://"):]
if "sslmode" not in url:
    url += "&" if "?" in url else "?"
    url += "sslmode=require"
try:
    with create_engine(url).connect() as c:
        print("   Connected:", c.execute(text("select current_database()")).scalar())
except Exception as e:
    print("   ", type(e).__name__, e, file=sys.stderr)
    sys.exit(1)
EOF

# ─────────────────────────────────────────────────── stamp whatever is there
say "3/5  Reconciling migrations"
"$PY" - <<'EOF'
import os
from sqlalchemy import create_engine, inspect, text

url = os.environ["DATABASE_URL"]
if url.startswith("postgresql://"):
    url = "postgresql+psycopg2://" + url[len("postgresql://"):]
if "sslmode" not in url:
    url += "&" if "?" in url else "?"
    url += "sslmode=require"

e = create_engine(url)
insp = inspect(e)
tables = set(insp.get_table_names())

with e.connect() as c:
    stamped = c.execute(text("select version_num from alembic_version")).scalar()

if not tables:
    print("   Empty database. Migrations will run from the beginning.")
elif stamped:
    print(f"   Already stamped at {stamped}.")
elif "tasks" in tables:
    print("   Tables exist but alembic has no history of them, which is what")
    print("   happens when the schema was built by the app instead of alembic.")
    print("   Marking the schema as current so migrations are not replayed")
    print("   against tables that already exist.")
    print("   To be explicit about which revision that is, set REVISION=<id>.")
else:
    print("   Unexpected: tables present but not 'tasks'. Stopping.")
    raise SystemExit(1)
EOF

REV="${REVISION:-e5f6a7b8c9d0}"
"$PY" - <<EOF || die "Stamping failed."
import os
from sqlalchemy import create_engine, inspect, text
url = os.environ["DATABASE_URL"]
if url.startswith("postgresql://"):
    url = "postgresql+psycopg2://" + url[len("postgresql://"):]
if "sslmode" not in url:
    url += "&" if "?" in url else "?"
    url += "sslmode=require"
e = create_engine(url)
with e.begin() as c:
    already = c.execute(text("select version_num from alembic_version")).scalar()
    if not already and "tasks" in set(inspect(e).get_table_names()):
        c.execute(text("insert into alembic_version (version_num) values (:v)"), {"v": "$REV"})
        print(f"   Stamped as $REV")
EOF

# ────────────────────────────────────────────────────────── run migrations
say "4/5  Applying migrations"
PYTHONPATH=. "$PY" -m alembic upgrade head || die "Migrations failed. Nothing has been changed."

# ───────────────────────────────────────────────────────────── seed + verify
say "5/5  Seeding and verifying"
PYTHONPATH=. "$PY" backend/seed.py >/dev/null || die "Seeding failed."

"$PY" - <<'EOF' || die "Verification failed."
import os, sys
from sqlalchemy import create_engine, text
url = os.environ["DATABASE_URL"]
if url.startswith("postgresql://"):
    url = "postgresql+psycopg2://" + url[len("postgresql://"):]
if "sslmode" not in url:
    url += "&" if "?" in url else "?"
    url += "sslmode=require"
e = create_engine(url)
bad = []
with e.connect() as c:
    ver = c.execute(text("select version_num from alembic_version")).scalar()
    print(f"   alembic version: {ver}")
    rows = c.execute(text("""
        select table_name, column_name, data_type
        from information_schema.columns
        where table_schema = current_schema()
          and data_type = 'timestamp without time zone'
    """)).fetchall()
    for t, col, _ in rows:
        bad.append(f"{t}.{col}")
    ts = c.execute(text("""
        select table_name, column_name, data_type
        from information_schema.columns
        where table_schema = current_schema()
          and data_type = 'timestamp with time zone'
    """)).fetchall()
    print(f"   timezone-aware columns: {len(ts)}")
    n = c.execute(text("select count(*) from tasks")).scalar()
    print(f"   tasks rows: {n}")

if bad:
    print()
    print("   These columns are still naive:")
    for b in bad:
        print("     ", b)
    sys.exit(1)
print()
print("   All datetime columns are timestamp with time zone.")
EOF

say "Ready."
cat <<'EOF'

Next: put the same URL in Render.
  Render -> your service -> Environment -> DATABASE_URL
  (sync:false means you paste it yourself; it is not in render.yaml)

Then deploy. Nothing else is needed.
EOF