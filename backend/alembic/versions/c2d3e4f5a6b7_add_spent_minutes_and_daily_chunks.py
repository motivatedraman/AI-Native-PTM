"""add_spent_minutes_and_daily_chunks

Revision ID: c2d3e4f5a6b7
Revises: a1b2c3d4e5f6
Create Date: 2026-08-21 02:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c2d3e4f5a6b7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add spent_minutes to tasks if not exists
    try:
        op.add_column('tasks', sa.Column('spent_minutes', sa.Integer(), nullable=False, server_default='0'))
    except Exception:
        pass

    # Add daily_chunks to user_settings if not exists
    try:
        op.add_column('user_settings', sa.Column('daily_chunks', sa.JSON(), nullable=True))
    except Exception:
        pass


def downgrade() -> None:
    try:
        op.drop_column('user_settings', 'daily_chunks')
    except Exception:
        pass
    try:
        op.drop_column('tasks', 'spent_minutes')
    except Exception:
        pass
