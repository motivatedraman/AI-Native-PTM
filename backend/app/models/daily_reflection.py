from sqlalchemy import Column, Integer, String, Text, Date, DateTime
from backend.app.database import Base
from backend.app.services.npt import utcnow


class DailyReflection(Base):
    __tablename__ = "daily_reflections"

    id = Column(Integer, primary_key=True, index=True)
    reflection_date = Column(Date, nullable=False, unique=True, index=True)
    content = Column(Text, nullable=False)
    mood = Column(String(20), nullable=True)  # great, good, okay, bad
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
