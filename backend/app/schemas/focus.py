from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from backend.app.schemas.task import TaskResponse


class FocusSessionCreate(BaseModel):
    task_id: Optional[int] = None
    planned_minutes: int = Field(..., ge=1, le=600, description="Planned focus duration in minutes")


class FocusSessionUpdate(BaseModel):
    actual_minutes: Optional[int] = Field(None, ge=0, le=1440)
    status: Optional[str] = Field(None, pattern="^(completed|abandoned)$")
    break_taken: Optional[bool] = None


class FocusSessionResponse(BaseModel):
    id: int
    task_id: Optional[int] = None
    planned_minutes: int
    actual_minutes: Optional[int] = None
    status: str
    break_taken: bool
    started_at: datetime
    ended_at: Optional[datetime] = None
    task: Optional[TaskResponse] = None

    model_config = ConfigDict(from_attributes=True)
