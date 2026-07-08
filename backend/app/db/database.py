from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    db_path = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "")
    if db_path and db_path != ":memory:":
        db_file = Path(db_path)
        if not db_file.is_absolute():
            db_file = Path.cwd() / db_file
        db_file.parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
# 3. Create a session factory to handle database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# 4. Base class for our ORM models
Base = declarative_base()
# Route Dependency to get a database session for each request
# A helper function that safely yields a database connection to our API routes
# and guarantees the connection closes when the request finishes.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()