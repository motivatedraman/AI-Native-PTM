from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Boolean
from backend.app.database import Base


class AISuggestion(Base):
    __tablename__ = "ai_suggestions"

    id = Column(Integer, primary_key=True, index=True)
    suggestion_type = Column(String(50), nullable=False, index=True)  # deadline_warning, reschedule, decomposition, daily_tip, project_insight
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    action_payload = Column(JSON, nullable=True)  # structured action the user can apply
    task_id = Column(Integer, nullable=True, index=True)
    project_id = Column(Integer, nullable=True)
    is_dismissed = Column(Boolean, default=False)
    is_applied = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    expires_at = Column(DateTime, nullable=True)
