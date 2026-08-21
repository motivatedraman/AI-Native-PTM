from datetime import datetime, date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from backend.app.database import get_db
from backend.app.models import ActivityLog, Task
from backend.app.schemas import ActivityLogResponse, DailyLogGroup, TaskResponse
from backend.app.services import ai_service
from backend.app.services.npt import today_npt, day_bounds_utc

router = APIRouter(prefix="/api", tags=["Activity & Daily Log"])

@router.get("/activity", response_model=List[ActivityLogResponse])
def get_recent_activity(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    activities = db.query(ActivityLog).order_by(desc(ActivityLog.created_at)).limit(limit).all()
    return activities

@router.get("/daily-log", response_model=DailyLogGroup)
async def get_daily_log(
    target_date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format, defaults to today"),
    db: Session = Depends(get_db)
):
    if target_date:
        try:
            day = datetime.strptime(target_date, "%Y-%m-%d").date()
        except ValueError:
            day = today_npt()
    else:
        day = today_npt()

    day_start, day_end = day_bounds_utc(day)

    # Completed tasks on this day
    completed_tasks = db.query(Task).filter(
        Task.completed_at >= day_start,
        Task.completed_at <= day_end
    ).all()

    # Tasks worked on or moved on this day
    worked_on_task_ids = db.query(ActivityLog.task_id).filter(
        ActivityLog.created_at >= day_start,
        ActivityLog.created_at <= day_end,
        ActivityLog.task_id.isnot(None),
        ActivityLog.action_type.in_(["task_moved", "task_edited", "task_reopened"])
    ).distinct().all()
    worked_ids = [t[0] for t in worked_on_task_ids if t[0] is not None]
    
    worked_on_tasks = db.query(Task).filter(Task.id.in_(worked_ids)).all() if worked_ids else []

    # Tasks created on this day
    created_tasks = db.query(Task).filter(
        Task.created_at >= day_start,
        Task.created_at <= day_end
    ).all()

    # Activity timeline for the day
    activities = db.query(ActivityLog).filter(
        ActivityLog.created_at >= day_start,
        ActivityLog.created_at <= day_end
    ).order_by(desc(ActivityLog.created_at)).all()

    # Generate AI summary
    comp_titles = [t.title for t in completed_tasks]
    act_descs = [a.description for a in activities]
    ai_summary = await ai_service.generate_daily_summary(
        date_str=day.strftime("%B %d, %Y"),
        completed_titles=comp_titles,
        activity_descriptions=act_descs
    )

    return DailyLogGroup(
        date=day.isoformat(),
        completed_tasks=[TaskResponse.model_validate(t) for t in completed_tasks],
        worked_on_tasks=[TaskResponse.model_validate(t) for t in worked_on_tasks],
        created_tasks=[TaskResponse.model_validate(t) for t in created_tasks],
        activities=[ActivityLogResponse.model_validate(a) for a in activities],
        ai_summary=ai_summary
    )
