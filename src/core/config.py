"""
Configuration module using Pydantic BaseSettings.
Loads environment variables from .env file.
"""

from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_name: str = "FamilyFinance"
    app_env: str = "development"
    debug: bool = False
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    ALLOWED_HOSTS: List[str] = [
        "localhost",
        "127.0.0.1",
        "Family-Finance.scram2k.com",
        "family-finance-api",  # Docker internal hostname
        "*",  # Allow all for Docker health checks (behind Traefik)
    ]
    DEBUG: bool = False

    # Database
    database_url: str

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Security
    secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # Google Cloud Storage
    gcs_bucket_name: str = "family-finance-prod"
    gcs_credentials_path: str = "/app/secrets/gcp-key.json"

    # CORS - include both case variants of domain (browsers lowercase domains)
    # In development, we allow all origins with "*"
    cors_origins: List[str] = [
        "https://Family-Finance.scram2k.com",
        "https://family-finance.scram2k.com",
        "https://app.Family-Finance.scram2k.com",
        "https://app.family-finance.scram2k.com",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:8080",
        "http://localhost:8081",
        "http://localhost:8082",
        "http://localhost:8083",
        "http://localhost:19000",
        "http://localhost:19006",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:19006",
    ]
    CORS_ORIGINS: List[str] = [
        "https://Family-Finance.scram2k.com",
        "https://family-finance.scram2k.com",
        "https://app.Family-Finance.scram2k.com",
        "https://app.family-finance.scram2k.com",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:8080",
        "http://localhost:8081",
        "http://localhost:8082",
        "http://localhost:8083",
        "http://localhost:19000",
        "http://localhost:19006",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:19006",
    ]

    # Currency
    base_currency: str = "MXN"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from string or list."""
        if isinstance(v, str):
            import json
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [origin.strip() for origin in v.split(",")]
        return v

    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    """
    Get cached settings instance.
    Uses lru_cache to avoid re-reading .env on every call.
    """
    return Settings()
