from fastapi import FastAPI, Request, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError
import os
import sys
import traceback

# Ensure the project root (parent of backend/) is always on sys.path
# so the server works when launched from either the project root or the backend/ directory.
_project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from backend.app.config import settings
from backend.app.database import engine, Base
from backend.app.services.auth_service import get_current_user
from backend.app.routers import (
    tasks_router,
    projects_router,
    tags_router,
    activity_router,
    ai_router,
    auth_router
)
from backend.app.routers.settings import router as settings_router
from backend.app.routers.reflections import router as reflections_router
from backend.app.routers.dependencies import router as dependencies_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-Native Personal Task Manager API — Unified execution system with single-user authentication.",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Explicit HTTP exception handlers to preserve status codes (401, 404, 422)
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=getattr(exc, "headers", None)
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[GLOBAL_EXCEPTION] {request.method} {request.url}: {exc}")
    traceback.print_exc()
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Server error: {str(exc)}"}
    )

# Include Routers
app.include_router(auth_router)
app.include_router(tasks_router, dependencies=[Depends(get_current_user)])
app.include_router(projects_router, dependencies=[Depends(get_current_user)])
app.include_router(tags_router, dependencies=[Depends(get_current_user)])
app.include_router(activity_router, dependencies=[Depends(get_current_user)])
app.include_router(ai_router, dependencies=[Depends(get_current_user)])
app.include_router(settings_router, dependencies=[Depends(get_current_user)])
app.include_router(reflections_router, dependencies=[Depends(get_current_user)])
app.include_router(dependencies_router, dependencies=[Depends(get_current_user)])

@app.on_event("startup")
def create_tables():
    """Auto-create tables on first run (fallback for when alembic isn't run)."""
    # Import all models so Base.metadata knows about them
    from backend.app.models import (
        Project, Tag, Subtask, ActivityLog, Task,
        TaskDependency, DailyReflection, UserSettings, AISuggestion
    )
    Base.metadata.create_all(bind=engine)

    # SQLite migration: add missing columns that create_all won't add
    from sqlalchemy import text, inspect
    if str(engine.url).startswith("sqlite"):
        with engine.connect() as conn:
            inspector = inspect(engine)
            existing_cols = {c["name"] for c in inspector.get_columns("user_settings")}
            migrations = [
                ("daily_chunks", "JSON"),
            ]
            for col_name, col_type in migrations:
                if col_name not in existing_cols:
                    conn.execute(text(f"ALTER TABLE user_settings ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
                    print(f"[Startup] Added missing column: user_settings.{col_name}")

    print("[Startup] Database tables ensured.")
    # Debug: confirm AI config on startup
    from backend.app.config import settings as _cfg
    _key = _cfg.get_ai_api_key()
    print(f"[Startup] AI provider={_cfg.AI_PROVIDER}, model={_cfg.get_ai_model()}, key={'set (' + str(len(_key)) + ' chars)' if _key else 'MISSING'}")

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "database": "connected"
    }

# Serve frontend build in production if dist exists
if os.path.exists("./frontend/dist"):
    app.mount("/", StaticFiles(directory="./frontend/dist", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
