"""
Structured memory service for the AI agent.

Normalizes concept names into a relational table and tracks per-user
mastery levels incrementally — no full table scans needed.

This is the agent's persistent memory: instead of rebuilding the student
profile from raw progress records every time, we update user_concepts
on each quiz submission and read the aggregated view directly.
"""

from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.concept import Concept, UserConcept


async def ensure_concept(db: AsyncSession, name: str) -> Concept:
    """Find an existing concept by name or create a new one (normalized)."""
    result = await db.execute(select(Concept).where(Concept.name == name))
    concept = result.scalar_one_or_none()
    if not concept:
        concept = Concept(name=name)
        db.add(concept)
        await db.flush()
    return concept


async def record_quiz_outcome(
    db: AsyncSession,
    user_id: int,
    concept_names: List[str],
    passed: bool,
) -> None:
    """Update the agent's structured memory after a quiz attempt.

    For each concept in the lesson:
    1. Normalize it into the concepts table (create if new)
    2. Create or update the user's user_concept row with an
       exponential moving average for mastery_level

    EMA formula:  new_mastery = 0.3 * old + 0.7 * outcome
    This weights recent performance higher than old data.
    """
    now = datetime.now(timezone.utc)
    outcome = 1.0 if passed else 0.0

    for name in concept_names:
        concept = await ensure_concept(db, name)

        result = await db.execute(
            select(UserConcept).where(
                UserConcept.user_id == user_id,
                UserConcept.concept_id == concept.id,
            )
        )
        uc = result.scalar_one_or_none()

        if uc:
            # Exponential moving average — recent performance matters more
            uc.mastery_level = round(0.3 * (uc.mastery_level or 0.0) + 0.7 * outcome, 4)
            uc.times_practiced = (uc.times_practiced or 0) + 1
            if not passed:
                uc.times_failed = (uc.times_failed or 0) + 1
            uc.last_practiced = now
        else:
            uc = UserConcept(
                user_id=user_id,
                concept_id=concept.id,
                mastery_level=outcome,
                times_practiced=1,
                times_failed=0 if passed else 1,
                last_practiced=now,
            )
            db.add(uc)

    await db.flush()


async def get_user_mastery_profile(
    db: AsyncSession,
    user_id: int,
    course_id: Optional[int] = None,
) -> dict:
    """Read the agent's structured memory about this user.

    Returns the same shape as get_course_history() so it's a
    drop-in replacement — but sourced from user_concepts instead
    of scanning all progress records.
    """
    query = (
        select(UserConcept)
        .where(UserConcept.user_id == user_id)
    )
    result = await db.execute(query)
    rows: List[UserConcept] = result.scalars().all()

    mastered = []
    failed = []
    weak_counter: dict[str, int] = {}

    for uc in rows:
        name = uc.concept.name
        if uc.mastery_level >= 0.7:
            mastered.append(name)
        else:
            failed.append(name)
            # Track how many times they've failed this concept
            weak_counter[name] = weak_counter.get(name, 0) + (uc.times_failed or 0)

    weak_areas = sorted(weak_counter, key=weak_counter.get, reverse=True)[:5]

    return {
        "mastered_concepts": mastered,
        "failed_concepts": failed,
        "weak_areas": weak_areas,
        "concept_count": len(rows),
    }
