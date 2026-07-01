from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.database import engine, Base
from app.api import voyage_routes

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
@app.get("/")
async def root():
    """
    baisc check of endpoints to cinfirm the server is running locally
    """
    return{
        "engine":"VoidScout Backend",
        "status": "online",
        "active_database_layer": "SQLite + ChromaDB Persistent Storage"
}