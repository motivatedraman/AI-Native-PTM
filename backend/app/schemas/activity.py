from datetime import datetime
from typing import Optional, Any, Dict, List
from pydantic import BaseModel, ConfigDict

class ActivityLogResponse(BaseModel):
    id: int
    task_id: Optional[int] = None
    action_type: str
    description: str
    details: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DailyLogGroup(BaseModel):
    date: str
    completed_tasks: List[Any] = []
    worked_on_tasks: List[Any] = []
    created_tasks: List[Any] = []
    activities: List[ActivityLogResponse] = []
    ai_summary: Optional[str] = None
