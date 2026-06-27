"""
Service layer for generating lessons and quizzes using Gemini.
Connects the LangGraph agent to the database persistence layer.
"""
import json
import re
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from app.core.config import get_settings
from app.models.course import Course
from app.models.lesson import Lesson

settings = get_settings()

llm = ChatGoogleGenerativeAI(
    model="gemini-3.1-flash-lite",
    google_api_key=settings.gemini_api_key,
    temperature=0.7,
)


async def generate_lesson_for_course(
    course: Course,
    db: AsyncSession,
) -> Optional[Lesson]:
    """Generate a new lesson for the given course using Gemini AI.

    Steps:
    1. Build a prompt with the course context
    2. Call Gemini to get lesson content (markdown)
    3. Call Gemini to get quiz questions (JSON)
    4. Save the Lesson record to the database
    5. Update course.current_day
    6. Return the created lesson
    """
    # ── 1. Generate lesson content ──────────────────────────────────
    content_prompt = f"""
Eres un profesor experto en {course.topic}. Generá una lección educativa en español.

Contexto:
- Tema: {course.topic}
- Nivel del estudiante: {course.level} (beginner = principiante, intermediate = intermedio, advanced = avanzado)
- Día del curso: {course.current_day} de {course.total_days}
- Tiempo disponible: {course.daily_minutes} minutos
- Los conceptos deben ser adecuados para el día {course.current_day} de un curso de {course.total_days} días

Requisitos:
1. Título atractivo que empiece con "## " (markdown heading level 2)
2. Explicación clara y didáctica
3. Ejemplos prácticos adaptados al nivel
4. Tips o curiosidades
5. Extensión: que se pueda leer en {course.daily_minutes} minutos
6. Respondé SOLO con el contenido markdown, sin introducciones ni despedidas

Formato:
## Título de la lección

[contenido de la lección en markdown]
"""
    content_response = await llm.ainvoke([HumanMessage(content=content_prompt)])
    lesson_markdown = content_response.content.strip()

    # Extract title from first ## heading
    title_match = re.search(r"^##\s+(.+)$", lesson_markdown, re.MULTILINE)
    title = title_match.group(1).strip() if title_match else f"Día {course.current_day}: {course.topic}"
    concepts_match = re.search(r"(?:conceptos?|temas?|palabras clave)[:\s]+(.+)$", lesson_markdown[:500], re.IGNORECASE | re.MULTILINE)
    concepts = []
    if concepts_match:
        raw = concepts_match.group(1)
        concepts = [c.strip().strip(".*-") for c in re.split(r"[,;]\s*", raw) if c.strip()]

    # ── 2. Generate quiz questions ──────────────────────────────────
    quiz_prompt = f"""
Generá 5 preguntas de opción múltiple en español para evaluar esta lección:

Tema: {course.topic}
Nivel: {course.level}
Día: {course.current_day}

Contenido de la lección:
{lesson_markdown[:2000]}

Instrucciones:
- 5 preguntas con 4 opciones cada una
- La respuesta correcta es el ÍNDICE (0-3) de la opción correcta en el array options
- Incluí una explicación breve para cada respuesta correcta
- Dificultad progresiva (las primeras más fáciles)

Respondé SOLO con JSON válido, sin markdown ni explicaciones adicionales:

{{"questions": [
  {{
    "question": "Pregunta 1",
    "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
    "correct_answer": 0,
    "explanation": "Por qué es correcta la opción A"
  }},
  ...
]}}
"""
    quiz_response = await llm.ainvoke([HumanMessage(content=quiz_prompt)])
    raw_quiz = quiz_response.content.strip()

    # Strip markdown code fences if present
    raw_quiz = re.sub(r"^```(?:json)?\s*", "", raw_quiz)
    raw_quiz = re.sub(r"\s*```$", "", raw_quiz)

    quiz_data = {"questions": []}
    try:
        parsed = json.loads(raw_quiz)
        if "questions" in parsed:
            quiz_data = parsed
    except json.JSONDecodeError:
        # Fallback: try to extract JSON object from the text
        json_match = re.search(r"\{.*\}", raw_quiz, re.DOTALL)
        if json_match:
            try:
                parsed = json.loads(json_match.group())
                if "questions" in parsed:
                    quiz_data = parsed
            except json.JSONDecodeError:
                pass

    # ── 3. Determine lesson type ────────────────────────────────────
    day_mod = (course.current_day - 1) % 3
    lesson_types = ["theory", "practice", "review"]
    lesson_type = lesson_types[day_mod]

    # ── 4. Save to database ─────────────────────────────────────────
    lesson = Lesson(
        course_id=course.id,
        day_number=course.current_day,
        title=title,
        content=lesson_markdown,
        lesson_type=lesson_type,
        concepts=concepts if concepts else [course.topic],
        quiz_data=quiz_data,
        estimated_minutes=course.daily_minutes,
        difficulty=0.3 + (course.current_day / course.total_days) * 0.5,
    )
    db.add(lesson)

    # ── 5. Advance course day ───────────────────────────────────────
    if course.current_day < course.total_days:
        course.current_day += 1

    await db.commit()
    await db.refresh(lesson)

    return lesson
