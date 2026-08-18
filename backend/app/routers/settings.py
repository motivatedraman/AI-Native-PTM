from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user_settings import UserSettings
from backend.app.schemas import UserSettingsResponse, UserSettingsUpdateRequest

router = APIRouter(prefix="/api/settings", tags=["User Settings"])


def _get_or_create_settings(db: Session) -> UserSettings:
    settings = db.query(UserSettings).filter(UserSettings.user_key == "default").first()
    if not settings:
        settings = UserSettings(user_key="default")
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("", response_model=UserSettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    settings = _get_or_create_settings(db)
    return UserSettingsResponse(
        available_start_hour=settings.available_start_hour,
        available_end_hour=settings.available_end_hour,
        timezone=settings.timezone,
    )


@router.patch("", response_model=UserSettingsResponse)
def update_settings(payload: UserSettingsUpdateRequest, db: Session = Depends(get_db)):
    settings = _get_or_create_settings(db)
    if payload.available_start_hour is not None:
        settings.available_start_hour = payload.available_start_hour
    if payload.available_end_hour is not None:
        settings.available_end_hour = payload.available_end_hour
    if payload.timezone is not None:
        settings.timezone = payload.timezone
    db.commit()
    db.refresh(settings)
    return UserSettingsResponse(
        available_start_hour=settings.available_start_hour,
        available_end_hour=settings.available_end_hour,
        timezone=settings.timezone,
    )
