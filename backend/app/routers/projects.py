from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from backend.app.database import get_db
from backend.app.models import Project, Task
from backend.app.schemas import ProjectCreate, ProjectUpdate, ProjectResponse
from backend.app.services import log_activity

router = APIRouter(prefix="/api/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectResponse])
def get_projects(
    category: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db)
):
    query = db.query(Project)
    if category:
        query = query.filter(Project.category.ilike(category))

    projects = query.all()

    # Both counts in one grouped aggregate instead of two COUNT queries
    # per project (which was 1 + 2N round-trips for N projects).
    rows = (
        db.query(
            Task.project_id,
            func.count(Task.id),
            func.sum(case((Task.status == "done", 1), else_=0)),
        )
        .filter(Task.project_id.in_([p.id for p in projects]))
        .group_by(Task.project_id)
        .all()
    ) if projects else []
    counts = {pid: (total, done or 0) for pid, total, done in rows}

    res = []
    for p in projects:
        total, done = counts.get(p.id, (0, 0))
        res.append(ProjectResponse(
            id=p.id,
            name=p.name,
            description=p.description,
            color=p.color,
            category=p.category,
            created_at=p.created_at,
            updated_at=p.updated_at,
            task_count=total,
            completed_task_count=done
        ))
    return res

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(project_in: ProjectCreate, db: Session = Depends(get_db)):
    # Trim before the duplicate check, not after. Otherwise " Books" and
    # "Books" are different keys in the DB and both get created, while the
    # user sees them as the same name in a list and cannot tell which is
    # which. The UI trims too; this is the guarantee, not a convenience.
    name = project_in.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Project name cannot be empty")

    existing = db.query(Project).filter(Project.name.ilike(name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Project with this name already exists")

    project = Project(
        name=name,
        description=project_in.description,
        color=project_in.color or "#6366f1",
        category=project_in.category or "General"
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    log_activity(db, action_type="project_created", description=f"Created project '{project.name}'")

    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        color=project.color,
        category=project.category,
        created_at=project.created_at,
        updated_at=project.updated_at,
        task_count=0,
        completed_task_count=0
    )

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    total = db.query(func.count(Task.id)).filter(Task.project_id == project.id).scalar() or 0
    done = db.query(func.count(Task.id)).filter(Task.project_id == project.id, Task.status == "done").scalar() or 0

    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        color=project.color,
        category=project.category,
        created_at=project.created_at,
        updated_at=project.updated_at,
        task_count=total,
        completed_task_count=done
    )

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    name = project.name

    # Unlink tasks instead of deleting them (matches the UI promise:
    # "Tasks will be unlinked but not deleted"). Bulk update bypasses the
    # delete-orphan cascade on Project.tasks.
    db.query(Task).filter(Task.project_id == project_id).update({"project_id": None}, synchronize_session=False)

    db.delete(project)
    db.commit()
    log_activity(db, action_type="project_deleted", description=f"Deleted project '{name}'")
    return None
