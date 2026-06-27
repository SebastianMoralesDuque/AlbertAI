# AlbertAI

Plataforma de aprendizaje adaptativo impulsada por IA que genera lecciones personalizadas, quizzes interactivos y juegos educativos según tu progreso real.

> **Stack:** FastAPI + React + PostgreSQL (pgvector) + Google Gemini + LangGraph

## Quick start

```bash
cp backend/.env.example backend/.env   # configurar credenciales
docker compose up -d                   # levantar backend + frontend + DB
docker compose exec backend alembic upgrade head   # migrar BD
```

Abrir http://localhost:5173

## Features

- **Lecciones generadas por IA** — adaptadas a tu nivel y conceptos fallados
- **Quizzes diarios** — evalúan retención y ajustan dificultad dinámicamente
- **Juegos educativos** — memoria, trivia, completar palabras, ordenar pasos
- **Sistema de rachas** — gamificación para mantener la constancia
- **Mapa de conocimiento vectorial** — embeddings pgvector para búsqueda semántica
- **Auth con GitHub** — OAuth + login email/contraseña como fallback

## Project structure

```
.
├── backend/                  # FastAPI + LangGraph + Gemini
│   ├── app/
│   │   ├── api/              # Rutas REST (auth, courses, lessons, streaks, games)
│   │   ├── core/             # Config (Pydantic) + DB (async SQLAlchemy)
│   │   ├── models/           # ORM (users, courses, lessons, progress, concepts + pgvector)
│   │   ├── schemas/          # Pydantic request/response models
│   │   ├── langgraph_agents/ # StateGraph: analyze → generate → evaluate → review
│   │   └── utils/            # JWT, bcrypt, get_current_user
│   ├── alembic/              # Migrations
│   └── requirements.txt
├── frontend/                 # React 19 + TypeScript + Tailwind v4 + Vite
│   ├── src/
│   │   ├── components/       # UI components (UserProfileModal)
│   │   ├── pages/            # LoginPage, AuthCallback, Dashboard
│   │   ├── contexts/         # AuthContext (JWT + user state)
│   │   └── App.tsx           # Router + ProtectedRoute
│   └── package.json
└── docker-compose.yml        # PostgreSQL 16/pgvector + backend + frontend
```

## Tech

| Layer | Stack |
|-------|-------|
| Backend | FastAPI, SQLAlchemy (async), Alembic, LangGraph, Gemini 3.1 Flash Lite |
| Database | PostgreSQL 16 + pgvector (vector embeddings) |
| Auth | JWT (python-jose), bcrypt, GitHub OAuth |
| Frontend | React 19, TypeScript, Tailwind v4, Vite |
| AI Agent | 6-node StateGraph: analyze → generate → evaluate → review/advance/create_game |
| Infra | Docker Compose, Coolify-ready |

## Environment

| Variable | Required | Default |
|----------|----------|---------|
| `DATABASE_URL` | ✅ | — |
| `GEMINI_API_KEY` | ✅ | — |
| `SECRET_KEY` | ✅ | `change-this-in-production` |
| `GITHUB_CLIENT_ID` | ✅ | — |
| `GITHUB_CLIENT_SECRET` | ✅ | — |
| `GITHUB_REDIRECT_URI` | — | `http://localhost:8000/api/auth/github/callback` |
| `FRONTEND_URL` | — | `http://localhost:5173` |
| `ALGORITHM` | — | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | — | `1440` (24h) |

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Registro email/contraseña |
| POST | `/api/auth/login` | Login, devuelve JWT |
| GET | `/api/auth/me` | Perfil del usuario actual |
| GET | `/api/auth/github/login` | Redirige a GitHub OAuth |
| GET | `/api/auth/github/callback` | Callback OAuth |
| POST | `/api/courses/` | Crear curso |
| GET | `/api/courses/` | Listar cursos |
| GET/PATCH/DELETE | `/api/courses/{id}` | CRUD curso |
| GET | `/api/lessons/course/{id}` | Lecciones de un curso |
| GET | `/api/lessons/{id}` | Contenido de lección |
| POST | `/api/lessons/{id}/quiz` | Enviar respuestas del quiz |
| GET | `/api/streaks/course/{id}` | Racha de estudio |
| POST | `/api/streaks/course/{id}/update` | Actualizar racha |
| GET | `/api/games/course/{id}` | Juegos del curso |
| POST | `/api/games/{id}/results` | Guardar resultado |
| GET | `/health` | Health check |

## Dev

### Local (sin Docker)

**Backend:**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # editar credenciales
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
pnpm install
pnpm dev   # http://localhost:5173
```

### Docker

```bash
docker compose up -d        # todo junto
docker compose logs -f      # seguir logs
docker compose exec backend alembic upgrade head
```

### Docs

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## License

MIT
