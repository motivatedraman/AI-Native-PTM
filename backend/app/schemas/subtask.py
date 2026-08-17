from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class SubtaskBase(BaseModel):
    title: str
    is_completed: Optional[bool] = False
    order: Optional[int] = 0

class SubtaskCreate(SubtaskBase):
    pass

class SubtaskUpdate(BaseModel):
    title: Optional[str] = None
    is_completed: Optional[bool] = None
    order: Optional[int] = None

class SubtaskResponse(SubtaskBase):
    id: int
    task_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
