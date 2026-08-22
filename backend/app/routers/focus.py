from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database import get_db
from backend.app.models import Task, FocusSession
from backend.app.schemas import FocusSessionCreate, FocusSessionUpdate, FocusSessionResponse
from backend.app.services import log_activity

router = APIRouter(prefix="/api/focus", tags=["Focus"])


@router.post("/sessions", response_model=FocusSessionResponse, status_code=status.HTTP_201_CREATED)
def start_focus_session(payload: FocusSessionCreate, db: Session = Depends(get_db)):
    """Start a new focus timer session, optionally bound to a task."""
    task = None
    if payload.task_id is not None:
        task = db.query(Task).filter(Task.id == payload.task_id).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

    session = FocusSession(
        task_id=payload.task_id,
        planned_minutes=payload.planned_minutes,
        status="active",
        started_at=datetime.utcnow()
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    if task:
        # Nudge the task into the doing state when a focus session begins on it
        if task.status not in ("done", "doing"):
            task.status = "doing"
            task.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(session)

        log_activity(
            db, action_type="focus_started",
            description=f"Started a {payload.planned_minutes}m focus session on '{task.title}'",
            task_id=task.id,
            details={"focus_session_id": session.id, "planned_minutes": payload.planned_minutes}
        )
    else:
        log_activity(
            db, action_type="focus_started",
            description=f"Started a {payload.planned_minutes}m focus session",
            details={"focus_session_id": session.id, "planned_minutes": payload.planned_minutes}
        )

    return session


@router.patch("/sessions/{session_id}", response_model=FocusSessionResponse)
def end_focus_session(session_id: int, payload: FocusSessionUpdate, db: Session = Depends(get_db)):
    """End a focus session: records actual minutes and logs them against the task."""
    session = db.query(FocusSession).filter(FocusSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Focus session not found")
    if session.status != "active":
        raise HTTPException(status_code=400, detail="Focus session already ended")

    data = payload.model_dump(exclude_unset=True)

    actual_minutes = data.get("actual_minutes")
    final_status = data.get("status") or "completed"

    session.actual_minutes = actual_minutes if actual_minutes is not None else 0
    session.status = final_status
    session.break_taken = bool(data.get("break_taken", False))
    session.ended_at = datetime.utcnow()

    logged_task: Optional[Task] = None
    if session.task_id:
        task = db.query(Task).filter(Task.id == session.task_id).first()
        if task:
            logged_task = task
            if session.actual_minutes > 0:
                task.spent_minutes = (task.spent_minutes or 0) + session.actual_minutes
                task.updated_at = datetime.utcnow()

    db.commit()

    if logged_task:
        log_activity(
            db, action_type="focus_completed",
            description=f"Focus session ended: {session.actual_minutes}m logged to '{logged_task.title}' ({final_status})",
            task_id=logged_task.id,
            details={
                "focus_session_id": session.id,
                "planned_minutes": session.planned_minutes,
                "actual_minutes": session.actual_minutes,
                "final_status": final_status,
                "break_taken": session.break_taken
            }
        )

    db.refresh(session)
    return session


@router.get("/sessions", response_model=List[FocusSessionResponse])
def list_focus_sessions(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Recent focus sessions, newest first."""
    sessions = (
        db.query(FocusSession)
        .order_by(desc(FocusSession.started_at))
        .limit(limit)
        .all()
    )
    return sessions
