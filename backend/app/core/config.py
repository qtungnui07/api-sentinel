from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "API Sentinel"
    database_url: str = "sqlite:///./data/sentinel.db"
    cors_origins: str = "http://localhost:3000"
    max_concurrent_checks: int = 20

    model_config = {"env_file": ".env", "env_prefix": "SENTINEL_"}

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
