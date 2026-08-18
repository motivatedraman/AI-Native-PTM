from datetime import datetime
from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from backend.app.database import Base


class TaskDependency(Base):
    __tablename__ = "task_dependencies"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    depends_on_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("Task", foreign_keys=[task_id], backref="dependencies")
    blocked_by = relationship("Task", foreign_keys=[depends_on_id], backref="dependent_tasks")
