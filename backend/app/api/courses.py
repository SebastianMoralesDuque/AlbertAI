from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.core.database import get_db
from app.models.user import User
from app.models.course import Course
from app.models.lesson import Lesson
from app.models.progress import Progress
from app.schemas.course import CourseCreate, CourseResponse, CourseUpdate, LessonProgressResponse
from app.schemas.lesson import LessonResponse
from app.utils.auth import get_current_user
from app.services.learning_service import generate_lesson_for_course, get_course_history
from app.models.streak import Streak
from app.schemas.learning_profile import LearningProfileResponse, ConceptDetail, LessonProgressItem

router = APIRouter(prefix="/courses", tags=["courses"])


@router.post("/", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
async def create_course(
    course_data: CourseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Auto-generate title if not provided
    title = course_data.title or f"Aprender {course_data.topic}"

    course = Course(
        user_id=current_user.id,
        title=title,
        topic=course_data.topic,
        description=course_data.description,
        level=course_data.level,
        daily_minutes=course_data.daily_minutes,
        total_days=course_data.total_days,
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)

    # Auto-generate the first lesson
    try:
        await generate_lesson_for_course(course, db)
    except Exception as e:
        # Log but don't fail — lesson gen can be retried later
        print(f"[courses] First lesson auto-generation failed: {e}")

    return course


@router.get("/", response_model=List[CourseResponse])
async def list_courses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Course).where(Course.user_id == current_user.id)
    )
    return result.scalars().all()


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Course).where(
            Course.id == course_id,
            Course.user_id == current_user.id,
        )
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado",
        )
    return course


@router.patch("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: int,
    course_data: CourseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Course).where(
            Course.id == course_id,
            Course.user_id == current_user.id,
        )
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado",
        )

    update_data = course_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(course, field, value)

    await db.commit()
    await db.refresh(course)
    return course


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Course).where(
            Course.id == course_id,
            Course.user_id == current_user.id,
        )
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado",
        )
    await db.delete(course)
    await db.commit()


