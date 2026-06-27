from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any, List
from app.models.game import GameType


class GameResponse(BaseModel):
    id: int
    course_id: int
    game_type: GameType
    title: str
    description: Optional[str]
    game_data: Dict[str, Any]
    difficulty: float
    created_at: datetime

    class Config:
        from_attributes = True


class GameResultCreate(BaseModel):
    game_id: int
    lesson_id: Optional[int] = None
    score: float
    time_spent_seconds: int
    completed: int
    details: Dict[str, Any] = {}


class GameResultResponse(BaseModel):
    id: int
    user_id: int
    game_id: int
    lesson_id: Optional[int]
    score: float
    time_spent_seconds: int
    completed: int
    details: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True
