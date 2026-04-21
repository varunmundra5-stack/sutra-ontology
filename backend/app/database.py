import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

# SSL mode: Render Postgres requires SSL; local TimescaleDB has none.
# SSLMODE env var lets each environment override without a code change.
# Default: "require" on Render (set via env), "prefer" elsewhere (falls back to no-SSL).
_sslmode = os.environ.get("SSLMODE", "prefer")

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=2,
    max_overflow=3,
    connect_args={"sslmode": _sslmode},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
