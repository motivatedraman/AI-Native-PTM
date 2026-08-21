from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime

from backend.app.database import get_db
from backend.app.models import Task, Project, Tag
from backend.app.schemas import (
    AITaskParseRequest, AITaskParseResult, AITaskEnrichResponse,
    AISubtaskSuggestResponse, AIStatusResponse,
    AIDecomposeRequest, AIDecomposeResponse,
    AIPlannerResponse, AIPlannerRequest,
    AIWhatNowResponse,
    AINLSearchRequest, AINLSearchResponse,
    AIWeeklyReviewResponse, AIProjectSummaryResponse,
    AIChatRequest, AIChatResponse,
    TaskResponse
)
from backend.app.services import ai_service
from backend.app.services.context_resolver import ContextResolver
from backend.app.services.npt import day_bounds_utc

router = APIRouter(prefix="/api/ai", tags=["AI Integration"])


# ─── V1 Endpoints (preserved) ─────────────────

@router.get("/status", response_model=AIStatusResponse)
def get_ai_status():
    return ai_service.get_status()


@router.get("/test")
async def test_ai_connection():
    """Test AI connection with a simple prompt. Returns model info and response."""
    import time
    start = time.time()
    try:
        result = await ai_service._call_ai(
            "Reply with exactly: {\"status\": \"ok\", \"model\": \"\" + "
            "your model name}",
            expect_json=True
        )
        elapsed = round(time.time() - start, 2)
        if result:
            return {
                "status": "connected",
                "provider": ai_service.provider,
                "model": ai_service.model,
                "api_key_valid": True,
                "response_time_seconds": elapsed,
                "rate_limiter": {
                    "max_rpm": ai_service.rate_limiter.max_rpm,
                    "requests_in_window": len(ai_service.rate_limiter.timestamps),
                    "can_proceed": ai_service.rate_limiter.can_proceed(),
                },
                "message": f"AI connection successful! Model: {ai_service.model}, Response in {elapsed}s"
            }
        else:
            return {
                "status": "failed",
                "provider": ai_service.provider,
                "model": ai_service.model,
                "api_key_valid": bool(ai_service.api_key and len(ai_service.api_key) > 5),
                "last_error": ai_service._last_error,
                "rate_limiter": {
                    "max_rpm": ai_service.rate_limiter.max_rpm,
                    "requests_in_window": len(ai_service.rate_limiter.timestamps),
                },
                "message": f"AI call failed: {ai_service._last_error or 'unknown error'}. Heuristic fallback is active."
            }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "provider": ai_service.provider,
            "model": ai_service.model,
        }


@router.post("/parse-task", response_model=AITaskParseResult)
async def parse_natural_language_task(payload: AITaskParseRequest):
    return await ai_service.parse_task(payload.text, force_ai=payload.force_ai or False)


@router.post("/enrich-task/{task_id}", response_model=AITaskEnrichResponse)
async def enrich_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return await ai_service.enrich_task(title=task.title, description=task.description)


