import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

# Resolve the project root (parent of backend/) so .env is found regardless of CWD
_env_file = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    ".env"
)
if not os.path.exists(_env_file):
    _env_file = ".env"

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI-Native Personal Task Manager"
    DATABASE_URL: str = "sqlite:///./data/app.db"
    AI_PROVIDER: str = "gemini"
    AI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    AI_MODEL: str = "gemini-3.5-flash-lite"
    AVAILABLE_START_HOUR: int = 6
    AVAILABLE_END_HOUR: int = 22
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

    def get_database_url(self) -> str:
        url = (os.environ.get("DATABASE_URL") or self.DATABASE_URL).strip().strip('"').strip("'")
        # Render PostgreSQL URL compatibility (postgres:// -> postgresql://)
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url

    def get_ai_provider(self) -> str:
        raw = os.environ.get("AI_PROVIDER") or self.AI_PROVIDER or "gemini"
        clean = str(raw).strip().strip('"').strip("'").lower()
        return clean if clean else "gemini"

    def get_ai_model(self) -> str:
        raw = os.environ.get("AI_MODEL") or self.AI_MODEL or ""
        clean = str(raw).strip().strip('"').strip("'")
        if clean:
            return clean
        provider = self.get_ai_provider()
        if provider == "openai":
            return "gpt-4o-mini"
        return "gemini-3.5-flash-lite"

    def get_ai_api_key(self) -> str:
        provider = self.get_ai_provider()
        # Check standard and provider-specific environment variables
        key = os.environ.get("AI_API_KEY", "").strip().strip('"').strip("'")
        if not key:
            key = os.environ.get("GEMINI_API_KEY", "").strip().strip('"').strip("'")
        if not key:
            key = os.environ.get("GOOGLE_API_KEY", "").strip().strip('"').strip("'")
        if not key and provider == "openai":
            key = os.environ.get("OPENAI_API_KEY", "").strip().strip('"').strip("'")
        if not key:
            key = self.AI_API_KEY.strip().strip('"').strip("'")
        if not key and self.GEMINI_API_KEY:
            key = self.GEMINI_API_KEY.strip().strip('"').strip("'")
        return key

    model_config = SettingsConfigDict(
        env_file=_env_file,
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
