from datetime import datetime
from sqlalchemy import Column, Integer, DateTime, String
from backend.app.database import Base


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_key = Column(String(50), nullable=False, unique=True, default="default")
    available_start_hour = Column(Integer, default=9)
    available_end_hour = Column(Integer, default=18)
    timezone = Column(String(50), default="Asia/Kathmandu")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
