from fastapi import FastAPI, Request, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os

from backend.app.config import settings
from backend.app.services.auth_service import get_current_user
from backend.app.routers import (
    tasks_router,
    projects_router,
    tags_router,
    activity_router,
    ai_router,
    auth_router
)

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

# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[GLOBAL_EXCEPTION] {request.method} {request.url}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected server error occurred. Please try again."}
    )

# Include Routers
app.include_router(auth_router)
app.include_router(tasks_router, dependencies=[Depends(get_current_user)])
app.include_router(projects_router, dependencies=[Depends(get_current_user)])
app.include_router(tags_router, dependencies=[Depends(get_current_user)])
app.include_router(activity_router, dependencies=[Depends(get_current_user)])
app.include_router(ai_router, dependencies=[Depends(get_current_user)])

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