@router.get("/{course_id}/progress", response_model=LessonProgressResponse)
async def get_course_progress(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get progress summary for each lesson in the course."""
    # Verify course
    result = await db.execute(
        select(Course).where(
            Course.id == course_id,
            Course.user_id == current_user.id,
        )
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado",
        )

    # Get all lessons
    result = await db.execute(
        select(Lesson)
        .where(Lesson.course_id == course_id)
        .order_by(Lesson.day_number)
    )
    lessons = result.scalars().all()

    items = []
    for lesson in lessons:
        # Get all progress records for this lesson
        prog_result = await db.execute(
            select(Progress)
            .where(
                Progress.user_id == current_user.id,
                Progress.lesson_id == lesson.id,
            )
            .order_by(Progress.created_at.desc())
        )
        records = prog_result.scalars().all()

        passed = any(r.quiz_passed for r in records)
        best_score = max((r.quiz_score for r in records if r.quiz_score is not None), default=0.0)
        attempts = len(records)

        items.append({
            "lesson_id": lesson.id,
            "day_number": lesson.day_number,
            "title": lesson.title,
            "quiz_passed": passed,
            "best_score": best_score,
            "attempts": attempts,
        })

    return {
        "course_id": course_id,
        "total_lessons": len(lessons),
        "lessons": items,
    }


@router.get("/{course_id}/learning-profile", response_model=LearningProfileResponse)
async def get_learning_profile(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the full learning profile — what the AI agent knows about you."""

    # Verify course
    result = await db.execute(
        select(Course).where(
            Course.id == course_id,
            Course.user_id == current_user.id,
        )
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado",
        )

    # Get streak data
    result = await db.execute(
        select(Streak).where(
            Streak.user_id == current_user.id,
            Streak.course_id == course_id,
        )
    )
    streak = result.scalar_one_or_none()

    # Get learning history (what the agent uses)
    history = await get_course_history(course_id, db)

    # Get per-lesson progress
    result = await db.execute(
        select(Lesson)
        .where(Lesson.course_id == course_id)
        .order_by(Lesson.day_number)
    )
    lessons = result.scalars().all()

    lessons_items = []
    concept_stats: dict[str, dict] = {}

    for lesson in lessons:
        prog_result = await db.execute(
            select(Progress)
            .where(
                Progress.user_id == current_user.id,
                Progress.lesson_id == lesson.id,
            )
            .order_by(Progress.created_at.desc())
        )
        records = prog_result.scalars().all()

        passed = any(r.quiz_passed for r in records)
        best_score = max((r.quiz_score for r in records if r.quiz_score is not None), default=0.0)

        # Aggregate concept stats per lesson
        for r in records:
            for c in (r.concepts_mastered or []):
                s = concept_stats.setdefault(c, {"mastered": 0, "failed": 0})
                s["mastered"] += 1
            for c in (r.concepts_failed or []):
                s = concept_stats.setdefault(c, {"mastered": 0, "failed": 0})
                s["failed"] += 1

        lessons_items.append(LessonProgressItem(
            lesson_id=lesson.id,
            day_number=lesson.day_number,
            title=lesson.title,
            lesson_type=lesson.lesson_type,
            quiz_passed=passed,
            best_score=best_score,
            attempts=len(records),
        ))

    # Build concept details
    concept_details = [
        ConceptDetail(
            name=name,
            times_mastered=s["mastered"],
            times_failed=s["failed"],
            mastery_rate=s["mastered"] / max(1, s["mastered"] + s["failed"]),
        )
        for name, s in sorted(concept_stats.items(),
                              key=lambda x: x[1]["mastered"] / max(1, x[1]["mastered"] + x[1]["failed"]))
    ]

    return LearningProfileResponse(
        course_id=course.id,
        course_title=course.title,
        course_topic=course.topic,
        course_level=course.level,
        current_day=course.current_day,
        total_days=course.total_days,
        current_streak=streak.current_streak if streak else 0,
        longest_streak=streak.longest_streak if streak else 0,
        total_days_studied=streak.total_days_studied if streak else 0,
        mastered_concepts=history["mastered_concepts"],
        failed_concepts=history["failed_concepts"],
        weak_areas=history["weak_areas"],
        recent_scores=history["recent_scores"],
        total_quiz_attempts=history["total_attempts"],
        best_overall_score=history["best_score"],
        last_quiz_score=history["last_score"],
        concept_details=concept_details,
        lessons=lessons_items,
    )


@router.post("/{course_id}/generate-lesson", response_model=LessonResponse)
async def generate_lesson(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a new lesson for this course using Gemini AI."""
    result = await db.execute(
        select(Course).where(
            Course.id == course_id,
            Course.user_id == current_user.id,
        )
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado",
        )

    if course.current_day > course.total_days:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El curso ya está completo",
        )

    # ── Day-lock: previous lesson must be passed ────────────────────
    if course.current_day > 1:
        prev_day = course.current_day - 1
        result = await db.execute(
            select(Lesson).where(
                Lesson.course_id == course.id,
                Lesson.day_number == prev_day,
            )
        )
        prev_lesson = result.scalar_one_or_none()
        if prev_lesson:
            result = await db.execute(
                select(Progress).where(
                    Progress.user_id == current_user.id,
                    Progress.lesson_id == prev_lesson.id,
                    Progress.quiz_passed == True,
                ).limit(1)
            )
            prev_passed = result.scalar_one_or_none()
            if not prev_passed:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Primero tenés que aprobar el quiz del Día {prev_day} "
                        f"antes de pasar al Día {course.current_day}."
                    ),
                )

    try:
        lesson = await generate_lesson_for_course(course, db)
        if not lesson:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo generar la lección",
            )
        return lesson
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar la lección: {str(e)}",
        )
