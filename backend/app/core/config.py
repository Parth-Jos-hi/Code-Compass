from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "CodeCompass Engine"
    DEBUG_MODE: bool = True

    GOOGLE_API_KEY: Optional[str] = None
    groq_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    DATABASE_URL: str = "sqlite:///./data/local_compass.db"
    CHROMA_DB_DIR: str = "./chroma_data"
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
