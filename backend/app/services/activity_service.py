from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.app.models.activity import ActivityLog

def log_activity(
    db: Session,
    action_type: str,
    description: str,
    task_id: Optional[int] = None,
    details: Optional[Dict[str, Any]] = None
) -> ActivityLog:
    """Record an audit trail event for tasks or general user actions."""
    activity = ActivityLog(
        task_id=task_id,
        action_type=action_type,
        description=description,
        details=details or {},
        created_at=datetime.utcnow()
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity
