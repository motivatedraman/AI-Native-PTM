import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI-Native Personal Task Manager"
    DATABASE_URL: str = "sqlite:///./data/app.db"
    AI_PROVIDER: str = "gemini"
    AI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    AI_MODEL: str = "gemini-2.5-flash"
    
    def get_ai_model(self) -> str:
        """Get the AI model, with deprecation detection."""
        model = self.AI_MODEL.strip()
        # Detect deprecated models and auto-upgrade
        deprecated = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash", "gemini-2.0-flash-lite"]
        if model in deprecated:
            print(f"[Config] WARNING: {model} is deprecated/shut down. Auto-upgrading to gemini-2.5-flash")
            return "gemini-2.5-flash"
        return model
    AVAILABLE_START_HOUR: int = 9
    AVAILABLE_END_HOUR: int = 18
    SECRET_KEY: str = "dev-secret-key-replace-in-production-nexus-os-32chars"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    # Single-user Authentication
    AUTH_USERNAME: str = "raman"
    AUTH_PASSWORD: str = "admin123"
    JWT_SECRET: str = "super-secret-jwt-key-nexus-os-secure-production-32-chars-long"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_DAYS: int = 30
    
    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    def get_auth_username(self) -> str:
        raw = os.environ.get("AUTH_USERNAME") or self.AUTH_USERNAME or "raman"
        clean = str(raw).strip().strip('"').strip("'")
        return clean if clean else "raman"

    def get_auth_password(self) -> str:
        raw = os.environ.get("AUTH_PASSWORD") or self.AUTH_PASSWORD or "admin123"
        clean = str(raw).strip().strip('"').strip("'")
        return clean if clean else "admin123"

    def get_jwt_secret(self) -> str:
        raw = os.environ.get("JWT_SECRET") or self.JWT_SECRET or os.environ.get("SECRET_KEY") or self.SECRET_KEY
        clean = str(raw).strip().strip('"').strip("'")
        if not clean or len(clean) < 16:
            return "super-secret-jwt-key-nexus-os-secure-production-32-chars-long"
        return clean

    def get_ai_api_key(self) -> str:
        # Prefer AI_API_KEY, fall back to GEMINI_API_KEY
        key = os.environ.get("AI_API_KEY", "").strip()
        if not key:
            key = os.environ.get("GEMINI_API_KEY", "").strip()
        if not key:
            key = self.AI_API_KEY.strip()
        return key

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
