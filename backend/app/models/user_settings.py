from datetime import datetime
from sqlalchemy import Column, Integer, DateTime, String, JSON
from backend.app.database import Base


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_key = Column(String(50), nullable=False, unique=True, default="default")
    available_start_hour = Column(Integer, default=6)
    available_end_hour = Column(Integer, default=22)
    daily_chunks = Column(JSON, nullable=True)
    timezone = Column(String(50), default="Asia/Kathmandu")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
