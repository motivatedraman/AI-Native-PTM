"""
Context Resolver — Gathers only relevant data for AI queries.

Instead of dumping the entire database to the AI, this service retrieves
only the information needed for each specific type of query.
"""
from datetime import datetime, timedelta, date, timezone
from typing import Optional, List, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc

from backend.app.models import Task, Project, Tag, ActivityLog, Subtask
from backend.app.models.task_dependency import TaskDependency
from backend.app.models.user_settings import UserSettings

NPT = timezone(timedelta(hours=5, minutes=45))


def _now_npt() -> datetime:
    return datetime.now(NPT)


def _today_npt() -> date:
    return _now_npt().date()


def _utc_now() -> datetime:
    return datetime.utcnow()


def _day_bounds_utc(day: date):
    """Return (start, end) datetime in UTC for a given NPT date."""
    start_npt = datetime.combine(day, datetime.min.time(), tzinfo=NPT)
    end_npt = datetime.combine(day, datetime.max.time(), tzinfo=NPT)
    return start_npt.astimezone(timezone.utc).replace(tzinfo=None), end_npt.astimezone(timezone.utc).replace(tzinfo=None)


def _get_user_settings(db: Session) -> UserSettings:
    settings = db.query(UserSettings).filter(UserSettings.user_key == "default").first()
    if not settings:
        settings = UserSettings(user_key="default")
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


