from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Subtask(Base):
    __tablename__ = "subtasks"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    is_completed = Column(Boolean, default=False)
    order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("Task", back_populates="subtasks")
