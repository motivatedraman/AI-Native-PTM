import os
import sys
from pathlib import Path
from datetime import datetime, timedelta

root_dir = Path(__file__).resolve().parents[1]
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from backend.app.database import SessionLocal, Base, engine
from backend.app.models import Task, Project, Tag, Subtask, ActivityLog

def seed():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # Check if already seeded
        if db.query(Task).count() > 0:
            print("Database already contains data. Skipping seed.")
            return

        print("Seeding database with realistic initial data...")

        # 1. Projects
        p_dbms = Project(name="DBMS", description="Database Management Systems course & lab", color="#3b82f6", category="University")
        p_networks = Project(name="Computer Networks", description="Computer Networks assignments & projects", color="#10b981", category="University")
        p_ai = Project(name="Artificial Intelligence", description="AI concepts, lab work & presentations", color="#8b5cf6", category="University")
        p_os = Project(name="Operating Systems", description="OS kernels, threads & memory management", color="#f59e0b", category="University")
        p_fastapi = Project(name="Personal Task Engine", description="Full-stack AI task management web app", color="#06b6d4", category="Project")

        db.add_all([p_dbms, p_networks, p_ai, p_os, p_fastapi])
        db.flush()

        # 2. Tags
        t_urgent = Tag(name="Urgent", color="#ef4444")
        t_homework = Tag(name="Homework", color="#3b82f6")
        t_coding = Tag(name="Coding", color="#10b981")
        t_reading = Tag(name="Reading", color="#f59e0b")
        t_shopping = Tag(name="Shopping", color="#ec4899")

        db.add_all([t_urgent, t_homework, t_coding, t_reading, t_shopping])
        db.flush()

        now = datetime.utcnow()
        today = now.replace(hour=18, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)
        in_two_days = today + timedelta(days=2)
        yesterday = today - timedelta(days=1)

        # 3. Tasks
        task1 = Task(
            title="Finish DBMS assignment",
            description="Complete SQL schema design questions and normalization exercises (3NF & BCNF).",
            status="doing",
            priority="high",
            due_date=tomorrow,
            estimated_minutes=120,
            category="University",
            project_id=p_dbms.id,
            created_at=yesterday,
            ai_metadata={"confidence": 0.95, "suggested_category": "University", "parsed_entities": ["DBMS", "assignment", "2h"]}
        )
        task1.tags.extend([t_urgent, t_homework])

        task2 = Task(
            title="Fix FastAPI authentication",
            description="Implement JWT token validation and secure route dependencies.",
            status="done",
            priority="high",
            due_date=today,
            estimated_minutes=90,
            category="Project",
            project_id=p_fastapi.id,
            created_at=yesterday,
            completed_at=now - timedelta(hours=2),
            ai_metadata={"confidence": 0.98, "suggested_category": "Project"}
        )
        task2.tags.append(t_coding)

        task3 = Task(
            title="Read OS Chapter 4",
            description="Read chapter on Threads, Concurrency and multi-threading models.",
            status="planned",
            priority="medium",
            due_date=today,
            estimated_minutes=60,
            category="University",
            project_id=p_os.id,
            created_at=today - timedelta(hours=5),
            ai_metadata={"confidence": 0.90, "suggested_category": "University"}
        )
        task3.tags.append(t_reading)

        task4 = Task(
            title="Buy HDMI cable",
            description="Need a 2m 4K HDMI 2.1 cable for external monitor setup.",
            status="inbox",
            priority="low",
            due_date=in_two_days,
            estimated_minutes=15,
            category="Personal",
            created_at=today - timedelta(hours=3),
            ai_metadata={"confidence": 0.85, "suggested_category": "Personal"}
        )
        task4.tags.append(t_shopping)

        task5 = Task(
            title="Prepare AI presentation",
            description="Create slides comparing Transformer attention mechanisms with state space models (Mamba).",
            status="planned",
            priority="high",
            due_date=now + timedelta(days=5),
            estimated_minutes=180,
            category="University",
            project_id=p_ai.id,
            created_at=yesterday,
            ai_metadata={"confidence": 0.96, "suggested_category": "University"}
        )
        task5.tags.extend([t_homework, t_urgent])

        task6 = Task(
            title="Study Computer Networks before Friday",
            description="Review TCP/IP handshake, congestion control, and subnetting.",
            status="doing",
            priority="medium",
            due_date=now + timedelta(days=4),
            estimated_minutes=150,
            category="University",
            project_id=p_networks.id,
            created_at=yesterday,
            ai_metadata={"confidence": 0.92, "suggested_category": "University"}
        )
        task6.tags.append(t_homework)

        db.add_all([task1, task2, task3, task4, task5, task6])
        db.flush()

        # 4. Subtasks for task1 (DBMS)
        sub1 = Subtask(task_id=task1.id, title="ER Diagram to Relational mapping", is_completed=True, order=1)
        sub2 = Subtask(task_id=task1.id, title="Write SQL DDL and Constraints", is_completed=True, order=2)
        sub3 = Subtask(task_id=task1.id, title="Normalize tables up to BCNF", is_completed=False, order=3)
        sub4 = Subtask(task_id=task1.id, title="Format final PDF report", is_completed=False, order=4)
        db.add_all([sub1, sub2, sub3, sub4])

        # 5. Activity Logs for Daily Log demonstration
        act1 = ActivityLog(
            task_id=task2.id,
            action_type="task_created",
            description="Created task 'Fix FastAPI authentication'",
            created_at=yesterday
        )
        act2 = ActivityLog(
            task_id=task2.id,
            action_type="task_moved",
            description="Moved 'Fix FastAPI authentication' to Doing",
            created_at=now - timedelta(hours=4),
            details={"from_status": "planned", "to_status": "doing"}
        )
        act3 = ActivityLog(
            task_id=task2.id,
            action_type="task_completed",
            description="Completed 'Fix FastAPI authentication'",
            created_at=now - timedelta(hours=2),
            details={"from_status": "doing", "to_status": "done"}
        )
        act4 = ActivityLog(
            task_id=task1.id,
            action_type="task_created",
            description="Created task 'Finish DBMS assignment'",
            created_at=yesterday
        )
        act5 = ActivityLog(
            task_id=task1.id,
            action_type="task_moved",
            description="Started work on 'Finish DBMS assignment'",
            created_at=now - timedelta(hours=1),
            details={"from_status": "inbox", "to_status": "doing"}
        )
        db.add_all([act1, act2, act3, act4, act5])

        db.commit()
        print("Database seeded successfully with realistic tasks, projects, tags, subtasks, and activities.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()
