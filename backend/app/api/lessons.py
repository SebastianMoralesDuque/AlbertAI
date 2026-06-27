from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.core.database import get_db
from app.models.user import User
from app.models.course import Course
from app.models.lesson import Lesson
from app.models.progress import Progress
from app.schemas.lesson import LessonResponse, QuizSubmission, QuizResult, QuestionResult
from app.utils.auth import get_current_user
from app.services.concept_service import record_quiz_outcome

router = APIRouter(prefix="/lessons", tags=["lessons"])


@router.get("/course/{course_id}", response_model=List[LessonResponse])
async def list_lessons(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all lessons for a course."""
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
    """Submit quiz answers. Supports unlimited retries — keeps best score."""
    # ── Get lesson ──────────────────────────────────────────────────
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lección no encontrada",
        )

    quiz_data = lesson.quiz_data
    questions = quiz_data.get("questions", [])
    if not questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta lección no tiene preguntas de quiz",
        )

    # ── Validate answers ────────────────────────────────────────────
    if len(submission.answers) != len(questions):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Se esperaban {len(questions)} respuestas, se recibieron {len(submission.answers)}",
        )

    # ── Grade ───────────────────────────────────────────────────────
    correct_count = 0
    question_results: List[QuestionResult] = []
    concepts_mastered: List[str] = []
    concepts_failed: List[str] = []

    for i, (answer_idx, question) in enumerate(zip(submission.answers, questions)):
        is_correct = answer_idx == question.get("correct_answer")
        if is_correct:
            correct_count += 1

        qr = QuestionResult(
            question_index=i,
            question=question.get("question", ""),
            selected_answer=answer_idx,
            correct_answer=question.get("correct_answer", 0),
            is_correct=is_correct,
            explanation=question.get("explanation", ""),
        )
        question_results.append(qr)

    score = correct_count / len(questions)
    passed = score >= 0.7

    # ── Attribute concepts to mastered/failed ───────────────────────
    # If >= 60% of questions are correct, concepts are "mastered"
    # This is per-lesson, not per-question, to avoid noise
    if passed:
        concepts_mastered = list(lesson.concepts or [])
    else:
        concepts_failed = list(lesson.concepts or [])

    # ── Get existing progress or create new ─────────────────────────
    result = await db.execute(
        select(Progress).where(
            Progress.user_id == current_user.id,
            Progress.lesson_id == lesson_id,
        ).order_by(Progress.created_at.desc())
    )
    existing_progress = result.scalars().all()

    # Count attempts
    attempts = len(existing_progress) + 1
    best_score = max((p.quiz_score for p in existing_progress if p.quiz_score is not None), default=0.0)
    best_score = max(best_score, score)

    # Merge concepts across all attempts
    all_mastered = set()
    all_failed = set()
    for p in existing_progress:
        all_mastered.update(p.concepts_mastered or [])
        all_failed.update(p.concepts_failed or [])
    all_mastered.update(concepts_mastered)

    # ── Update agent's structured memory (user_concepts) ────────────
    all_lesson_concepts = list(lesson.concepts or [])
    if all_lesson_concepts:
        await record_quiz_outcome(db, current_user.id, all_lesson_concepts, passed)

    # ── Save new progress record ────────────────────────────────────
    progress = Progress(
        user_id=current_user.id,
        course_id=lesson.course_id,
        lesson_id=lesson_id,
        quiz_score=score,
        quiz_passed=passed,
        time_spent_minutes=submission.time_spent_seconds // 60,
        concepts_mastered=list(all_mastered),
        concepts_failed=list(all_failed),
    )
    db.add(progress)
    await db.commit()

    # ── Build feedback ──────────────────────────────────────────────
    if passed:
        if attempts == 1:
            feedback = f"¡Excelente! Aprobaste al primer intento con {score:.0%}. Seguí así."
        else:
            feedback = f"¡Bien! Aprobaste en tu intento #{attempts} con {score:.0%}. (Mejor puntaje: {best_score:.0%})"
    else:
        wrong_qs = [qr for qr in question_results if not qr.is_correct]
        topics_to_review = lesson.concepts[:3] if lesson.concepts else []
        if wrong_qs:
            feedback = (
                f"Obtuviste {score:.0%}. Necesitás repasar. "
                f"Fallaste {len(wrong_qs)} de {len(questions)} preguntas. "
                f"Revisá los conceptos: {', '.join(topics_to_review)}. "
                f"¡Intentalo de nuevo!"
            )
        else:
            feedback = f"Obtuviste {score:.0%}. ¡Seguí practicando y volvé a intentar!"

    return QuizResult(
        score=score,
        passed=passed,
        attempts=attempts,
        best_score=best_score,
        concepts_mastered=list(all_mastered),
        concepts_failed=list(all_failed),
        feedback=feedback,
        question_results=question_results,
    )
