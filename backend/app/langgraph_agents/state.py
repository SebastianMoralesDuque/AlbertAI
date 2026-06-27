from typing import TypedDict, List, Optional, Dict, Any
from pydantic import BaseModel


class LearningState(TypedDict):
    """State that travels through the LangGraph learning agent."""
    # User context
    user_id: int
    course_id: int
    current_day: int

    # Course info
    topic: str
    level: str
    daily_minutes: int

    # Learning progress
    concepts_mastered: List[str]
    concepts_failed: List[str]
    concept_map: Dict[str, float]  # concept -> mastery level

    # Current lesson
    lesson_content: Optional[str]
    lesson_concepts: List[str]
    quiz_data: Optional[Dict[str, Any]]

    # Quiz results
    quiz_score: Optional[float]
    quiz_passed: Optional[bool]
    concepts_learned: List[str]

    # Game context
    needs_game: bool
    game_type: Optional[str]
    game_data: Optional[Dict[str, Any]]

    # Agent decisions
    next_action: str  # "generate_lesson", "evaluate", "create_game", "review", "advance"
    difficulty_adjustment: float  # -0.1 to 0.1

    # Metadata
    messages: List[Dict[str, Any]]
