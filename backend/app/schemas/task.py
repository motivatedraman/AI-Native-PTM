from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, ConfigDict, Field
from backend.app.schemas.project import ProjectResponse
from backend.app.schemas.tag import TagResponse
from backend.app.schemas.subtask import SubtaskResponse

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "inbox"  # inbox, planned, doing, done
    priority: Optional[str] = "medium"  # low, medium, high, urgent
    due_date: Optional[datetime] = None
    estimated_minutes: Optional[int] = None
    category: Optional[str] = "Personal"  # Personal, University, Work, Project, Other
    project_id: Optional[int] = None
    parent_task_id: Optional[int] = None

class TaskCreate(TaskBase):
    tag_ids: Optional[List[int]] = Field(default_factory=list)
    initial_subtasks: Optional[List[str]] = Field(default_factory=list)

class TaskQuickAdd(BaseModel):
    raw_text: str
    auto_enrich: Optional[bool] = True

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    estimated_minutes: Optional[int] = None
    category: Optional[str] = None
    project_id: Optional[int] = None
    parent_task_id: Optional[int] = None
    ai_metadata: Optional[Dict[str, Any]] = None
    tag_ids: Optional[List[int]] = None

class TaskResponse(TaskBase):
    id: int
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    ai_metadata: Optional[Dict[str, Any]] = None
    project: Optional[ProjectResponse] = None
    tags: List[TagResponse] = Field(default_factory=list)
    subtasks: List[SubtaskResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
