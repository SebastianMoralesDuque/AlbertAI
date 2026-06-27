from fastapi import APIRouter
from app.api import auth, courses, lessons, streaks, games

api_router = APIRouter(prefix="/api")

api_router.include_router(auth.router)
api_router.include_router(courses.router)
api_router.include_router(lessons.router)
api_router.include_router(streaks.router)
api_router.include_router(games.router)
