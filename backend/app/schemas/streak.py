from pydantic import BaseModel
from datetime import date, datetime


class StreakResponse(BaseModel):
    id: int
    user_id: int
    course_id: int
    current_streak: int
    longest_streak: int
    last_activity_date: date | None
    total_days_studied: int
    created_at: datetime

    class Config:
        from_attributes = True
