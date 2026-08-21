from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.daily_reflection import DailyReflection
from backend.app.schemas import DailyReflectionRequest, DailyReflectionResponse
from backend.app.services.npt import today_npt

router = APIRouter(prefix="/api/reflections", tags=["Daily Reflections"])


@router.get("", response_model=List[DailyReflectionResponse])
def get_reflections(
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db)
):
    reflections = db.query(DailyReflection).order_by(
        DailyReflection.reflection_date.desc()
    ).limit(limit).all()
    return [
        DailyReflectionResponse(
            id=r.id,
            reflection_date=r.reflection_date.isoformat(),
            content=r.content,
            mood=r.mood,
            created_at=r.created_at.isoformat() if r.created_at else ""
        )
        for r in reflections
    ]


@router.get("/today", response_model=Optional[DailyReflectionResponse])
def get_today_reflection(db: Session = Depends(get_db)):
    today = today_npt()
    r = db.query(DailyReflection).filter(DailyReflection.reflection_date == today).first()
    if not r:
        return None
    return DailyReflectionResponse(
        id=r.id,
        reflection_date=r.reflection_date.isoformat(),
        content=r.content,
        mood=r.mood,
        created_at=r.created_at.isoformat() if r.created_at else ""
    )


@router.post("", response_model=DailyReflectionResponse)
def save_reflection(payload: DailyReflectionRequest, db: Session = Depends(get_db)):
    today = today_npt()
    existing = db.query(DailyReflection).filter(DailyReflection.reflection_date == today).first()

    if existing:
        existing.content = payload.content
        existing.mood = payload.mood
        db.commit()
        db.refresh(existing)
        return DailyReflectionResponse(
            id=existing.id,
            reflection_date=existing.reflection_date.isoformat(),
            content=existing.content,
            mood=existing.mood,
            created_at=existing.created_at.isoformat() if existing.created_at else ""
        )

    reflection = DailyReflection(
        reflection_date=today,
        content=payload.content,
        mood=payload.mood,
    )
    db.add(reflection)
    db.commit()
    db.refresh(reflection)
    return DailyReflectionResponse(
        id=reflection.id,
        reflection_date=reflection.reflection_date.isoformat(),
        content=reflection.content,
        mood=reflection.mood,
        created_at=reflection.created_at.isoformat() if reflection.created_at else ""
    )
