from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    supabase_jwt_audience: str = "authenticated"
    frontend_origin: str = "http://localhost:3000"
    evidence_bucket: str = "evidence-private"
    max_upload_mb: int = 25

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
