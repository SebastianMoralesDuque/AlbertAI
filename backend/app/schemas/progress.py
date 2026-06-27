from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


class ProgressCreate(BaseModel):
    course_id: int
    lesson_id: int
    quiz_score: float
    quiz_passed: bool
    time_spent_minutes: int
    concepts_mastered: List[str] = []
    concepts_failed: List[str] = []


class ProgressResponse(BaseModel):
    id: int
    user_id: int
    course_id: int
    lesson_id: int
    quiz_score: float
    quiz_passed: bool
    time_spent_minutes: int
    concepts_mastered: List[str]
    concepts_failed: List[str]
    completed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
