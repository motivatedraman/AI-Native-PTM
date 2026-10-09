import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.config import settings

# Normalize database URL for Render PostgreSQL and SQLite
db_url = settings.get_database_url()

if db_url.startswith("sqlite"):
    # Ensure data directory exists
    if "./data" in db_url or "/data" in db_url:
        os.makedirs("./data", exist_ok=True)
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False}
    )
else:
    # Hosted Postgres providers (Neon, Supabase, Render) all require TLS and
    # most reject a connection without it. Default it on so a URL copied from
    # a dashboard just works.
    if "sslmode" not in db_url:
        db_url = db_url + ("&" if "?" in db_url else "?") + "sslmode=require"

    # SQLAlchemy 2 resolves a bare postgresql:// to the psycopg3 driver, but
    # this project ships psycopg2-binary. Without pinning the driver, setting
    # DATABASE_URL to Postgres crashes on import with "No module named psycopg".
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    engine = create_engine(
        db_url,
        pool_pre_ping=True,   # drop dead connections; free tiers recycle often
        pool_recycle=300,
        pool_size=5,           # free Postgres caps connections aggressively
        max_overflow=5,
        pool_timeout=30,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
