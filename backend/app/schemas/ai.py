from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class AITaskParseRequest(BaseModel):
    text: str

class AITaskParseResult(BaseModel):
    title: str
    category: Optional[str] = "Personal"
    priority: Optional[str] = "medium"
    due_date_str: Optional[str] = None
    due_date_iso: Optional[str] = None
    estimated_minutes: Optional[int] = None
    suggested_project: Optional[str] = None
    suggested_tags: List[str] = []
    confidence: float = 0.0
    reasoning: Optional[str] = None

class AITaskEnrichResponse(BaseModel):
    category: Optional[str] = None
    priority: Optional[str] = None
    due_date_iso: Optional[str] = None
    estimated_minutes: Optional[int] = None
    suggested_project: Optional[str] = None
    suggested_tags: List[str] = []
    subtasks: List[str] = []
    notes: Optional[str] = None

class AISubtaskSuggestResponse(BaseModel):
    task_id: int
    suggested_subtasks: List[str]

class AIDailySummaryRequest(BaseModel):
    date: str

class AIDailySummaryResponse(BaseModel):
    date: str
    summary: str
    highlights: List[str] = []

class AIStatusResponse(BaseModel):
    is_configured: bool
    provider: str
    model: str
    is_healthy: bool
    message: str
