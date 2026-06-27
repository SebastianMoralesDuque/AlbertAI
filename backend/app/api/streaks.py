from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date, timedelta
from app.core.database import get_db
from app.models.user import User
from app.models.streak import Streak
from app.schemas.streak import StreakResponse
from app.utils.auth import get_current_user

router = APIRouter(prefix="/streaks", tags=["streaks"])


@router.get("/course/{course_id}", response_model=StreakResponse)
async def get_streak(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Streak).where(
            Streak.user_id == current_user.id,
            Streak.course_id == course_id,
        )
    )
    streak = result.scalar_one_or_none()
    if not streak:
        # Create new streak
        streak = Streak(
            user_id=current_user.id,
            course_id=course_id,
        )
        db.add(streak)
        await db.commit()
        await db.refresh(streak)
    return streak


@router.post("/course/{course_id}/update", response_model=StreakResponse)
async def update_streak(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Streak).where(
            Streak.user_id == current_user.id,
            Streak.course_id == course_id,
        )
    )
    streak = result.scalar_one_or_none()
    if not streak:
        streak = Streak(
            user_id=current_user.id,
            course_id=course_id,
        )
        db.add(streak)

    today = date.today()
    yesterday = today - timedelta(days=1)

    if streak.last_activity_date == today:
        # Already studied today, no change
        pass
    elif streak.last_activity_date == yesterday:
        # Continuing streak
        streak.current_streak += 1
        streak.last_activity_date = today
    else:
        # Streak broken, start new
        streak.current_streak = 1
        streak.last_activity_date = today

    # Update longest streak
    if streak.current_streak > streak.longest_streak:
        streak.longest_streak = streak.current_streak

    streak.total_days_studied += 1
    await db.commit()
    await db.refresh(streak)
    return streak
