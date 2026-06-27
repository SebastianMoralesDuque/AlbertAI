from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.core.database import get_db
from app.models.user import User
from app.models.course import Course
from app.models.lesson import Lesson
from app.models.progress import Progress
from app.schemas.lesson import LessonResponse, QuizSubmission, QuizResult
from app.utils.auth import get_current_user

router = APIRouter(prefix="/lessons", tags=["lessons"])


@router.get("/course/{course_id}", response_model=List[LessonResponse])
async def list_lessons(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify course belongs to user
    result = await db.execute(
        select(Course).where(
            Course.id == course_id,
            Course.user_id == current_user.id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado",
        )

    result = await db.execute(
        select(Lesson)
        .where(Lesson.course_id == course_id)
        .order_by(Lesson.day_number)
    )
    return result.scalars().all()


@router.get("/{lesson_id}", response_model=LessonResponse)
async def get_lesson(
    lesson_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lección no encontrada",
        )
    return lesson


@router.post("/{lesson_id}/quiz", response_model=QuizResult)
async def submit_quiz(
    lesson_id: int,
    submission: QuizSubmission,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Get lesson
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lección no encontrada",
        )

    # Calculate score
    quiz_data = lesson.quiz_data
    questions = quiz_data.get("questions", [])
    correct = 0
    concepts_mastered = []
    concepts_failed = []

    for i, answer in enumerate(submission.answers):
        if i < len(questions):
            question = questions[i]
            if answer == question.get("correct_answer"):
                correct += 1
                # Add concept to mastered
                for concept in lesson.concepts:
                    if concept not in concepts_mastered:
                        concepts_mastered.append(concept)
            else:
                # Add concept to failed
                for concept in lesson.concepts:
                    if concept not in concepts_failed:
                        concepts_failed.append(concept)

    score = correct / len(questions) if questions else 0.0
    passed = score >= 0.7  # 70% to pass

    # Create progress record
    progress = Progress(
        user_id=current_user.id,
        course_id=lesson.course_id,
        lesson_id=lesson_id,
        quiz_score=score,
        quiz_passed=passed,
        time_spent_minutes=submission.time_spent_seconds // 60,
        concepts_mastered=concepts_mastered,
        concepts_failed=concepts_failed,
    )
    db.add(progress)
    await db.commit()

    # Generate feedback
    if passed:
        feedback = f"¡Excelente! Obtuviste {score:.0%}. Has dominado los conceptos de esta lección."
    else:
        feedback = f"Obtuviste {score:.0%}. Necesitas repasar: {', '.join(concepts_failed)}"

    return QuizResult(
        score=score,
        passed=passed,
        concepts_mastered=concepts_mastered,
        concepts_failed=concepts_failed,
        feedback=feedback,
    )
