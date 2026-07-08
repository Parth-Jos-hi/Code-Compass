import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
# When running inside Docker, the working directory is /app and .env is copied there by docker-compose.
# When running locally from backend/app, the project root is one parent above /app.
env_path = Path(__file__).resolve().parent.parent / ".env"
if not env_path.exists():
    env_path = Path.cwd() / ".env"

if env_path.exists():
    load_dotenv(env_path)
    print(f"Loaded .env from {env_path}")
else:
    print(f"Warning: .env file not found at {env_path}")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.database import engine, Base
from app.api import voyage_routes, questions_routes

# Initialize and structure our database tables in SQLite upon startup
# If the tables already exist on your disk, this safely leaves them intact
Base.metadata.create_all(bind=engine)
# initialize the primary fastapi database instance 
app = FastAPI(
    title="VoidScout Core Backend Engine",
    description="An AI-powered 3D full-stack codebase exploration and gamified learning system.",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Connect and register our automated repository scanning orchestration endpoints
app.include_router(voyage_routes.router)
app.include_router(questions_routes.router)


@app.get("/")
async def root():
    """Basic check that the server is running locally."""
    return {
        "engine": "VoidScout Backend",
        "status": "online",
        "active_database_layer": "SQLite + ChromaDB Persistent Storage",
    }


@app.get("/api/health")
async def health():
    """Health probe used by local verification and deployment checks."""
    return {"status": "ok"}