"""
EventFlow Backend — Configuration
"""

import os
from datetime import timedelta


def _require_env(key: str, default: str | None = None) -> str:
    """Return env var value or raise RuntimeError in production."""
    value = os.environ.get(key, default)
    if value is None:
        if os.environ.get("FLASK_ENV", "development").lower() == "production":
            raise RuntimeError(
                f"Required environment variable '{key}' is not set. "
                "Check your .env file or container environment."
            )
        return f"dev-fallback-{key.lower()}"
    return value


class BaseConfig:
    """Base configuration shared across all environments."""

    # Flask
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-prod")
    JSON_SORT_KEYS: bool = False

    # JWT
    JWT_SECRET_KEY: str = os.environ.get(
        "JWT_SECRET_KEY", "dev-jwt-secret-change-in-prod"
    )
    JWT_ACCESS_TOKEN_EXPIRES: timedelta = timedelta(hours=24)
    JWT_TOKEN_LOCATION: list = ["headers"]
    JWT_HEADER_NAME: str = "Authorization"
    JWT_HEADER_TYPE: str = "Bearer"
    JWT_ERROR_MESSAGE_KEY: str = "error"

    # Database
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    SQLALCHEMY_ENGINE_OPTIONS: dict = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }

    # CORS
    CORS_ORIGINS: list = [
        origin.strip()
        for origin in os.environ.get(
            "CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost"
        ).split(",")
        if origin.strip()
    ]

    # Rate limiting
    RATELIMIT_STORAGE_URI: str = "memory://"
    RATELIMIT_DEFAULT: str = os.environ.get("RATELIMIT_DEFAULT", "200 per day;50 per hour")
    RATELIMIT_AUTH: str = os.environ.get("RATELIMIT_AUTH", "10 per minute")

    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    @staticmethod
    def _build_database_url() -> str:
        """Assemble DATABASE_URL from components or use directly if provided."""
        direct_url = os.environ.get("DATABASE_URL")
        if direct_url:
            # Fix legacy postgres:// → postgresql://
            if direct_url.startswith("postgres://"):
                direct_url = "postgresql://" + direct_url[len("postgres://"):]
            return direct_url

        # Check if PostgreSQL is explicitly configured or running in production
        host = os.environ.get("POSTGRES_HOST")
        if host or os.environ.get("FLASK_ENV") == "production":
            host = host or "localhost"
            port = os.environ.get("POSTGRES_PORT", "5432")
            db_name = os.environ.get("POSTGRES_DB", "eventflow")
            user = os.environ.get("POSTGRES_USER", "eventflow_user")
            password = os.environ.get("POSTGRES_PASSWORD", "")
            return f"postgresql://{user}:{password}@{host}:{port}/{db_name}"

        # Zero-config local development default
        return "sqlite:///eventflow.db"


class DevelopmentConfig(BaseConfig):
    """Development configuration."""

    DEBUG: bool = True
    SQLALCHEMY_DATABASE_URI: str = BaseConfig._build_database_url()
    SQLALCHEMY_ECHO: bool = False  # Set True to log SQL queries


class TestingConfig(BaseConfig):
    """Testing configuration — uses a dedicated test database."""

    TESTING: bool = True
    DEBUG: bool = True

    SQLALCHEMY_DATABASE_URI: str = os.environ.get(
        "TEST_DATABASE_URL",
        "postgresql://eventflow_user:changeme_strong_password@localhost:5432/eventflow_test",
    )
    # Disable rate limiting during tests
    RATELIMIT_ENABLED: bool = False

    # Shorter JWT expiry for testing
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)


class ProductionConfig(BaseConfig):
    """Production configuration — requires all secrets set via environment."""

    DEBUG: bool = False

    # These WILL raise RuntimeError at startup if not set — intentional
    SECRET_KEY: str = _require_env("SECRET_KEY")  # type: ignore[assignment]
    JWT_SECRET_KEY: str = _require_env("JWT_SECRET_KEY")  # type: ignore[assignment]

    SQLALCHEMY_DATABASE_URI: str = BaseConfig._build_database_url()

    # Tighter connection pool in production
    SQLALCHEMY_ENGINE_OPTIONS: dict = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "pool_size": 10,
        "max_overflow": 20,
    }


_CONFIG_MAP: dict[str, type[BaseConfig]] = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}


def get_config(config_name: str) -> type[BaseConfig]:
    """Return the configuration class for the given environment name."""
    config_class = _CONFIG_MAP.get(config_name.lower())
    if config_class is None:
        raise ValueError(
            f"Unknown config '{config_name}'. "
            f"Choose from: {list(_CONFIG_MAP.keys())}"
        )
    return config_class
