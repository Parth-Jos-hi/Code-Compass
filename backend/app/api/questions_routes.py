"""
API routes for questions, answers, and mastery tracking.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional
import json

from app.db.database import get_db
from app.db.models import Question, UserAnswer, RepositoryNode
from app.core.path_utils import resolve_repository_file_path
from app.core.llm_engine import get_llm_engine

# Pydantic models
class QuestionResponse(BaseModel):
    id: int
    question_text: str
    question_type: str
    options_json: Optional[str]
    repo_name: str
    node_id: int
    
    class Config:
        from_attributes = True


class SubmitAnswerRequest(BaseModel):
    question_id: int
    user_response: str


class GenerateQuestionsRequest(BaseModel):
    repo_name: str


class SubmitAnswerResponse(BaseModel):
    score: float
    feedback: str
    is_correct: bool
    average_score: float
    mastery_eligible: bool


class MasteryStatus(BaseModel):
    node_id: int
    file_path: str
    is_mastered: bool
    average_score: float
    total_questions_answered: int
    correct_answers: int


router = APIRouter(prefix="/api/voyage", tags=["voyage"])


@router.get("/questions/{node_id}", response_model=List[QuestionResponse])
async def get_questions(
    node_id: int,
    repo_name: str,
    db: Session = Depends(get_db)
):
    """
    Get all questions for a specific repository node.
    """
    questions = db.query(Question).filter(
        Question.node_id == node_id,
        Question.repo_name == repo_name
    ).all()
    
    return questions


@router.post("/evaluate-answer", response_model=SubmitAnswerResponse)
async def evaluate_answer(
    request: SubmitAnswerRequest,
    db: Session = Depends(get_db)
):
    """
    Evaluate a user's answer using LLM.
    Returns score, feedback, and updated mastery status.
    """
    # Get the question
    question = db.query(Question).filter(Question.id == request.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Get LLM engine and evaluate
    llm = get_llm_engine()
    
    # Parse options if MCQ
    options_json = question.options_json
    if options_json:
        try:
            options = json.loads(options_json)
        except:
            options = None
    else:
        options = None
    
    # Evaluate using LLM
    evaluation = llm.evaluate_answer(
        question_text=question.question_text,
        user_response=request.user_response,
        question_type=question.question_type,
        correct_answer=question.correct_answer,
        code_context=None
    )
    
    # Store the answer
    user_answer = UserAnswer(
        question_id=request.question_id,
        repo_name=question.repo_name,
        user_response=request.user_response,
        llm_score=evaluation["score"],
        llm_feedback=evaluation["feedback"],
        is_correct=evaluation["is_correct"]
    )
    db.add(user_answer)
    db.commit()
    
    # Calculate average score for this node
    node = db.query(RepositoryNode).filter(RepositoryNode.id == question.node_id).first()
    if node:
        # Get all answers for questions on this node
        all_answers = db.query(UserAnswer).join(
            Question, UserAnswer.question_id == Question.id
        ).filter(Question.node_id == question.node_id).all()
        
        if all_answers:
            avg_score = sum(a.llm_score for a in all_answers) / len(all_answers)
            node.avg_score = avg_score
            
            # Auto-master if >= 75%
            if avg_score >= 0.75:
                node.is_mastered = True
            
            db.commit()
        else:
            avg_score = evaluation["score"]
    else:
        avg_score = evaluation["score"]
    
    return SubmitAnswerResponse(
        score=evaluation["score"],
        feedback=evaluation["feedback"],
        is_correct=evaluation["is_correct"],
        average_score=avg_score,
        mastery_eligible=avg_score >= 0.75
    )


@router.get("/mastery-status/{node_id}", response_model=MasteryStatus)
async def get_mastery_status(
    node_id: int,
    repo_name: str,
    db: Session = Depends(get_db)
):
    """
    Get mastery status for a node with answer statistics.
    """
    node = db.query(RepositoryNode).filter(
        RepositoryNode.id == node_id,
        RepositoryNode.repo_name == repo_name
    ).first()
    
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    # Count answers for questions on this node
    questions = db.query(Question).filter(
        Question.node_id == node_id
    ).all()
    
    question_ids = [q.id for q in questions]
    
    total_answers = 0
    correct_answers = 0
    
    if question_ids:
        total_answers = db.query(func.count(UserAnswer.id)).filter(
            UserAnswer.question_id.in_(question_ids)
        ).scalar() or 0
        
        correct_answers = db.query(func.count(UserAnswer.id)).filter(
            UserAnswer.question_id.in_(question_ids),
            UserAnswer.is_correct == True
        ).scalar() or 0
    
    return MasteryStatus(
        node_id=node_id,
        file_path=node.file_path,
        is_mastered=node.is_mastered,
        average_score=node.avg_score,
        total_questions_answered=total_answers,
        correct_answers=correct_answers
    )


@router.post("/generate-questions/{node_id}")
async def generate_questions_for_node(
    node_id: int,
    payload: GenerateQuestionsRequest,
    db: Session = Depends(get_db)
):
    """
    Generate questions for a node using LLM.
    """
    import os
    
    repo_name = payload.repo_name
    node = db.query(RepositoryNode).filter(
        RepositoryNode.id == node_id,
        RepositoryNode.repo_name == repo_name
    ).first()
    
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    # Read the actual code file
    file_path = node.file_path
    code_content = ""
    
    try:
        full_path = resolve_repository_file_path(file_path)
        if full_path:
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                code_content = f.read()
    except Exception as e:
        # Fallback if we can't read the file
        code_content = f"# Unable to read {file_path}: {str(e)}"
    
    # If we still don't have content, create a meaningful placeholder
    if not code_content or len(code_content.strip()) == 0:
        code_content = f"// File: {file_path}\n// Unable to load content"
    
    llm = get_llm_engine()
    
    # Generate questions with actual code
    result = llm.generate_questions(
        code_content=code_content,
        file_path=file_path,
        num_questions=3
    )
    
    # Store generated questions
    for q in result.get("questions", []):
        question = Question(
            repo_name=repo_name,
            node_id=node_id,
            question_text=q.get("question_text"),
            question_type=q.get("question_type", "mcq"),
            options_json=json.dumps(q.get("options", [])) if q.get("question_type") == "mcq" else None,
            correct_answer=q.get("correct_answer")
        )
        db.add(question)
    
    db.commit()
    
    return {"status": "success", "questions_generated": len(result.get("questions", []))}
