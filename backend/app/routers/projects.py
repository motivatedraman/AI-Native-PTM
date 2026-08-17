from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

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
    res = []
    for p in projects:
        total = db.query(func.count(Task.id)).filter(Task.project_id == p.id).scalar() or 0
        done = db.query(func.count(Task.id)).filter(Task.project_id == p.id, Task.status == "done").scalar() or 0
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
    existing = db.query(Project).filter(Project.name.ilike(project_in.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Project with this name already exists")

    project = Project(
        name=project_in.name,
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
    db.delete(project)
    db.commit()
    log_activity(db, action_type="project_deleted", description=f"Deleted project '{name}'")
    return None
