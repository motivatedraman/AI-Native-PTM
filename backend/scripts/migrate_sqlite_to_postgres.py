#!/usr/bin/env python3
"""Copy tasks from the local SQLite file into a hosted Postgres database.

Render's free web services have an ephemeral filesystem, so the SQLite file
on the server is wiped on every deploy. This moves the data to Postgres once,
after which deploys are harmless.

Two modes:

  Preview (default, safe):
      python backend/scripts/migrate_sqlite_to_postgres.py

  Apply:
      python backend/scripts/migrate_sqlite_to_postgres.py \
          --target "postgresql://user:pass@host/db?sslmode=require"

The source defaults to ./data/app.db and is opened read-only. The target is
never truncated: existing rows with a matching primary key are skipped, so
running it twice is harmless.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Table order matters: children before parents, because the FKs.
# Order: parents -> children.
TABLES = [
    "projects",
    "tags",
    "user_settings",
    "tasks",
    "subtasks",
    "task_tags",
    "task_dependencies",
    "activity_logs",
    "daily_reflections",
    "ai_suggestions",
    "focus_sessions",
]


def build_engine(url, readonly=False):
    from sqlalchemy import create_engine

    if url.startswith("sqlite"):
        if readonly:
            # SQLite only honours mode=ro through a file: URI, and the path
            # must be absolute. Passing connect_args instead raises TypeError.
            path = url.split("sqlite:///")[-1].split("?")[0]
            path = os.path.abspath(path)
            return create_engine(f"sqlite:///file:{path}?mode=ro&uri=true")
        return create_engine(url)

    # A hosted Postgres usually needs TLS.
    if "sslmode" not in url:
        url = url + ("&" if "?" in url else "?") + "sslmode=require"
    return create_engine(url, pool_pre_ping=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--source", default=os.environ.get("SOURCE_DATABASE_URL", "sqlite:///./data/app.db"))
    ap.add_argument("--target", default=os.environ.get("DATABASE_URL"),
                    help="Postgres URL. Falls back to the DATABASE_URL env var.")
    ap.add_argument("--apply", action="store_true",
                    help="Actually write. Without this flag it only prints a plan.")
    args = ap.parse_args()

    if not args.target or args.target.startswith("sqlite"):
        print("ERROR: no Postgres target.\n"
              "  Pass --target postgresql://... or set DATABASE_URL.\n"
              "  Create a free database at https://neon.tech and copy its\n"
              "  pooled connection string.")
        return 2

    from sqlalchemy import create_engine, inspect, text
    from backend.app.models import (
        Project, Tag, Subtask, ActivityLog, Task, TaskDependency,
        DailyReflection, UserSettings, AISuggestion, FocusSession,
    )
    from backend.app.database import Base

    src_engine = build_engine(args.source, readonly=True)
    dst_engine = build_engine(args.target)

    src_tables = set(inspect(src_engine).get_table_names())

    print(f"source: {args.source}")
    print(f"target: {args.target.split('@')[-1]}")
    print()

    Base.metadata.create_all(bind=dst_engine)
    missing = [t for t in TABLES if t not in src_tables]
    if missing:
        print(f"note: not present in source, skipping: {', '.join(missing)}")
    present = [t for t in TABLES if t in src_tables]

    # Pre-flight: is the target already populated? Refusing to double-write
    # is friendlier than silently merging into unknown data.
    with dst_engine.connect() as c:
        try:
            existing = c.execute(text("select count(*) from tasks")).scalar() or 0
        except Exception:
            existing = 0
    if existing:
        print(f"\nTarget already has {existing} tasks. Rows with a matching id are")
        print("skipped, so this is safe to re-run, but double-check the URL.")

    print("\nplan:")
    totals = {}
    with src_engine.connect() as s:
        for t in present:
            totals[t] = s.execute(text(f"select count(*) from {t}")).scalar()

    for t in present:
        print(f"  {t:20} {totals[t]:>6} rows")

    if not args.apply:
        print("\nDRY RUN. Nothing was written. Re-run with --apply to copy.")
        return 0

    print("\ncopying...")
    copied = skipped = 0
    with src_engine.connect() as s:
        for t in present:
            rows = s.execute(text(f"select * from {t}")).mappings().all()
            if not rows:
                continue
            # Postgres wants plain dicts; JSON columns come back already decoded.
            payloads = [dict(r) for r in rows]
            with dst_engine.begin() as d:
                for p in payloads:
                    pk = p.get("id")
                    if pk is None:
                        # Association tables (task_tags) have no primary key.
                        q = d.dialect.identifier_preparer.quote
                        cols = ", ".join(q(c) for c in p)
                        marks = ", ".join(f":{c}" for c in p)
                        d.execute(text(f"insert into {q(t)} ({cols}) values ({marks})"), p)
                        copied += 1
                        continue
                    exists = d.execute(
                        text(f"select 1 from {t} where id = :pk"), {"pk": pk}
                    ).first()
                    if exists:
                        skipped += 1
                        continue
                    # "order" in subtasks is a reserved word; unquoted
                    # identifiers fail on both sqlite and postgres.
                    q = d.dialect.identifier_preparer.quote
                    cols = ", ".join(q(c) for c in p)
                    marks = ", ".join(f":{c}" for c in p)
                    d.execute(text(f"insert into {q(t)} ({cols}) values ({marks})"), p)
                    copied += 1
            print(f"  {t:20} done")

    print(f"\ncopied {copied} rows, skipped {skipped} already present")
    print("\nNext: set DATABASE_URL in the Render dashboard to the same URL,")
    print("then redeploy. Verify with:")
    print("  curl -s https://<your-app>/api/health")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())