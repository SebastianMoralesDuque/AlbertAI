from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any


class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: int  # index of correct option
    explanation: str


class LessonResponse(BaseModel):
    id: int
    course_id: int
    day_number: int
    title: str
    content: str
    lesson_type: str
    concepts: List[str]
    quiz_data: Dict[str, Any]
    estimated_minutes: int
    difficulty: float
    created_at: datetime

    class Config:
        from_attributes = True


class QuizSubmission(BaseModel):
    lesson_id: int
    answers: List[int]  # list of selected option indices
    time_spent_seconds: int


class QuizResult(BaseModel):
    score: float
    passed: bool
    concepts_mastered: List[str]
    concepts_failed: List[str]
    feedback: str
