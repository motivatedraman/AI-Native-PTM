"""add_v2_tables

Revision ID: a1b2c3d4e5f6
Revises: 78c267805219
Create Date: 2026-08-18 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '78c267805219'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Task Dependencies
    op.create_table('task_dependencies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('depends_on_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['depends_on_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_task_dependencies_id'), 'task_dependencies', ['id'], unique=False)

    # Daily Reflections
    op.create_table('daily_reflections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('reflection_date', sa.Date(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('mood', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('reflection_date')
    )
    op.create_index(op.f('ix_daily_reflections_id'), 'daily_reflections', ['id'], unique=False)
    op.create_index(op.f('ix_daily_reflections_reflection_date'), 'daily_reflections', ['reflection_date'], unique=False)

    # User Settings
    op.create_table('user_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_key', sa.String(length=50), nullable=False),
        sa.Column('available_start_hour', sa.Integer(), nullable=True),
        sa.Column('available_end_hour', sa.Integer(), nullable=True),
        sa.Column('timezone', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_key')
    )
    op.create_index(op.f('ix_user_settings_id'), 'user_settings', ['id'], unique=False)

    # AI Suggestions
    op.create_table('ai_suggestions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('suggestion_type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('action_payload', sa.JSON(), nullable=True),
        sa.Column('task_id', sa.Integer(), nullable=True),
        sa.Column('project_id', sa.Integer(), nullable=True),
        sa.Column('is_dismissed', sa.Boolean(), nullable=True),
        sa.Column('is_applied', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_suggestions_id'), 'ai_suggestions', ['id'], unique=False)
    op.create_index(op.f('ix_ai_suggestions_suggestion_type'), 'ai_suggestions', ['suggestion_type'], unique=False)
    op.create_index(op.f('ix_ai_suggestions_task_id'), 'ai_suggestions', ['task_id'], unique=False)
    op.create_index(op.f('ix_ai_suggestions_created_at'), 'ai_suggestions', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_ai_suggestions_created_at'), table_name='ai_suggestions')
    op.drop_index(op.f('ix_ai_suggestions_task_id'), table_name='ai_suggestions')
    op.drop_index(op.f('ix_ai_suggestions_suggestion_type'), table_name='ai_suggestions')
    op.drop_index(op.f('ix_ai_suggestions_id'), table_name='ai_suggestions')
    op.drop_table('ai_suggestions')

    op.drop_index(op.f('ix_user_settings_id'), table_name='user_settings')
    op.drop_table('user_settings')

    op.drop_index(op.f('ix_daily_reflections_reflection_date'), table_name='daily_reflections')
    op.drop_index(op.f('ix_daily_reflections_id'), table_name='daily_reflections')
    op.drop_table('daily_reflections')

    op.drop_index(op.f('ix_task_dependencies_id'), table_name='task_dependencies')
    op.drop_table('task_dependencies')
