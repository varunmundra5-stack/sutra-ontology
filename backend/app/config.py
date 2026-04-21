from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ---- Relational + time-series (TimescaleDB, Postgres-compatible) ----
    database_url: str = "postgresql+psycopg2://sutra:sutra_dev_pw@db:5432/sutra_ontology"

    # ---- Semantic store (Jena Fuseki) ----
    fuseki_url: str = "http://fuseki:3030"
    fuseki_dataset: str = "energy"
    fuseki_admin_password: str = "fuseki_admin"

    # ---- Multi-model graph store (ArcadeDB) ----
    arcadedb_url: str = "http://arcadedb:2480"
    arcadedb_user: str = "root"
    arcadedb_password: str = "arcadedb_dev_pw"
    arcadedb_database: str = "sutra"

    # ---- Consent cache (Valkey / Redis protocol) ----
    valkey_url: str = "redis://valkey:6379/0"

    # ---- Policy engine (OPA) ----
    opa_url: str = "http://opa:8181"

    # ---- Auth ----
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    # ---- CORS ----
    cors_origins: str = "http://localhost:5173"

    # ---- Seeding ----
    seed_admin_email: str = "admin@sutra.local"
    seed_admin_password: str = "admin123"

    # ---- Ontology files ----
    ontology_dir: str = "/ontology"
    shacl_shapes_file: str = "/ontology/shacl_shapes.ttl"

    class Config:
        env_file = ".env"
        case_sensitive = False

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
