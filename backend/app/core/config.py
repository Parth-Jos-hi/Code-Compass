from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "CodeCompass Engine"
    DEBUG_MODE: bool = True

    GOOGLE_API_KEY: str
    DATABASE_URL: str = "sqlite:///./local_compass.db"
    CHROMA_DB_DIR: str = "./chroma_data"
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
