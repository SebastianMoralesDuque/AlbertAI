from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from contextlib import asynccontextmanager
from app.core.config import get_settings
from app.api import api_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"🚀 {settings.app_name} v{settings.app_version} starting...")
    yield
    # Shutdown
    print(f"👋 {settings.app_name} shutting down...")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Plataforma de aprendizaje adaptativo con IA",
    lifespan=lifespan,
)

# Session middleware (required by Authlib)
app.add_middleware(SessionMiddleware, secret_key=settings.secret_key)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router)


@app.get("/")
async def root():
    return {
        "message": f"¡Bienvenido a {settings.app_name}!",
        "version": settings.app_version,
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
