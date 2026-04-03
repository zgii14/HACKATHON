from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://githire:githire@localhost:5432/githire"
    gemini_api_key: str = ""
    github_token: str | None = None
    clerk_jwks_url: str = ""
    clerk_issuer: str = ""
    cors_origins: str = "http://localhost:3000"
    admin_secret: str | None = None  # Set di .env: ADMIN_SECRET=your_secret


settings = Settings()
