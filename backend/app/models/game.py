from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Float, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class GameType(str, enum.Enum):
    MEMORY = "memory"  # Find matching pairs
    FILL_BLANK = "fill_blank"  # Complete the word/phrase
    TRIVIA = "trivia"  # Multiple choice quiz
    ORDER_STEPS = "order_steps"  # Drag and drop ordering


class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    game_type = Column(Enum(GameType), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(String(500))
    game_data = Column(JSON, nullable=False)  # game-specific data
    difficulty = Column(Float, default=0.5)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class GameResult(Base):
    __tablename__ = "game_results"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=True)
    score = Column(Float, default=0.0)  # 0.0 to 1.0
    time_spent_seconds = Column(Integer, default=0)
    completed = Column(Integer, default=0)
    details = Column(JSON, default=dict)  # detailed results
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", backref="game_results")
    game = relationship("Game")
    lesson = relationship("Lesson", back_populates="game_results")
