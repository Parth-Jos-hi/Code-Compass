"""
Creates a blueprint for the database schema.
"""
from sqlalchemy import Column, Integer, String, Boolean, Text, UniqueConstraint, Float, DateTime
from datetime import datetime

from app.db.database import Base

class RepositoryNode(Base):
    """
    Tracks files discovered in a codebase and their mastery state.
    Mastery is now auto-calculated based on question answer scores (75% threshold).
    """
    __tablename__ = "repository_nodes"
    __table_args__ = (
        UniqueConstraint('repo_name', 'file_path', name='uq_repo_file_path'),
    )

    id = Column(Integer, primary_key=True, index=True)
    repo_name = Column(String, index=True)
    file_path = Column(String, index=True) # e.g., "src/main.py"
    language = Column(String)                           # Python, Java, C++
    is_mastered = Column(Boolean, default=False)       # Auto-set by LLM when avg_score >= 75%
    avg_score = Column(Float, default=0.0)             # Average score from LLM evaluation
    
    # Stores raw string details about structural dependencies (JSON format)
    imports_json = Column(Text, nullable=True)


class Question(Base):
    """
    Stores questions associated with a repository node/file.
    Questions can be MCQ (multiple choice) or free_text (user types answer).
    """
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    repo_name = Column(String, index=True)
    node_id = Column(Integer, index=True)              # Reference to RepositoryNode.id
    question_text = Column(Text)                       # The question itself
    question_type = Column(String, default="mcq")      # "mcq" or "free_text"
    options_json = Column(Text, nullable=True)         # For MCQ: JSON array of options
    correct_answer = Column(Text, nullable=True)       # For MCQ: correct option; for free_text: reference answer
    created_at = Column(DateTime, default=datetime.utcnow)


class UserAnswer(Base):
    """
    Tracks user responses to questions and LLM evaluation scores.
    """
    __tablename__ = "user_answers"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, index=True)
    repo_name = Column(String, index=True)
    user_response = Column(Text)                       # User's answer (selected option or typed text)
    llm_score = Column(Float, default=0.0)             # LLM evaluation: 0.0 to 1.0
    llm_feedback = Column(Text, nullable=True)         # LLM explanation/feedback
    is_correct = Column(Boolean, default=False)        # True if llm_score >= 0.75
    created_at = Column(DateTime, default=datetime.utcnow)


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


