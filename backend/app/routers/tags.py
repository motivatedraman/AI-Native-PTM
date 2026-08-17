from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import Tag
from backend.app.schemas import TagCreate, TagResponse

router = APIRouter(prefix="/api/tags", tags=["Tags"])

@router.get("", response_model=List[TagResponse])
def get_tags(db: Session = Depends(get_db)):
    return db.query(Tag).order_by(Tag.name.asc()).all()

@router.post("", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
def create_tag(tag_in: TagCreate, db: Session = Depends(get_db)):
    existing = db.query(Tag).filter(Tag.name.ilike(tag_in.name)).first()
    if existing:
        return existing

    tag = Tag(name=tag_in.name, color=tag_in.color or "#64748b")
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag
