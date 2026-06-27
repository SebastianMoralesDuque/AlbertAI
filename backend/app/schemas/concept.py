from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ConceptResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    category: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class UserConceptResponse(BaseModel):
    id: int
    user_id: int
    concept_id: int
    mastery_level: float
    times_practiced: int
    times_failed: int
    last_practiced: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
