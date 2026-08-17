from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Task
from backend.app.schemas import (
    AITaskParseRequest, AITaskParseResult, AITaskEnrichResponse,
    AISubtaskSuggestResponse, AIDailySummaryRequest, AIDailySummaryResponse, AIStatusResponse
)
from backend.app.services import ai_service

router = APIRouter(prefix="/api/ai", tags=["AI Integration"])

@router.get("/status", response_model=AIStatusResponse)
def get_ai_status():
    return ai_service.get_status()

@router.post("/parse-task", response_model=AITaskParseResult)
async def parse_natural_language_task(payload: AITaskParseRequest):
    return await ai_service.parse_task(payload.text)

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
