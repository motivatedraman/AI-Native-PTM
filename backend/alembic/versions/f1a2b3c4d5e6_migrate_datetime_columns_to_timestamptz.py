"""migrate_datetime_columns_to_timestamptz

Revision ID: f1a2b3c4d5e6
Revises: e5f6a7b8c9d0
Create Date: 2026-10-09

Why this exists
---------------
Every datetime column was TIMESTAMP WITHOUT TIME ZONE holding naive UTC,
and every value was computed in Python with datetime.utcnow(). That made
the Neon branch timezone irrelevant to writes (Postgres never converts a
naive value) while simultaneously corrupting every value the *browser*
sent: the frontend sent due_date as an aware ISO string, psycopg2
adapted it to '...'::timestamptz, and assigning a timestamptz to a naive
column converts through the session TimeZone. With the branch set to
Asia/Kathmandu that shifted every browser-written due date by +05:45,
which pushed late captures onto the wrong calendar day and made tasks
vanish from Today after a refresh.

Storing TIMESTAMPTZ fixes both halves at once: an instant is normalized on
write, so no session timezone can reinterpret it, and reading it back
gives the true instant, which the frontend renders in Nepal time.

Existing rows were written by datetime.utcnow(), so they are already UTC.
`AT TIME ZONE 'UTC'` attaches that zone to the naive value rather than
shifting it, which keeps every historical timestamp exactly as it was.

SQLite cannot alter a column type, so this is a no-op there; local dev
stores and reads the same naive strings it always did.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'e5f6a7b8c9d0'
branch_labels = None
depends_on = None

# table -> datetime columns. daily_reflections and ai_suggestions are
# omitted on purpose: e5f6a7b8c9d0 drops them, so nothing should touch them.
DATETIME_COLUMNS = {
    "tasks": ["due_date", "created_at", "updated_at", "completed_at"],
    "activity_logs": ["created_at"],
    "projects": ["created_at", "updated_at"],
    "tags": ["created_at"],
    "subtasks": ["created_at"],
    "task_dependencies": ["created_at"],
    "user_settings": ["created_at", "updated_at"],
    "focus_sessions": ["started_at", "ended_at"],
}


def _existing_columns(conn, table):
    """Columns actually present.

    This database has been through both `alembic upgrade head` and a
    `create_all` boot hook, so the live schema does not necessarily match
    any one revision. Ask the database instead of assuming.
    """
    return {row[0] for row in conn.execute(
        sa.text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema = current_schema() AND table_name = :t"
        ),
        {"t": table},
    )}


def _existing_tables(conn):
    return {
        row[0] for row in conn.execute(
            sa.text(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = current_schema()"
            )
        )
    }


def _convert(conn, target_type: str) -> None:
    tables = _existing_tables(conn)
    for table, columns in DATETIME_COLUMNS.items():
        if table not in tables:
            continue
        present = _existing_columns(conn, table)
        for column in columns:
            if column not in present:
                continue
            # AT TIME ZONE 'UTC' reinterprets the naive value as UTC rather
            # than shifting it, so pre-existing rows keep their meaning.
            conn.execute(sa.text(
                f"ALTER TABLE {table} ALTER COLUMN {column} "
                f"TYPE {target_type} USING {column} AT TIME ZONE 'UTC'"
            ))


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    # Plain transaction, not autocommit_block: ALTER COLUMN ... TYPE is
    # transactional in Postgres, and a single transaction means either
    # every column converts or the whole migration rolls back. A partial
    # conversion would leave some columns naive and some not, which is a
    # far worse state to debug than a clean failure.
    _convert(bind, "TIMESTAMPTZ")


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    _convert(bind, "TIMESTAMP WITHOUT TIME ZONE")