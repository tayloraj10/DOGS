from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_API_DIR = Path(__file__).resolve().parent.parent
_REPO_ROOT = _API_DIR.parent


def _env_files() -> tuple[str, ...]:
    candidates = (_REPO_ROOT / ".env", _API_DIR / ".env")
    existing = tuple(str(path) for path in candidates if path.exists())
    return existing or (str(_REPO_ROOT / ".env"),)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_env_files(),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    POSTGRES_DB: str = "dogs_db"
    POSTGRES_USER: str = "dogs_user"
    POSTGRES_PASSWORD: str = "dogs_password"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5433

    DB_PASSWORD: str = ""
    DATABASE_URL: str = ""

    DB_POOL_SIZE: int = 3
    DB_MAX_OVERFLOW: int = 5
    DB_POOL_RECYCLE_SECONDS: int = 1800

    ENVIRONMENT: str = "development"

    GOOGLE_SHEETS_SPREADSHEET_ID: str = "1KVYFjM8E_c65hzia2LWgtwvO9UKeqUXJpsfhB2OeOAo"
    GOOGLE_SHEETS_SHEET_GID: int = 1363212709
    GOOGLE_APPLICATION_CREDENTIALS: str = ""
    GOOGLE_MAPS_GEOCODING_API_KEY: str = ""

    GCS_DIRECTORY_IMAGES_BUCKET: str = ""
    GCS_PROJECT_ID: str = ""

    @property
    def database_url(self) -> str:
        if self.DATABASE_URL:
            if self.DB_PASSWORD:
                user_part = self.DATABASE_URL.split("//")[1].split("@")[0]
                if ":" not in user_part:
                    protocol_and_user, rest = self.DATABASE_URL.split("@", 1)
                    return f"{protocol_and_user}:{self.DB_PASSWORD}@{rest}"
            return self.DATABASE_URL

        password = self.DB_PASSWORD or self.POSTGRES_PASSWORD
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{password}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )


settings = Settings()
