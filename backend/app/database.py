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
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=10,
        max_overflow=20
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
