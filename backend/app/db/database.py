## The Connection Manager (database.py) – Opens and closes the communication line to our database file.
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base,sessionmaker
from app.core.config import settings

# 1. Grab the local SQLite URL from our config file
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL
# 2. Create the SQLAlchemy engine to manage the connection to the database
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