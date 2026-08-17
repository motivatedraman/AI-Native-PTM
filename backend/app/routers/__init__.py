from backend.app.routers.tasks import router as tasks_router
from backend.app.routers.projects import router as projects_router
from backend.app.routers.tags import router as tags_router
from backend.app.routers.activity import router as activity_router
from backend.app.routers.ai import router as ai_router

__all__ = ["tasks_router", "projects_router", "tags_router", "activity_router", "ai_router"]
