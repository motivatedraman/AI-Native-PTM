"""remove dead tables: daily_reflections, ai_suggestions

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-10-09

Two tables were vestigial and are dropped here:

  daily_reflections  written only by its own router, which the frontend
                     never calls.
  ai_suggestions     never written at all. GET /api/ai/suggestions
                     computes suggestions live from context via
                     ai_service.generate_suggestions(); it never touches
                     this table.

Deliberately NOT dropped, despite looking unused from the UI:

  task_dependencies  context_resolver.py queries it in three unguarded
                     places, and 9 AI endpoints construct that resolver.
                     Removing it would 500 every AI route.
  activity_logs      the Daily Log page reads it.
  user_settings      context_resolver reads it for available hours.

Note: the Python models and routers for these two remain in place. They
are simply no longer created by the schema. main.py's create_all is a
no-op once alembic has built the tables, so this revision is what
actually governs.
"""
from alembic import op
import sqlalchemy as sa

revision = 'e5f6a7b8c9d0'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_table('ai_suggestions')
    op.drop_table('daily_reflections')


def downgrade():
    # Column shapes copied from a1b2c3d4e5f6 so a rollback restores the
    # schema exactly rather than an approximation of it.
    op.create_table(
        'daily_reflections',
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

    op.create_table(
        'ai_suggestions',
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