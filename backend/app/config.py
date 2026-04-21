import os

from pydantic_settings import BaseSettings, SettingsConfigDict


def _env(name: str, default: str) -> str:
    """Always honor process env over defaults."""
    v = os.environ.get(name)
    return v if v not in (None, "") else default


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    # ---- Relational + time-series (TimescaleDB, Postgres-compatible) ----
    database_url: str = _env("DATABASE_URL", "postgresql+psycopg2://sutra:sutra_dev_pw@db:5432/sutra_ontology")

    # ---- Semantic store (Jena Fuseki) ----
    fuseki_url: str = _env("FUSEKI_URL", "http://fuseki:3030")
    fuseki_dataset: str = _env("FUSEKI_DATASET", "energy")
    fuseki_admin_password: str = _env("FUSEKI_ADMIN_PASSWORD", "fuseki_admin")

    # ---- Multi-model graph store (ArcadeDB) ----
    arcadedb_url: str = _env("ARCADEDB_URL", "http://arcadedb:2480")
    arcadedb_user: str = _env("ARCADEDB_USER", "root")
    arcadedb_password: str = _env("ARCADEDB_PASSWORD", "arcadedb_dev_pw")
    arcadedb_database: str = _env("ARCADEDB_DATABASE", "sutra")

    # ---- Consent cache (Valkey / Redis protocol) ----
    valkey_url: str = _env("VALKEY_URL", "redis://valkey:6379/0")

    # ---- Policy engine (OPA) ----
    opa_url: str = _env("OPA_URL", "http://opa:8181")

    # ---- Auth ----
    jwt_secret: str = _env("JWT_SECRET", "change-me")
    jwt_algorithm: str = _env("JWT_ALGORITHM", "HS256")
    jwt_expire_minutes: int = int(_env("JWT_EXPIRE_MINUTES", "1440"))

    # ---- CORS ----
    cors_origins: str = _env("CORS_ORIGINS", "http://localhost:5173")

    # ---- Seeding ----
    seed_admin_email: str = _env("SEED_ADMIN_EMAIL", "admin@sutra.local")
    seed_admin_password: str = _env("SEED_ADMIN_PASSWORD", "admin123")

    # ---- Ontology files ----
    ontology_dir: str = _env("ONTOLOGY_DIR", "/ontology")
    shacl_shapes_file: str = _env("SHACL_SHAPES_FILE", "/ontology/shacl_shapes.ttl")

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
