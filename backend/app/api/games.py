from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.core.database import get_db
from app.models.user import User
from app.models.game import Game, GameResult
from app.schemas.game import GameResponse, GameResultCreate, GameResultResponse
from app.utils.auth import get_current_user

router = APIRouter(prefix="/games", tags=["games"])


@router.get("/course/{course_id}", response_model=List[GameResponse])
async def list_games(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Game).where(Game.course_id == course_id)
    )
    return result.scalars().all()


@router.get("/{game_id}", response_model=GameResponse)
async def get_game(
    game_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Juego no encontrado",
        )
    return game


@router.post("/{game_id}/results", response_model=GameResultResponse, status_code=status.HTTP_201_CREATED)
async def submit_game_result(
    game_id: int,
    result_data: GameResultCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify game exists
    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Juego no encontrado",
        )

    game_result = GameResult(
        user_id=current_user.id,
        game_id=game_id,
        lesson_id=result_data.lesson_id,
        score=result_data.score,
        time_spent_seconds=result_data.time_spent_seconds,
        completed=result_data.completed,
        details=result_data.details,
    )
    db.add(game_result)
    await db.commit()
    await db.refresh(game_result)
    return game_result


@router.get("/course/{course_id}/results", response_model=List[GameResultResponse])
async def list_game_results(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(GameResult)
        .join(Game)
        .where(
            Game.course_id == course_id,
            GameResult.user_id == current_user.id,
        )
    )
    return result.scalars().all()
