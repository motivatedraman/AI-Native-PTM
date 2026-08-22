from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from backend.app.database import Base


class FocusSession(Base):
    __tablename__ = "focus_sessions"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True, index=True)
    planned_minutes = Column(Integer, nullable=False)
    actual_minutes = Column(Integer, nullable=True)  # filled when the session ends
    status = Column(String(20), default="active", index=True)  # active, completed, abandoned
    break_taken = Column(Boolean, default=False, nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow, index=True)
    ended_at = Column(DateTime, nullable=True)

    task = relationship("Task")
