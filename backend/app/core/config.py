"""Application configuration settings using Pydantic Settings."""

from pathlib import Path
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Centralized configuration for MoleculeLab."""

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "MoleculeLab"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    BACKEND_HOST: str = "127.0.0.1"
    BACKEND_PORT: int = 8000

    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    DATABASE_URL: str = f"sqlite:///{BACKEND_ROOT / 'moleculelab.db'}"

    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    MAX_IMPORT_ROWS: int = 5000

    @property
    def cors_origins(self) -> List[str]:
        """Parse comma-separated CORS origins into a list."""
        if not self.ALLOWED_ORIGINS:
            return ["*"]
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def database_path(self) -> Path:
        """Filesystem path of the SQLite database when SQLite is configured."""
        if self.DATABASE_URL.startswith("sqlite:///"):
            raw = self.DATABASE_URL.replace("sqlite:///", "", 1)
            return (BACKEND_ROOT / raw).resolve() if not raw.startswith("/") else Path(raw)
        raise ValueError("database_path is only available for SQLite configuration")


settings = Settings()
