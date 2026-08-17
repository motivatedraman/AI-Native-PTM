import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI-Native Personal Task Manager"
    DATABASE_URL: str = "sqlite:///./data/app.db"
    AI_PROVIDER: str = "gemini"
    AI_API_KEY: str = ""
    AI_MODEL: str = "gemini-1.5-flash"
    SECRET_KEY: str = "dev-secret-key-replace-in-production"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    # Single-user Authentication
    AUTH_USERNAME: str = ""
    AUTH_PASSWORD: str = ""
    JWT_SECRET: str = "super-secret-jwt-key-nexus-os-secure-production-32-chars-long"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_DAYS: int = 30
    
    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    def get_auth_username(self) -> str:
        val = os.environ.get("AUTH_USERNAME") or self.AUTH_USERNAME or "raman"
        return val.strip().strip('"').strip("'")

    def get_auth_password(self) -> str:
        val = os.environ.get("AUTH_PASSWORD") or self.AUTH_PASSWORD or "admin123"
        return val.strip().strip('"').strip("'")

    def get_jwt_secret(self) -> str:
        val = os.environ.get("JWT_SECRET") or self.JWT_SECRET
        return val.strip().strip('"').strip("'")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
