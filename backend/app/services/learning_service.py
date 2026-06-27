"""
Adaptive lesson generation service using Gemini AI.
Generates personalized lessons based on the student's progress history,
past mistakes, and mastery level.
"""
import json
import re
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from app.core.config import get_settings
from app.models.course import Course
from app.models.lesson import Lesson
from app.models.progress import Progress
from app.models.concept import UserConcept
from app.services.concept_service import get_user_mastery_profile, ensure_concept

settings = get_settings()

llm = ChatGoogleGenerativeAI(
    model="gemini-3.1-flash-lite",
    google_api_key=settings.gemini_api_key,
    temperature=0.7,
)


async def get_course_history(course_id: int, db: AsyncSession) -> dict:
    """Gather the student's full learning history for adaptive prompting.

    Uses the structured memory (user_concepts) for concept mastery data
    — O(1) per concept, no full table scan. Falls back to scanning
    progress records if user_concepts hasn't been populated yet.

    Returns dict with:
      - mastered_concepts: concepts with mastery >= 70%
      - failed_concepts: concepts with mastery < 70%
      - weak_areas: concepts that appear most often in failed lists
      - recent_scores: last 5 quiz scores
      - total_attempts: total quiz submissions
      - best_score: max quiz score across all attempts
      - last_score: most recent quiz score
    """
    # Get course to find user_id
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    user_id = course.user_id if course else None

    # ── Concept mastery from structured memory (user_concepts) ─────
    if user_id:
        concept_profile = await get_user_mastery_profile(db, user_id)
        has_memory = concept_profile["concept_count"] > 0
    else:
        concept_profile = None
        has_memory = False

    # ── Score data from progress (always needed, but with LIMIT) ────
    result = await db.execute(
        select(Progress)
        .where(Progress.course_id == course_id)
        .order_by(Progress.created_at.desc())
    )
    records: List[Progress] = result.scalars().all()

    recent_scores = [r.quiz_score for r in records[:5] if r.quiz_score is not None]
    total_attempts = len(records)
    best_score = max((r.quiz_score for r in records if r.quiz_score is not None), default=0.0)
    last_score = records[0].quiz_score if records and records[0].quiz_score is not None else 0.0

    # ── If structured memory exists, use it — no concept scan needed ──
    if has_memory and concept_profile:
        return {
            "mastered_concepts": concept_profile["mastered_concepts"],
            "failed_concepts": concept_profile["failed_concepts"],
            "weak_areas": concept_profile["weak_areas"],
            "recent_scores": recent_scores,
            "total_attempts": total_attempts,
            "best_score": best_score,
            "last_score": last_score,
        }

    # ── Fallback: scan progress records (backward compat) ────────────
    if not records:
        return {
            "mastered_concepts": [],
            "failed_concepts": [],
            "weak_areas": [],
            "recent_scores": [],
            "total_attempts": 0,
            "best_score": 0.0,
            "last_score": 0.0,
        }

    concept_stats: dict[str, list[float]] = {}
    for r in records:
        for c in (r.concepts_mastered or []):
            concept_stats.setdefault(c, []).append(1.0)
        for c in (r.concepts_failed or []):
            concept_stats.setdefault(c, []).append(0.0)

    mastered = []
    failed = []
    weak_counter: dict[str, int] = {}

    for concept, scores in concept_stats.items():
        avg = sum(scores) / len(scores)
        if avg >= 0.7:
            mastered.append(concept)
        else:
            failed.append(concept)

    for r in records:
        for c in (r.concepts_failed or []):
            weak_counter[c] = weak_counter.get(c, 0) + 1

    weak_areas = sorted(weak_counter, key=weak_counter.get, reverse=True)[:5]

    return {
        "mastered_concepts": mastered,
        "failed_concepts": failed,
        "weak_areas": weak_areas,
        "recent_scores": recent_scores,
        "total_attempts": total_attempts,
        "best_score": best_score,
        "last_score": last_score,
    }


