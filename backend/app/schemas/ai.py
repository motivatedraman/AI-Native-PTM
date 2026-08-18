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

# ─── V2 Schemas ───────────────────────────────

class AIDecomposeRequest(BaseModel):
    task_id: int

class AIDecomposeSubtask(BaseModel):
    title: str
    estimated_minutes: Optional[int] = None

class AIDecomposeResponse(BaseModel):
    task_id: int
    subtasks: List[AIDecomposeSubtask]
    reasoning: Optional[str] = None

class AIPlannerItem(BaseModel):
    time: str
    task_id: Optional[int] = None
    task_title: str
    duration_minutes: int
    type: str = "task"  # task, break
    note: Optional[str] = None

class AIPlannerResponse(BaseModel):
    items: List[AIPlannerItem]
    summary: str
    total_planned_minutes: int
    available_minutes: int
    overflow: bool = False
    overflow_message: Optional[str] = None

class AIWhatNowRecommendation(BaseModel):
    task_id: Optional[int] = None
    task_title: str
    reason: str
    duration_minutes: int
    urgency: str = "medium"

class AIWhatNowResponse(BaseModel):
    message: str
    recommendations: List[AIWhatNowRecommendation]
    available_minutes: int
    suggested_start_time: str

class AINLSearchRequest(BaseModel):
    query: str

class AINLSearchFilters(BaseModel):
    status: Optional[List[str]] = None
    priority: Optional[List[str]] = None
    category: Optional[List[str]] = None
    project_name: Optional[str] = None
    tag: Optional[str] = None
    due_before: Optional[str] = None
    due_after: Optional[str] = None
    completed: Optional[bool] = None
    search_keyword: Optional[str] = None

class AINLSearchResponse(BaseModel):
    filters: Dict[str, Any]
    explanation: str

class AIWeeklyReviewResponse(BaseModel):
    highlights: List[str]
    patterns: List[str]
    suggestions: List[str]
    completion_rate: int
    summary: str

class AIProjectSummaryResponse(BaseModel):
    summary: str
    blockers: List[str]
    next_actions: List[str]
    health: str  # on_track, at_risk, critical

class AIChatRequest(BaseModel):
    message: str

class AIChatResponse(BaseModel):
    answer: str
    actions: List[Dict[str, Any]] = []

class AISuggestionResponse(BaseModel):
    id: int
    suggestion_type: str
    title: str
    description: Optional[str] = None
    action_payload: Optional[Dict[str, Any]] = None
    task_id: Optional[int] = None
    project_id: Optional[int] = None
    is_dismissed: bool = False
    is_applied: bool = False

class AISuggestionCreateRequest(BaseModel):
    suggestion_type: str
    title: str
    description: Optional[str] = None
    action_payload: Optional[Dict[str, Any]] = None
    task_id: Optional[int] = None
    project_id: Optional[int] = None

class DailyReflectionRequest(BaseModel):
    content: str
    mood: Optional[str] = None

class DailyReflectionResponse(BaseModel):
    id: int
    reflection_date: str
    content: str
    mood: Optional[str] = None
    created_at: str

class UserSettingsResponse(BaseModel):
    available_start_hour: int
    available_end_hour: int
    timezone: str

class UserSettingsUpdateRequest(BaseModel):
    available_start_hour: Optional[int] = None
    available_end_hour: Optional[int] = None
    timezone: Optional[str] = None

class TaskDependencyRequest(BaseModel):
    depends_on_id: int

class TaskDependencyResponse(BaseModel):
    id: int
    task_id: int
    depends_on_id: int
    depends_on_title: Optional[str] = None
