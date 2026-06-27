from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class CourseStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"


class CourseLevel(str, enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    topic = Column(String(255), nullable=False)
    description = Column(Text)
    level = Column(Enum(CourseLevel), default=CourseLevel.BEGINNER)
    status = Column(Enum(CourseStatus), default=CourseStatus.ACTIVE)
    daily_minutes = Column(Integer, default=20)
    total_days = Column(Integer, default=30)
    current_day = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="courses")
    lessons = relationship("Lesson", back_populates="course", cascade="all, delete-orphan")
    progress = relationship("Progress", back_populates="course", cascade="all, delete-orphan")
    streaks = relationship("Streak", back_populates="course", cascade="all, delete-orphan")
