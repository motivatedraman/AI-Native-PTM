#!/usr/bin/env python3
"""Database seed script for AI-Native Personal Task Manager.
Initializes default settings, projects, and tags if not already present.
"""
import os
import sys

# Ensure root is on path
_project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from sqlalchemy.orm import Session
from backend.app.database import engine, Base, SessionLocal
from backend.app.models import (
    Project, Tag, Subtask, ActivityLog, Task,
    TaskDependency, DailyReflection, UserSettings, AISuggestion
)


def seed():
    print("==> Initializing and verifying database schema...")
    Base.metadata.create_all(bind=engine)

    # Check missing columns
    from sqlalchemy import text, inspect
    try:
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        is_sqlite = str(engine.url).startswith("sqlite")

        column_migrations = {
            "tasks": [
                ("spent_minutes", "INTEGER DEFAULT 0 NOT NULL", "INTEGER DEFAULT 0"),
            ],
            "user_settings": [
                ("daily_chunks", "JSON", "JSON"),
            ],
        }

        with engine.connect() as conn:
            for table_name, cols in column_migrations.items():
                if table_name in existing_tables:
                    existing_cols = {c["name"] for c in inspector.get_columns(table_name)}
                    for col_name, sqlite_type, pg_type in cols:
                        if col_name not in existing_cols:
                            col_type = sqlite_type if is_sqlite else pg_type
                            conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}"))
                            conn.commit()
                            print(f"[Seed] Added missing column: {table_name}.{col_name}")
    except Exception as ex:
        print(f"[Seed] Warning during column verification: {ex}")

    db: Session = SessionLocal()
    try:
        # 1. Default User Settings
        settings = db.query(UserSettings).filter(UserSettings.user_key == "default").first()
        if not settings:
            settings = UserSettings(
                user_key="default",
                available_start_hour=6,
                available_end_hour=22,
                timezone="Asia/Kathmandu",
            )
            db.add(settings)
            print("[Seed] Created default user settings.")

        # 2. Default Tags
        default_tags = [
            ("Homework", "#3b82f6"),
            ("Coding", "#10b981"),
            ("Work", "#f59e0b"),
            ("Shopping", "#ec4899"),
            ("Health", "#8b5cf6"),
            ("Urgent", "#ef4444"),
            ("Reading", "#06b6d4"),
        ]
        for tag_name, color in default_tags:
            tag = db.query(Tag).filter(Tag.name.ilike(tag_name)).first()
            if not tag:
                db.add(Tag(name=tag_name, color=color))
                print(f"[Seed] Created tag: {tag_name}")

        # 3. Default Projects
        default_projects = [
            ("DBMS", "Database Management Systems coursework and labs", "#3b82f6", "University"),
            ("Computer Networks", "Networking protocols and socket programming", "#06b6d4", "University"),
            ("Operating Systems", "OS concepts, processes, memory management", "#8b5cf6", "University"),
            ("Personal Task Engine", "AI-Native Personal Task Management application", "#10b981", "Project"),
        ]
        for proj_name, desc, color, cat in default_projects:
            proj = db.query(Project).filter(Project.name.ilike(proj_name)).first()
            if not proj:
                db.add(Project(name=proj_name, description=desc, color=color, category=cat))
                print(f"[Seed] Created project: {proj_name}")

        db.commit()
        print("[Seed] Database seed completed successfully.")

    except Exception as e:
        db.rollback()
        print(f"[Seed] Error during seeding: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed()
