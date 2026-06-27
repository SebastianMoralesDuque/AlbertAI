from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    day_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    lesson_type = Column(String(50), default="theory")  # theory, practice, review
    concepts = Column(JSON, default=list)  # list of concept names covered
    quiz_data = Column(JSON, default=dict)  # quiz questions and answers
    estimated_minutes = Column(Integer, default=20)
    difficulty = Column(Float, default=0.5)  # 0.0 to 1.0
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    course = relationship("Course", back_populates="lessons")
    progress = relationship("Progress", back_populates="lesson", cascade="all, delete-orphan")
    game_results = relationship("GameResult", back_populates="lesson", cascade="all, delete-orphan")
