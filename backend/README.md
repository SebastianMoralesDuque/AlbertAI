# Backend - Plataforma de Aprendizaje Adaptativo

## Tecnologías
- **FastAPI** - Framework web asíncrono
- **SQLAlchemy** - ORM para PostgreSQL
- **LangGraph** - Orquestación de agentes IA
- **Gemini** - Modelo de lenguaje para generación de contenido

## Estructura
```
backend/
├── app/
│   ├── api/          # Rutas API
│   ├── core/         # Configuración y database
│   ├── models/       # Modelos SQLAlchemy
│   ├── schemas/      # Schemas Pydantic
│   ├── services/     # Lógica de negocio
│   ├── langgraph_agents/  # Agentes IA
│   └── utils/        # Utilidades (auth, etc.)
├── alembic/          # Migraciones
├── requirements.txt
└── .env.example
```

## Instalación

1. Crear entorno virtual:
```bash
python -m venv venv
source venv/bin/activate
```

2. Instalar dependencias:
```bash
pip install -r requirements.txt
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus valores
```

4. Ejecutar migraciones:
```bash
alembic upgrade head
```

5. Iniciar servidor:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener usuario actual

### Cursos
- `POST /api/courses/` - Crear curso
- `GET /api/courses/` - Listar cursos
- `GET /api/courses/{id}` - Obtener curso
- `PATCH /api/courses/{id}` - Actualizar curso
- `DELETE /api/courses/{id}` - Eliminar curso

### Lecciones
- `GET /api/lessons/course/{course_id}` - Listar lecciones del curso
- `GET /api/lessons/{id}` - Obtener lección
- `POST /api/lessons/{id}/quiz` - Enviar quiz

### Rachas
- `GET /api/streaks/course/{course_id}` - Obtener racha
- `POST /api/streaks/course/{course_id}/update` - Actualizar racha

### Juegos
- `GET /api/games/course/{course_id}` - Listar juegos
- `GET /api/games/{id}` - Obtener juego
- `POST /api/games/{id}/results` - Enviar resultado
- `GET /api/games/course/{course_id}/results` - Resultados del curso

## Documentación
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
