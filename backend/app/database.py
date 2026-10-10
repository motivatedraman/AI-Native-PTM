import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.config import settings

# Fully normalized (driver pinned, TLS defaulted). See settings.get_engine_url.
db_url = settings.get_engine_url()

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
        pool_pre_ping=True,   # drop dead connections; free tiers recycle often
        pool_recycle=300,
        pool_size=5,           # free Postgres caps connections aggressively
        max_overflow=5,
        pool_timeout=30,
        # Force the session timezone to UTC regardless of what the hosted
        # database is configured with. The Neon branch timezone is
        # Asia/Kathmandu, and a naive datetime assigned into a timestamptz
        # column is interpreted in the *session* timezone -- so without this
        # any naive value (from a legacy caller or a raw query) would be
        # stored 05:45 out. Every value this app writes is aware UTC; this
        # makes sure nothing else can be misread on the way in or out.
        connect_args={"options": "-c timezone=UTC"},
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
