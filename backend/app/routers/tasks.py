from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from backend.app.database import get_db
from backend.app.models import Task, Project, Tag, Subtask
from backend.app.schemas import (
    TaskCreate, TaskUpdate, TaskResponse, TaskQuickAdd,
    SubtaskCreate, SubtaskUpdate, SubtaskResponse
)
from backend.app.services import log_activity, ai_service

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])

@router.get("", response_model=List[TaskResponse])
def get_tasks(
    status: Optional[str] = Query(None, description="Filter by status: inbox, planned, doing, done"),
    category: Optional[str] = Query(None, description="Filter by category"),
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    tag: Optional[str] = Query(None, description="Filter by tag name"),
    search: Optional[str] = Query(None, description="Search keyword in title/description"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(Task)
    
    if status:
        query = query.filter(Task.status == status)
    if category:
        query = query.filter(Task.category.ilike(category))
    if project_id is not None:
        query = query.filter(Task.project_id == project_id)
    if priority:
        query = query.filter(Task.priority == priority)
    if tag:
        query = query.filter(Task.tags.any(Tag.name.ilike(tag)))
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(or_(Task.title.ilike(search_fmt), Task.description.ilike(search_fmt)))

    # Order: Priority/Due date hierarchy
    tasks = query.order_by(Task.due_date.asc().nullslast(), desc(Task.created_at)).offset(offset).limit(limit).all()
    return tasks

@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(task_in: TaskCreate, db: Session = Depends(get_db)):
    if task_in.due_date and task_in.due_date < datetime.utcnow() - timedelta(minutes=5):
        raise HTTPException(status_code=400, detail="Due date cannot be set in the past")

    task = Task(
        title=task_in.title,
        description=task_in.description,
        status=task_in.status or "inbox",
        priority=task_in.priority or "medium",
        due_date=task_in.due_date,
        estimated_minutes=task_in.estimated_minutes,
        category=task_in.category or "Personal",
        project_id=task_in.project_id,
        parent_task_id=task_in.parent_task_id,
        created_at=datetime.utcnow()
    )

    # Attach tags if any
    if task_in.tag_ids:
        tags = db.query(Tag).filter(Tag.id.in_(task_in.tag_ids)).all()
        task.tags.extend(tags)

    db.add(task)
    db.flush()

    # Add initial subtasks if any
    if task_in.initial_subtasks:
        for idx, sub_title in enumerate(task_in.initial_subtasks, start=1):
            sub = Subtask(task_id=task.id, title=sub_title, order=idx)
            db.add(sub)

    db.commit()
    db.refresh(task)

    # Log activity
    log_activity(db, action_type="task_created", description=f"Created task '{task.title}'", task_id=task.id)

    return task

@router.post("/quick-add", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def quick_add_task(payload: TaskQuickAdd, db: Session = Depends(get_db)):
    """Fast-capture natural language entry."""
    raw_text = payload.raw_text.strip()
    if not raw_text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    parsed = await ai_service.parse_task(raw_text)

    # Resolve project if suggested
    project_id = None
    if parsed.suggested_project:
        project = db.query(Project).filter(Project.name.ilike(parsed.suggested_project)).first()
        if project:
            project_id = project.id

    due_dt = None
    if parsed.due_date_iso:
        try:
            due_dt = datetime.fromisoformat(parsed.due_date_iso)
        except Exception:
            pass

    task = Task(
        title=parsed.title,
        status="inbox",
        priority=parsed.priority or "medium",
        due_date=due_dt,
        estimated_minutes=parsed.estimated_minutes,
        category=parsed.category or "Personal",
        project_id=project_id,
        created_at=datetime.utcnow(),
        ai_metadata={
            "raw_input": raw_text,
            "confidence": parsed.confidence,
            "reasoning": parsed.reasoning,
            "suggested_tags": parsed.suggested_tags
        }
    )

    db.add(task)
    db.flush()

    # Link tags matching suggested_tags
    if parsed.suggested_tags:
        for t_name in parsed.suggested_tags:
            tag = db.query(Tag).filter(Tag.name.ilike(t_name)).first()
            if not tag:
                tag = Tag(name=t_name)
                db.add(tag)
                db.flush()
            task.tags.append(tag)

    db.commit()
    db.refresh(task)

    log_activity(db, action_type="task_created", description=f"Quick-captured task '{task.title}'", task_id=task.id)
    return task

@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task_update: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    old_status = task.status
    update_data = task_update.model_dump(exclude_unset=True)

    if "due_date" in update_data and update_data["due_date"]:
        if update_data["due_date"] < datetime.utcnow() - timedelta(minutes=5):
            raise HTTPException(status_code=400, detail="Due date cannot be set in the past")

    # Handle tag_ids specially
    if "tag_ids" in update_data:
        tag_ids = update_data.pop("tag_ids")
        if tag_ids is not None:
            tags = db.query(Tag).filter(Tag.id.in_(tag_ids)).all()
            task.tags = tags

    # Apply updates
    for field, value in update_data.items():
        setattr(task, field, value)

    # If status changed
    if task.status != old_status:
        if task.status == "done":
            task.completed_at = datetime.utcnow()
            log_activity(
                db, action_type="task_completed",
                description=f"Completed task '{task.title}'",
                task_id=task.id,
                details={"from_status": old_status, "to_status": task.status}
            )
        else:
            task.completed_at = None
            log_activity(
                db, action_type="task_moved",
                description=f"Moved '{task.title}' from {old_status.upper()} to {task.status.upper()}",
                task_id=task.id,
                details={"from_status": old_status, "to_status": task.status}
            )
    else:
        log_activity(db, action_type="task_edited", description=f"Updated details for '{task.title}'", task_id=task.id)

    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return task

@router.post("/{task_id}/complete", response_model=TaskResponse)
def complete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    old_status = task.status
    task.status = "done"
    task.completed_at = datetime.utcnow()
    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)

    log_activity(
        db, action_type="task_completed",
        description=f"Completed task '{task.title}'",
        task_id=task.id,
        details={"from_status": old_status, "to_status": "done"}
    )
    return task

@router.post("/{task_id}/reopen", response_model=TaskResponse)
def reopen_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = "planned"
    task.completed_at = None
    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)

    log_activity(db, action_type="task_reopened", description=f"Reopened task '{task.title}'", task_id=task.id)
    return task

@router.post("/{task_id}/log-time", response_model=TaskResponse)
def log_task_time(task_id: int, minutes: int = Query(..., ge=1, le=1440), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.spent_minutes = (task.spent_minutes or 0) + minutes
    task.updated_at = datetime.utcnow()

    log_activity(
        db, action_type="time_logged",
        description=f"Worked {minutes}m on '{task.title}' ({task.spent_minutes}/{task.estimated_minutes or '?'}m)",
        task_id=task.id,
        details={"minutes_logged": minutes, "total_spent": task.spent_minutes}
    )

    db.commit()
    db.refresh(task)
    return task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    title = task.title
    db.delete(task)
    db.commit()

    log_activity(db, action_type="task_deleted", description=f"Deleted task '{title}'")
    return None

# Subtask Endpoints
@router.post("/{task_id}/subtasks", response_model=SubtaskResponse, status_code=status.HTTP_201_CREATED)
def add_subtask(task_id: int, sub_in: SubtaskCreate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    subtask = Subtask(
        task_id=task.id,
        title=sub_in.title,
        is_completed=sub_in.is_completed or False,
        order=sub_in.order or (len(task.subtasks) + 1)
    )
    db.add(subtask)
    db.commit()
    db.refresh(subtask)
    return subtask

@router.patch("/{task_id}/subtasks/{subtask_id}", response_model=SubtaskResponse)
def update_subtask(task_id: int, subtask_id: int, sub_up: SubtaskUpdate, db: Session = Depends(get_db)):
    subtask = db.query(Subtask).filter(Subtask.id == subtask_id, Subtask.task_id == task_id).first()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")

    data = sub_up.model_dump(exclude_unset=True)
    for field, val in data.items():
        setattr(subtask, field, val)

    db.commit()
    db.refresh(subtask)
    return subtask

@router.delete("/{task_id}/subtasks/{subtask_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subtask(task_id: int, subtask_id: int, db: Session = Depends(get_db)):
    subtask = db.query(Subtask).filter(Subtask.id == subtask_id, Subtask.task_id == task_id).first()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")

    db.delete(subtask)
    db.commit()
    return None
