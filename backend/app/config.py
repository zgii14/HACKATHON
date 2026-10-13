from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://githire:githire@localhost:5432/githire"
    gemini_api_key: str = ""
    # Guardrail AI: nilai ini adalah batas aplikasi GitHire dan dapat disetel
    # sesuai quota aktif project Gemini di AI Studio.
    # 0 = nonaktif. Sengaja dibuka saat demo; aktifkan per environment produksi.
    ai_global_requests_per_minute: int = 0
    ai_cv_parse_daily_limit: int = 0
    ai_roadmap_generate_daily_limit: int = 0
    ai_portfolio_generate_daily_limit: int = 0
    ai_cover_letter_daily_limit: int = 0
    ai_screening_daily_limit: int = 0
    github_token: str | None = None
    clerk_jwks_url: str = ""
    clerk_issuer: str = ""
    clerk_secret_key: str = ""  # Backend API Clerk (baca akun GitHub terverifikasi)
    clerk_webhook_secret: str = ""  # whsec_... untuk verifikasi webhook Svix
    cors_origins: str = "http://localhost:3000"
    cors_origin_regex: str | None = None  # regex origin CORS (mis. semua *.vercel.app)
    admin_secret: str | None = None  # Set di .env: ADMIN_SECRET=your_secret
    recruiter_emails: str = ""
    admin_emails: str = ""  # comma-separated admin allowlist, e.g. admin.githire@gmail.com


settings = Settings()
