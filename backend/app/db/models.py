"""
Creates a blueprint for the database schema.
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.database import Base

class RepositoryNode(Base):
    """
    Tracks files discovered in a codebase and their mastery state.
    This dictates whether a node renders as Grey or Gold in the 3D graph.
    """
    __tablename__ = "repository_nodes"

    id = Column(Integer, primary_key=True, index=True)
    repo_name = Column(String, index=True)
    file_path = Column(String, unique=True, index=True) # e.g., "src/main.py"
    language = Column(String)                           # Python, Java, C++
    is_mastered = Column(Boolean, default=False)       # False = Grey, True = Gold
    
    # Stores raw string details about structural dependencies (JSON format)
    imports_json = Column(Text, nullable=True) 


class DsaProgress(Base):
    """
    Tracks the user's Socratic learning metrics for algorithmic problems.
    """
    __tablename__ = "dsa_progress"

    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(String, unique=True, index=True) # e.g., "two-sum" or "kruskals"
    problem_name = Column(String)
    current_hint_tier = Column(Integer, default=0)       # 0 = No hints, 3 = Heavy structural breakdown
    is_solved = Column(Boolean, default=False)
    attempts_count = Column(Integer, default=0)


