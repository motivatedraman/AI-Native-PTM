from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Task
from backend.app.models.task_dependency import TaskDependency
from backend.app.schemas import TaskDependencyRequest, TaskDependencyResponse

router = APIRouter(prefix="/api/tasks/{task_id}/dependencies", tags=["Task Dependencies"])


def _check_circular(db: Session, task_id: int, depends_on_id: int) -> bool:
    """Check if adding this dependency would create a cycle."""
    visited = set()
    queue = [depends_on_id]

    while queue:
        current = queue.pop(0)
        if current == task_id:
            return True  # Circular!
        if current in visited:
            continue
        visited.add(current)

        deps = db.query(TaskDependency).filter(TaskDependency.task_id == current).all()
        for d in deps:
            queue.append(d.depends_on_id)

    return False


@router.get("", response_model=List[TaskDependencyResponse])
def list_dependencies(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    deps = db.query(TaskDependency).filter(TaskDependency.task_id == task_id).all()
    result = []
    for d in deps:
        blocking = db.query(Task).filter(Task.id == d.depends_on_id).first()
        result.append(TaskDependencyResponse(
            id=d.id,
            task_id=d.task_id,
            depends_on_id=d.depends_on_id,
            depends_on_title=blocking.title if blocking else None
        ))
    return result


@router.post("", response_model=TaskDependencyResponse, status_code=status.HTTP_201_CREATED)
def add_dependency(task_id: int, payload: TaskDependencyRequest, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    blocking_task = db.query(Task).filter(Task.id == payload.depends_on_id).first()
    if not blocking_task:
        raise HTTPException(status_code=404, detail="Blocking task not found")

    if task_id == payload.depends_on_id:
        raise HTTPException(status_code=400, detail="Task cannot depend on itself")

    # Check existing
    existing = db.query(TaskDependency).filter(
        TaskDependency.task_id == task_id,
        TaskDependency.depends_on_id == payload.depends_on_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Dependency already exists")

    # Check circular
    if _check_circular(db, task_id, payload.depends_on_id):
        raise HTTPException(status_code=400, detail="Adding this dependency would create a circular reference")

    dep = TaskDependency(task_id=task_id, depends_on_id=payload.depends_on_id)
    db.add(dep)
    db.commit()
    db.refresh(dep)

    return TaskDependencyResponse(
        id=dep.id,
        task_id=dep.task_id,
        depends_on_id=dep.depends_on_id,
        depends_on_title=blocking_task.title
    )


@router.delete("/{dependency_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_dependency(task_id: int, dependency_id: int, db: Session = Depends(get_db)):
    dep = db.query(TaskDependency).filter(
        TaskDependency.id == dependency_id,
        TaskDependency.task_id == task_id
    ).first()
    if not dep:
        raise HTTPException(status_code=404, detail="Dependency not found")

    db.delete(dep)
    db.commit()
    return None
