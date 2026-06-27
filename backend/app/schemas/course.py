from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.course import CourseLevel, CourseStatus


class CourseCreate(BaseModel):
    topic: str
    title: Optional[str] = None
    description: Optional[str] = None
    level: CourseLevel = CourseLevel.BEGINNER
    daily_minutes: int = 20
    total_days: int = 30


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[CourseStatus] = None
    daily_minutes: Optional[int] = None


class CourseResponse(BaseModel):
    id: int
    user_id: int
    title: str
    topic: str
    description: Optional[str]
    level: CourseLevel
    status: CourseStatus
    daily_minutes: int
    total_days: int
    current_day: int
    created_at: datetime

    class Config:
        from_attributes = True
