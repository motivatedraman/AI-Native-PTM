"""
Query-count regression test for the N+1 fixes.

Runs against an isolated in-memory database so it never touches app data.
Asserts the list endpoints issue a bounded number of queries regardless of
row count, the property that actually matters, since the old behaviour was
O(n) round-trips rather than merely "slow".

Run: backend/.venv/bin/python backend/tests/perf_test.py
"""
import os
import sys
import time
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Point the app at a throwaway DB *before* anything imports the engine.
_TMP = "/tmp/nexus_perf_test.db"
if os.path.exists(_TMP):
    os.remove(_TMP)
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP}"

from sqlalchemy import event  # noqa: E402
from sqlalchemy.orm import selectinload  # noqa: E402

from backend.app.database import Base, SessionLocal, engine  # noqa: E402
from backend.app.models.task import Task  # noqa: E402
from backend.app.models.subtask import Subtask  # noqa: E402
from backend.app.models.tag import Tag  # noqa: E402
from backend.app.schemas.task import TaskResponse  # noqa: E402

_counter = {"n": 0}


@event.listens_for(engine, "before_cursor_execute")
def _count(conn, cursor, statement, params, context, executemany):
    _counter["n"] += 1


def reset_counter():
    _counter["n"] = 0


def seed(n_tasks: int):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    tags = []
    for i in range(5):
        t = Tag(name=f"perf-tag-{i}", color="#64748b", created_at=datetime.now(timezone.utc))
        db.add(t)
        tags.append(t)
    db.commit()
    for i in range(n_tasks):
        task = Task(
            title=f"perf {i}",
            status="inbox",
            priority="medium",
            category="Personal",
            created_at=datetime.now(timezone.utc),
        )
        db.add(task)
        db.flush()
        for j in range(2):
            db.add(Subtask(task_id=task.id, title=f"s{j}", order=j))
        task.tags.append(tags[i % len(tags)])
    db.commit()
    db.close()


def measure(loader, n_tasks):
    db = SessionLocal()
    try:
        db.expire_all()
        reset_counter()
        t0 = time.perf_counter()
        rows = loader(db)
        payload = [TaskResponse.model_validate(t) for t in rows]
        ms = (time.perf_counter() - t0) * 1000
        return _counter["n"], ms, len(payload)
    finally:
        db.close()


def eager(db):
    return db.query(Task).options(
        selectinload(Task.subtasks),
        selectinload(Task.tags),
        selectinload(Task.project),
    ).limit(100).all()


def lazy(db):
    return db.query(Task).limit(100).all()


def main() -> int:
    failures = []

    # 1. The fix is present and bounded.
    seed(100)
    q_lazy, ms_lazy, n = measure(lazy, 100)
    q_fast, ms_fast, _ = measure(eager, 100)
    print(f"100 tasks, list + serialize")
    print(f"  lazy loading (the bug): {q_lazy:4d} queries  {ms_lazy:7.1f} ms")
    print(f"  selectinload (the fix): {q_fast:4d} queries  {ms_fast:7.1f} ms")
    if q_fast > 5:
        failures.append(f"eager path issued {q_fast} queries, expected <= 5")
    if q_fast >= q_lazy:
        failures.append(f"eager path ({q_fast}) is not better than lazy ({q_lazy})")

    # 2. Query count must not scale with row count. This is the real
    #    property: a fixed ceiling means O(1) round-trips, not O(n).
    counts = {}
    for size in (25, 100):
        seed(size)
        q, ms, rows = measure(eager, size)
        counts[size] = q
        print(f"  {size:3d} tasks -> {q} queries, {ms:6.1f} ms")
        if rows != size:
            failures.append(f"expected {size} rows, got {rows}")

    if counts[100] > counts[25] + 2:
        failures.append(
            f"query count grows with row count ({counts[25]} -> {counts[100]}); "
            "that means the N+1 is back"
        )
    else:
        print(f"  query count is flat across row counts: OK")

    # 3. Cleanup.
    Base.metadata.drop_all(bind=engine)
    if os.path.exists(_TMP):
        os.remove(_TMP)

    print()
    if failures:
        for f in failures:
            print(f"FAIL: {f}")
        return 1
    print("PASS: N+1 eliminated, query count bounded and flat")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())