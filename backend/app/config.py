import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI-Native Personal Task Manager"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./data/app.db")
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "gemini")
    AI_API_KEY: str = os.getenv("AI_API_KEY", "")
    AI_MODEL: str = os.getenv("AI_MODEL", "gemini-1.5-flash")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-replace-in-production")
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173")

    # Single-user Authentication
    AUTH_USERNAME: str = os.getenv("AUTH_USERNAME", "raman")
    AUTH_PASSWORD: str = os.getenv("AUTH_PASSWORD", "admin123")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super-secret-jwt-key-nexus-os-secure-production-32-chars-long")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_DAYS: int = 30
    
    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
