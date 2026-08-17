from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#6366f1"
    category: Optional[str] = "General"

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    category: Optional[str] = None

class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime
    updated_at: datetime
    task_count: Optional[int] = 0
    completed_task_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)