def _extract_concepts_from_markdown(markdown: str) -> list[str]:
    """Extract concept/topic words from the lesson content."""
    # Look for a "Conceptos clave" or "Temas" section
    lines = markdown.split("\n")
    concepts = []
    capture = False
    for line in lines:
        stripped = line.strip().lower()
        if any(kw in stripped for kw in ["conceptos clave", "temas de la", "palabras clave", "vocabulario"]):
            capture = True
            continue
        if capture:
            if stripped.startswith("##") or stripped.startswith("---"):
                break
            # Extract words after bullet points or numbers
            cleaned = re.sub(r"^[\s\-*\d.]+", "", stripped).strip()
            if cleaned and len(cleaned) > 2:
                concepts.append(cleaned)
    if not concepts:
        # Fallback: extract from first heading and key nouns
        for line in lines:
            if line.startswith("## "):
                title = line.replace("## ", "").strip()
                concepts = [title]
                break
    return concepts[:5]


async def generate_lesson_for_course(
    course: Course,
    db: AsyncSession,
) -> Optional[Lesson]:
    """Generate an ADAPTIVE lesson for the given course using Gemini AI.

    The prompt includes the student's full history so Gemini can:
    - Reinforce concepts the student has failed before
    - Skip or accelerate concepts already mastered
    - Adjust difficulty based on past performance
    """
    # ── Gather student history ──────────────────────────────────────
    history = await get_course_history(course.id, db)

    # Build the "weak areas" context block for the prompt
    weak_context = ""
    if history["weak_areas"]:
        weak_context = f"""
- Conceptos que el estudiante HA FALLADO antes (priorizarlos): {', '.join(history['weak_areas'])}
- Debe reforzar estos conceptos y asegurarte de que los entienda"""

    if history["mastered_concepts"]:
        weak_context += f"""
- Conceptos que YA DOMINA (puede mencionarlos brevemente pero no necesita repetirlos): {', '.join(history['mastered_concepts'])}"""

    if history["recent_scores"]:
        avg_recent = sum(history["recent_scores"]) / len(history["recent_scores"])
        trend = "mejorando" if len(history["recent_scores"]) > 1 and history["recent_scores"][0] > history["recent_scores"][-1] else "estable"
        weak_context += f"""
- Rendimiento reciente: puntaje promedio {avg_recent:.0%}, tendencia {trend}
- Dificultad objetivo: {'más accesible' if avg_recent < 0.6 else 'moderada' if avg_recent < 0.8 else 'desafiante'}"""

    level_name = {"beginner": "principiante", "intermediate": "intermedio", "advanced": "avanzado"}.get(course.level, "principiante")

    # ── 1. Generate lesson content ──────────────────────────────────
    content_prompt = f"""
Eres un profesor experto en {course.topic}. Generá una lección educativa en español.

## Contexto del estudiante
- Tema: {course.topic}
- Nivel: {level_name}
- Día del curso: {course.current_day} de {course.total_days}
- Tiempo disponible: {course.daily_minutes} minutos
- Intentos de quiz realizados: {history["total_attempts"]}
{weak_context}

## Instrucciones pedagógicas
1. Empezá con un título atractivo en formato "## Título"
2. Si el estudiante tiene conceptos fallidos, dedicá una sección a reforzarlos con ejemplos nuevos
3. Introducí 1 o 2 conceptos NUEvos relacionados con el tema del día
4. Usá ejemplos prácticos y concretos adaptados al nivel {level_name}
5. Incluí al menos un ejemplo resuelto paso a paso
6. Terminá con un resumen de los puntos clave
7. Extensión: que se pueda leer en {course.daily_minutes} minutos
8. Respondé SOLO con el contenido markdown, sin introducciones ni despedidas

## Formato
## Título de la lección

[contenido en markdown con secciones, ejemplos y resumen]
"""
    content_response = await llm.ainvoke([HumanMessage(content=content_prompt)])
    lesson_markdown = content_response.content.strip()

    # Extract title
    title_match = re.search(r"^##\s+(.+)$", lesson_markdown, re.MULTILINE)
    title = title_match.group(1).strip() if title_match else f"Día {course.current_day}: {course.topic}"

    # Extract concepts
    concepts = _extract_concepts_from_markdown(lesson_markdown)
    if not concepts:
        concepts = [course.topic]

    # Normalize concepts into the structured memory (concepts table)
    for concept_name in concepts:
        await ensure_concept(db, concept_name)

    # ── 2. Generate quiz questions ──────────────────────────────────
    # Make quiz adaptive: if weak areas exist, include questions about them
    weak_focus = ""
    if history["weak_areas"]:
        weak_focus = f"""
- Incluí AL MENOS 2 preguntas que evalúen los conceptos débiles: {', '.join(history['weak_areas'][:3])}"""

    quiz_prompt = f"""
Generá 5 preguntas de opción múltiple en español para evaluar esta lección.

## Contexto
- Tema: {course.topic}
- Nivel: {level_name}
- Día: {course.current_day}
{weak_focus}

Contenido de la lección:
{lesson_markdown[:2500]}

## Instrucciones
- 5 preguntas con 4 opciones cada una (0-3)
- La respuesta correcta es el ÍNDICE de la opción correcta (0, 1, 2 o 3)
- Dificultad progresiva: las primeras 2 fáciles, la 3 y 4 intermedias, la 5 más desafiante
- Cada pregunta debe evaluar un concepto diferente
- Incluí una explicación DIDÁCTICA de por qué es correcta (no solo "es correcta")
- Si el estudiante falló conceptos antes, poné preguntas que refuercen esos conceptos

Respondé SOLO con JSON válido, sin markdown:

{{"questions": [
  {{
    "question": "Pregunta 1",
    "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
    "correct_answer": 0,
    "explanation": "Por qué es correcta y por qué las otras no"
  }},
  ...
]}}
"""
    quiz_response = await llm.ainvoke([HumanMessage(content=quiz_prompt)])
    raw_quiz = quiz_response.content.strip()
    raw_quiz = re.sub(r"^```(?:json)?\s*", "", raw_quiz)
    raw_quiz = re.sub(r"\s*```$", "", raw_quiz)

    quiz_data = {"questions": []}
    try:
        parsed = json.loads(raw_quiz)
        if "questions" in parsed:
            quiz_data = parsed
    except json.JSONDecodeError:
        json_match = re.search(r"\{.*\}", raw_quiz, re.DOTALL)
        if json_match:
            try:
                parsed = json.loads(json_match.group())
                if "questions" in parsed:
                    quiz_data = parsed
            except json.JSONDecodeError:
                pass

    # If quiz has no questions, generate fallback
    if not quiz_data["questions"]:
        quiz_data = {
            "questions": [
                {
                    "question": f"¿Cuál es el concepto principal de la lección {title}?",
                    "options": [course.topic, "Ninguno", "Todos", "No sé"],
                    "correct_answer": 0,
                    "explanation": f"El tema principal de esta lección es {course.topic}."
                }
            ]
        }

    # ── 3. Determine lesson type ────────────────────────────────────
    day_mod = (course.current_day - 1) % 3
    lesson_types = ["theory", "practice", "review"]
    lesson_type = lesson_types[day_mod]

    # ── 4. Save to database ─────────────────────────────────────────
    # Calculate adaptive difficulty based on history
    base_difficulty = 0.3 + (course.current_day / course.total_days) * 0.5
    if history["best_score"] > 0:
        # If student is doing well, increase difficulty
        if history["best_score"] >= 0.9:
            base_difficulty = min(1.0, base_difficulty + 0.15)
        elif history["best_score"] <= 0.5:
            base_difficulty = max(0.1, base_difficulty - 0.15)

    lesson = Lesson(
        course_id=course.id,
        day_number=course.current_day,
        title=title,
        content=lesson_markdown,
        lesson_type=lesson_type,
        concepts=concepts,
        quiz_data=quiz_data,
        estimated_minutes=course.daily_minutes,
        difficulty=round(base_difficulty, 2),
    )
    db.add(lesson)

    # ── 5. Advance course day ───────────────────────────────────────
    if course.current_day < course.total_days:
        course.current_day += 1

    await db.commit()
    await db.refresh(lesson)

    return lesson