@router.post("/suggest-subtasks/{task_id}", response_model=AISubtaskSuggestResponse)
async def suggest_subtasks(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return await ai_service.suggest_subtasks(task_id=task.id, title=task.title)


# ─── V2: Task Decomposition (§2) ─────────────

@router.post("/decompose/{task_id}", response_model=AIDecomposeResponse)
async def decompose_task(task_id: int, db: Session = Depends(get_db)):
    """AI suggests subtask breakdown for a large task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    resolver = ContextResolver(db)
    task_ctx = resolver.get_task_context(task_id)

    return await ai_service.decompose_task(
        task_id=task.id,
        title=task.title,
        description=task.description,
        existing_subtasks=task_ctx.get("existing_subtasks", []),
        sibling_tasks=task_ctx.get("sibling_tasks", [])
    )


# ─── V2: Daily Planner (§3) ──────────────────

@router.post("/plan-my-day", response_model=AIPlannerResponse)
async def plan_my_day(payload: Optional[AIPlannerRequest] = None, db: Session = Depends(get_db)):
    """AI generates a realistic daily plan fitted into available time chunks."""
    resolver = ContextResolver(db)
    custom_chunks = [c.model_dump() for c in payload.chunks] if (payload and payload.chunks) else None
    context = resolver.get_today_context(custom_chunks=custom_chunks)
    return await ai_service.plan_my_day(context)


# ─── V2: What Should I Do Now? (§5) ──────────

@router.post("/what-should-i-do", response_model=AIWhatNowResponse)
async def what_should_i_do_now(db: Session = Depends(get_db)):
    """AI recommends what to focus on right now."""
    resolver = ContextResolver(db)
    context = resolver.get_today_context()
    return await ai_service.what_should_i_do_now(context)


# ─── V2: Natural Language Search (§10) ───────

@router.post("/search", response_model=AINLSearchResponse)
async def natural_language_search(payload: AINLSearchRequest, db: Session = Depends(get_db)):
    """Convert natural language query into structured filter."""
    resolver = ContextResolver(db)
    context = resolver.get_search_context()
    return await ai_service.natural_language_search(payload.query, context)


@router.post("/execute-search")
async def execute_nl_search(payload: AINLSearchRequest, db: Session = Depends(get_db)):
    """Natural language search that returns filtered tasks directly."""
    resolver = ContextResolver(db)
    search_ctx = resolver.get_search_context()
    nl_result = await ai_service.natural_language_search(payload.query, search_ctx)

    # Build query from filters
    query = db.query(Task)
    filters = nl_result.filters

    if filters.get("status"):
        query = query.filter(Task.status.in_(filters["status"]))
    if filters.get("priority"):
        query = query.filter(Task.priority.in_(filters["priority"]))
    if filters.get("category"):
        query = query.filter(Task.category.in_(filters["category"]))
    if filters.get("project_name"):
        project = db.query(Project).filter(Project.name.ilike(filters["project_name"])).first()
        if project:
            query = query.filter(Task.project_id == project.id)
    if filters.get("tag"):
        query = query.filter(Task.tags.any(Tag.name.ilike(filters["tag"])))
    if filters.get("search_keyword"):
        kw = f"%{filters['search_keyword']}%"
        from sqlalchemy import or_
        query = query.filter(or_(Task.title.ilike(kw), Task.description.ilike(kw)))
    if filters.get("completed") is True:
        query = query.filter(Task.status == "done")
    elif filters.get("completed") is False:
        query = query.filter(Task.status != "done")
    if filters.get("due_before"):
        try:
            dt = datetime.fromisoformat(filters["due_before"])
            query = query.filter(Task.due_date <= dt)
        except (ValueError, TypeError):
            pass
    if filters.get("due_after"):
        try:
            dt = datetime.fromisoformat(filters["due_after"])
            query = query.filter(Task.due_date >= dt)
        except (ValueError, TypeError):
            pass

    tasks = query.order_by(Task.due_date.asc().nullslast()).limit(50).all()

    return {
        "filters": filters,
        "explanation": nl_result.explanation,
        "results": [TaskResponse.model_validate(t).model_dump() for t in tasks],
        "count": len(tasks)
    }


# ─── V2: Weekly Review (§13) ─────────────────

@router.get("/weekly-review", response_model=AIWeeklyReviewResponse)
async def weekly_review(db: Session = Depends(get_db)):
    """Generate AI weekly review with patterns and suggestions."""
    resolver = ContextResolver(db)
    context = resolver.get_weekly_context()
    return await ai_service.generate_weekly_review(context)


# ─── V2: Project Summary (§15) ───────────────

@router.get("/project-summary/{project_id}", response_model=AIProjectSummaryResponse)
async def project_summary(project_id: int, db: Session = Depends(get_db)):
    """Generate AI project intelligence summary."""
    resolver = ContextResolver(db)
    context = resolver.get_project_context(project_id)
    if "error" in context:
        raise HTTPException(status_code=404, detail=context["error"])
    return await ai_service.generate_project_summary(context)


# ─── V2: Enhanced Daily Summary (§11) ────────

@router.get("/daily-summary/{date_str}")
async def enhanced_daily_summary(date_str: str, db: Session = Depends(get_db)):
    """Generate enhanced AI daily summary."""
    from backend.app.models import ActivityLog
    from backend.app.schemas import TaskResponse as TaskResp

    try:
        day = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    day_start, day_end = day_bounds_utc(day)

    completed_tasks = db.query(Task).filter(
        Task.completed_at >= day_start, Task.completed_at <= day_end
    ).all()

    activities = db.query(ActivityLog).filter(
        ActivityLog.created_at >= day_start, ActivityLog.created_at <= day_end
    ).all()

    overdue_tasks = db.query(Task).filter(
        Task.due_date < datetime.utcnow(),
        Task.due_date.isnot(None),
        Task.status != "done"
    ).order_by(Task.due_date.asc()).limit(5).all()

    context = {
        "date": date_str,
        "completed_tasks": [{"id": t.id, "title": t.title, "category": t.category} for t in completed_tasks],
        "activities": [{"description": a.description, "action_type": a.action_type} for a in activities],
        "overdue_tasks": [{"id": t.id, "title": t.title, "due_date": t.due_date.isoformat() if t.due_date else None} for t in overdue_tasks],
    }

    summary = await ai_service.generate_enhanced_daily_summary(context)
    return {
        "date": date_str,
        "summary": summary,
        "completed_count": len(completed_tasks),
        "activity_count": len(activities),
    }


# ─── V2: Chat Assistant (§8) ─────────────────

@router.post("/chat", response_model=AIChatResponse)
async def chat_with_assistant(payload: AIChatRequest, db: Session = Depends(get_db)):
    """Context-aware AI assistant that answers questions about tasks."""
    resolver = ContextResolver(db)
    context = resolver.get_today_context()
    return await ai_service.chat_assistant(payload.message, context)


# ─── V2: AI Suggestions (§16) ────────────────

@router.get("/suggestions")
async def get_suggestions(db: Session = Depends(get_db)):
    """Get AI-generated suggestions based on current context."""
    resolver = ContextResolver(db)
    context = resolver.get_today_context()
    return await ai_service.generate_suggestions(context)
