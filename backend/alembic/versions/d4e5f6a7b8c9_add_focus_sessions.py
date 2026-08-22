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
            sa.Column('break_taken', sa.Boolean(), nullable=False, server_default=sa.text('0')),
            sa.Column('started_at', sa.DateTime(), nullable=True),
            sa.Column('ended_at', sa.DateTime(), nullable=True),
        )
        op.create_index('ix_focus_sessions_id', 'focus_sessions', ['id'])
        op.create_index('ix_focus_sessions_task_id', 'focus_sessions', ['task_id'])
        op.create_index('ix_focus_sessions_status', 'focus_sessions', ['status'])
        op.create_index('ix_focus_sessions_started_at', 'focus_sessions', ['started_at'])
    except Exception:
        pass


def downgrade() -> None:
    try:
        op.drop_table('focus_sessions')
    except Exception:
        pass
