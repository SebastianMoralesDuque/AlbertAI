from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime


class LessonProgressItem(BaseModel):
    lesson_id: int
    day_number: int
    title: str
    lesson_type: str
    quiz_passed: bool
    best_score: float
    attempts: int


class ConceptDetail(BaseModel):
    name: str
    times_mastered: int
    times_failed: int
    mastery_rate: float  # 0.0 - 1.0


class LearningProfileResponse(BaseModel):
    # Course info
    course_id: int
    course_title: str
    course_topic: str
    course_level: str
    current_day: int
    total_days: int

    # Streak
    current_streak: int
    longest_streak: int
    total_days_studied: int

    # Aggregated learning profile (what the agent sees)
    mastered_concepts: List[str]
    failed_concepts: List[str]
    weak_areas: List[str]
    recent_scores: List[float]
    total_quiz_attempts: int
    best_overall_score: float
    last_quiz_score: float

    # Per-concept breakdown
    concept_details: List[ConceptDetail]

    # Per-lesson breakdown
    lessons: List[LessonProgressItem]
