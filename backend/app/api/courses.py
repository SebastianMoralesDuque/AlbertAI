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
from app.services.learning_service import generate_lesson_for_course

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
