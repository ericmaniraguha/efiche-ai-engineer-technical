from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "eFiche AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_DB: str = "efiche_db"
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: str = "5432"

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    # Redis
    REDIS_URL: str = "redis://redis:6379/0"
    
    # Secrets
    SECRET_KEY: str = "dev_secret_key_change_me_in_production"
    OPENAI_API_KEY: Optional[str] = None
    
    # Cost Limits
    MONTHLY_COST_LIMIT: float = 100.0
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
