from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.core.database import get_db
from app.models.user import User
from app.models.course import Course
from app.schemas.course import CourseCreate, CourseResponse, CourseUpdate
from app.utils.auth import get_current_user

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
