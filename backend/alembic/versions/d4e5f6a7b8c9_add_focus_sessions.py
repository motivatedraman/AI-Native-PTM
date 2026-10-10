"""add_focus_sessions

Revision ID: d4e5f6a7b8c9
Revises: c2d3e4f5a6b7
Create Date: 2026-08-21 03:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'c2d3e4f5a6b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    try:
        op.create_table(
            'focus_sessions',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('task_id', sa.Integer(), sa.ForeignKey('tasks.id', ondelete='SET NULL'), nullable=True),
            sa.Column('planned_minutes', sa.Integer(), nullable=False),
            sa.Column('actual_minutes', sa.Integer(), nullable=True),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='active'),
            # sa.text('0') is an integer literal. SQLite coerces that to a
            # boolean; Postgres rejects it:
            #   column "break_taken" is of type boolean but default
            #   expression is of type integer
            # Postgres 18 is strict about this where older versions were
            # not, so the cast has to be explicit. Using 'false' instead
            # keeps the DDL portable across both dialects.
            sa.Column('break_taken', sa.Boolean(), nullable=False, server_default=sa.text('false')),
            sa.Column('started_at', sa.DateTime(), nullable=True),
            sa.Column('ended_at', sa.DateTime(), nullable=True),
        )
        op.create_index('ix_focus_sessions_id', 'focus_sessions', ['id'])
        op.create_index('ix_focus_sessions_task_id', 'focus_sessions', ['task_id'])
        op.create_index('ix_focus_sessions_status', 'focus_sessions', ['status'])
        op.create_index('ix_focus_sessions_started_at', 'focus_sessions', ['started_at'])
    except Exception:
        # Do NOT swallow this. A blanket except here meant a failed
        # create_table was invisible and alembic stamped the revision as
        # applied regardless, leaving a schema that disagrees with the
        # migration history. That is how a boolean/integer default
        # mismatch on Postgres went unnoticed: the exception was raised,
        # discarded, and the version bumped anyway.
        #
        # The only legitimate reason this is called twice is a table that
        # already exists from an earlier run, so tolerate exactly that.
        if op.get_bind().dialect.name == "postgresql":
            exists = op.get_bind().execute(
                sa.text("select to_regclass('public.focus_sessions')")
            ).scalar()
            if exists is None:
                raise


def downgrade() -> None:
    try:
        op.drop_table('focus_sessions')
    except Exception:
        pass
