from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    database_url: str
    database_url_sync: str

    # Gemini
    gemini_api_key: str

    # JWT
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    # GitHub OAuth
    github_client_id: str
    github_client_secret: str
    github_redirect_uri: str = "http://localhost:8000/api/auth/github/callback"

    # App
    app_name: str = "AprendizajeAI"
    app_version: str = "0.1.0"
    debug: bool = True
    frontend_url: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
