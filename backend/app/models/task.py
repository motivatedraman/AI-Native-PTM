from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.database import Base
from backend.app.models.tag import task_tags
from backend.app.services.npt import utcnow

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(String(30), default="inbox", index=True)  # inbox, planned, doing, done
    priority = Column(String(20), default="medium", index=True)  # low, medium, high, urgent
    due_date = Column(DateTime(timezone=True), nullable=True, index=True)
    estimated_minutes = Column(Integer, nullable=True)
    spent_minutes = Column(Integer, default=0, nullable=False)
    category = Column(String(50), default="Personal", index=True)  # Personal, University, Work, Project, Other
    
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    parent_task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True)
    
    # timezone=True: these hold instants, not wall-clock readings. Keeps the
    # stored value independent of the database's own timezone setting.
    created_at = Column(DateTime(timezone=True), default=utcnow, index=True)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    ai_metadata = Column(JSON, nullable=True)  # suggestions, parsed_entities, confidence, reasoning

    # Relationships
    project = relationship("Project", back_populates="tasks")
    tags = relationship("Tag", secondary=task_tags, back_populates="tasks")
    subtasks = relationship("Subtask", back_populates="task", cascade="all, delete-orphan", order_by="Subtask.order")
    activities = relationship("ActivityLog", back_populates="task", cascade="all, delete-orphan", order_by="desc(ActivityLog.created_at)")
    
    # Self-referencing subtasks/parent
    parent = relationship("Task", remote_side=[id], backref="child_tasks")