class ContextResolver:
    """Builds focused context dictionaries for different AI query types."""

    def __init__(self, db: Session):
        self.db = db
        self.user_settings = _get_user_settings(db)
        self.today = _today_npt()
        self.now_npt = _now_npt()
        self.utc_now = _utc_now()

    def get_today_context(self) -> Dict[str, Any]:
        """Context for 'What should I do today / now?' queries."""
        day_start, day_end = _day_bounds_utc(self.today)

        # Today's tasks (due today)
        today_tasks = self.db.query(Task).filter(
            Task.due_date >= day_start,
            Task.due_date <= day_end,
            Task.status != "done"
        ).all()

        # Overdue tasks
        overdue_tasks = self.db.query(Task).filter(
            Task.due_date < self.utc_now,
            Task.due_date.isnot(None),
            Task.status != "done"
        ).order_by(Task.due_date.asc()).all()

        # Tasks due this week
        week_end = self.today + timedelta(days=(7 - self.today.weekday()))
        week_end_start, _ = _day_bounds_utc(week_end)
        upcoming_tasks = self.db.query(Task).filter(
            Task.due_date > self.utc_now,
            Task.due_date <= week_end_start,
            Task.status != "done"
        ).order_by(Task.due_date.asc()).all()

        # Tasks with no due date (floating)
        floating_tasks = self.db.query(Task).filter(
            Task.due_date.is_(None),
            Task.status.notin_(["done"])
        ).order_by(Task.created_at.desc()).limit(20).all()

        # Active projects summary
        projects = self.db.query(Project).all()
        project_summaries = []
        for p in projects:
            total = self.db.query(Task).filter(Task.project_id == p.id).count()
            done = self.db.query(Task).filter(Task.project_id == p.id, Task.status == "done").count()
            remaining = total - done
            if remaining > 0:
                project_summaries.append({
                    "name": p.name,
                    "total": total,
                    "done": done,
                    "remaining": remaining,
                })

        # Blocked tasks (dependencies not met)
        blocked_task_ids = []
        deps = self.db.query(TaskDependency).all()
        for dep in deps:
            blocking_task = self.db.query(Task).filter(Task.id == dep.depends_on_id).first()
            if blocking_task and blocking_task.status != "done":
                blocked_task_ids.append(dep.task_id)

        # Available time
        available_hours = self.user_settings.available_end_hour - self.user_settings.available_start_hour
        current_hour_npt = self.now_npt.hour
        remaining_hours_today = max(0, self.user_settings.available_end_hour - max(current_hour_npt, self.user_settings.available_start_hour))

        # Total estimated work
        all_pending = self.db.query(Task).filter(Task.status.notin_(["done"])).all()
        total_estimated_minutes = sum(t.estimated_minutes or 30 for t in all_pending)

        return {
            "current_time_npt": self.now_npt.strftime("%H:%M"),
            "today_date": self.today.isoformat(),
            "available_hours_today": remaining_hours_today,
            "total_available_hours": available_hours,
            "available_start": self.user_settings.available_start_hour,
            "available_end": self.user_settings.available_end_hour,
            "today_tasks": [self._task_summary(t) for t in today_tasks],
            "overdue_tasks": [self._task_summary(t) for t in overdue_tasks],
            "upcoming_tasks": [self._task_summary(t) for t in upcoming_tasks[:10]],
            "floating_tasks": [self._task_summary(t) for t in floating_tasks[:10]],
            "blocked_tasks": blocked_task_ids,
            "project_summaries": project_summaries,
            "total_estimated_minutes_pending": total_estimated_minutes,
        }

    def get_task_context(self, task_id: int) -> Dict[str, Any]:
        """Context for a specific task (for decomposition, enrichment)."""
        task = self.db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return {"error": "Task not found"}

        # Existing subtasks
        existing_subtasks = [
            {"title": s.title, "completed": s.is_completed}
            for s in task.subtasks
        ]

        # Dependencies
        deps = self.db.query(TaskDependency).filter(
            TaskDependency.task_id == task_id
        ).all()
        dependencies = []
        for d in deps:
            blocking = self.db.query(Task).filter(Task.id == d.depends_on_id).first()
            if blocking:
                dependencies.append({
                    "task_id": blocking.id,
                    "title": blocking.title,
                    "status": blocking.status
                })

        # Dependents (tasks that depend on this one)
        dependents = self.db.query(TaskDependency).filter(
            TaskDependency.depends_on_id == task_id
        ).all()
        dependent_tasks = []
        for d in dependents:
            blocked = self.db.query(Task).filter(Task.id == d.task_id).first()
            if blocked:
                dependent_tasks.append({
                    "task_id": blocked.id,
                    "title": blocked.title,
                    "status": blocked.status
                })

        # Sibling tasks in same project
        siblings = []
        if task.project_id:
            siblings = [
                self._task_summary(t)
                for t in self.db.query(Task).filter(
                    Task.project_id == task_id,
                    Task.id != task_id
                ).limit(10).all()
            ]

        return {
            "task": self._task_detail(task),
            "existing_subtasks": existing_subtasks,
            "dependencies": dependencies,
            "dependent_tasks": dependent_tasks,
            "sibling_tasks": siblings,
        }

    def get_search_context(self) -> Dict[str, Any]:
        """Context for natural language search queries."""
        all_tasks = self.db.query(Task).filter(Task.status != "done").order_by(Task.due_date.asc().nullslast()).limit(100).all()
        projects = self.db.query(Project).all()
        tags = self.db.query(Tag).all()

        return {
            "tasks": [self._task_summary(t) for t in all_tasks],
            "projects": [{"id": p.id, "name": p.name, "category": p.category} for p in projects],
            "tags": [{"id": t.id, "name": t.name} for t in tags],
            "valid_statuses": ["inbox", "planned", "doing", "done"],
            "valid_priorities": ["low", "medium", "high", "urgent"],
            "valid_categories": ["Personal", "University", "Work", "Project", "Other"],
        }

    def get_weekly_context(self) -> Dict[str, Any]:
        """Context for weekly review."""
        week_start = self.today - timedelta(days=self.today.weekday())
        week_end = week_start + timedelta(days=6)
        ws_start, _ = _day_bounds_utc(week_start)
        _, we_end = _day_bounds_utc(week_end)

        # Completed this week
        completed = self.db.query(Task).filter(
            Task.completed_at >= ws_start,
            Task.completed_at <= we_end
        ).all()

        # Incomplete tasks
        incomplete = self.db.query(Task).filter(
            Task.status != "done",
        ).all()

        # Overdue
        overdue = self.db.query(Task).filter(
            Task.due_date < self.utc_now,
            Task.due_date.isnot(None),
            Task.status != "done"
        ).all()

        # Activity this week
        activities = self.db.query(ActivityLog).filter(
            ActivityLog.created_at >= ws_start,
            ActivityLog.created_at <= we_end
        ).all()

        # Postponed tasks (moved from doing/planned back to inbox or re-opened)
        reopened = [a for a in activities if a.action_type == "task_reopened"]

        # Category breakdown
        completed_by_category = {}
        for t in completed:
            cat = t.category
            completed_by_category[cat] = completed_by_category.get(cat, 0) + 1

        incomplete_by_category = {}
        for t in incomplete:
            cat = t.category
            incomplete_by_category[cat] = incomplete_by_category.get(cat, 0) + 1

        return {
            "week_start": week_start.isoformat(),
            "week_end": week_end.isoformat(),
            "completed_count": len(completed),
            "completed_tasks": [self._task_detail(t) for t in completed],
            "incomplete_count": len(incomplete),
            "incomplete_tasks": [self._task_summary(t) for t in incomplete[:20]],
            "overdue_count": len(overdue),
            "overdue_tasks": [self._task_summary(t) for t in overdue],
            "reopened_count": len(reopened),
            "completed_by_category": completed_by_category,
            "incomplete_by_category": incomplete_by_category,
            "total_activity_count": len(activities),
        }

    def get_project_context(self, project_id: int) -> Dict[str, Any]:
        """Context for project intelligence."""
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return {"error": "Project not found"}

        all_tasks = self.db.query(Task).filter(Task.project_id == project_id).all()
        completed = [t for t in all_tasks if t.status == "done"]
        remaining = [t for t in all_tasks if t.status != "done"]
        overdue = [t for t in remaining if t.due_date and t.due_date < self.utc_now]

        # Blocked tasks
        blocked = []
        for t in remaining:
            deps = self.db.query(TaskDependency).filter(TaskDependency.task_id == t.id).all()
            for d in deps:
                blocking = self.db.query(Task).filter(Task.id == d.depends_on_id).first()
                if blocking and blocking.status != "done":
                    blocked.append({
                        "task": self._task_summary(t),
                        "blocked_by": blocking.title
                    })

        return {
            "project": {
                "id": project.id,
                "name": project.name,
                "description": project.description,
                "category": project.category,
            },
            "total_tasks": len(all_tasks),
            "completed_count": len(completed),
            "remaining_count": len(remaining),
            "overdue_count": len(overdue),
            "progress_pct": round(len(completed) / len(all_tasks) * 100) if all_tasks else 0,
            "remaining_tasks": [self._task_summary(t) for t in remaining],
            "overdue_tasks": [self._task_summary(t) for t in overdue],
            "blocked_tasks": blocked,
        }

    def _task_summary(self, task: Task) -> Dict[str, Any]:
        return {
            "id": task.id,
            "title": task.title,
            "status": task.status,
            "priority": task.priority,
            "category": task.category,
            "due_date": task.due_date.isoformat() if task.due_date else None,
            "estimated_minutes": task.estimated_minutes,
            "project_id": task.project_id,
        }

    def _task_detail(self, task: Task) -> Dict[str, Any]:
        return {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "status": task.status,
            "priority": task.priority,
            "category": task.category,
            "due_date": task.due_date.isoformat() if task.due_date else None,
            "estimated_minutes": task.estimated_minutes,
            "project_id": task.project_id,
            "subtask_count": len(task.subtasks),
            "completed_subtasks": sum(1 for s in task.subtasks if s.is_completed),
            "created_at": task.created_at.isoformat() if task.created_at else None,
        }
