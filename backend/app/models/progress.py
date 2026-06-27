from sqlalchemy import Column, Integer, DateTime, ForeignKey, Float, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Progress(Base):
    __tablename__ = "progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)
    quiz_score = Column(Float, default=0.0)  # 0.0 to 1.0
    quiz_passed = Column(Boolean, default=False)
    time_spent_minutes = Column(Integer, default=0)
    concepts_mastered = Column(JSON, default=list)  # list of concepts mastered
    concepts_failed = Column(JSON, default=list)  # list of concepts to review
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", backref="progress")
    course = relationship("Course", back_populates="progress")
    lesson = relationship("Lesson", back_populates="progress")
