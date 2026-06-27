from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from pgvector.sqlalchemy import Vector


class Concept(Base):
    __tablename__ = "concepts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(String(500))
    category = Column(String(100))  # e.g., "javascript", "react", "general"
    embedding = Column(Vector(1536))  # for similarity search
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user_concepts = relationship("UserConcept", back_populates="concept", cascade="all, delete-orphan")


class UserConcept(Base):
    __tablename__ = "user_concepts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    concept_id = Column(Integer, ForeignKey("concepts.id"), nullable=False)
    mastery_level = Column(Float, default=0.0)  # 0.0 to 1.0
    times_practiced = Column(Integer, default=0)
    times_failed = Column(Integer, default=0)
    last_practiced = Column(DateTime(timezone=True))
    embedding = Column(Vector(1536))  # user's personal embedding for this concept
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="user_concepts")
    concept = relationship("Concept", back_populates="user_concepts")
