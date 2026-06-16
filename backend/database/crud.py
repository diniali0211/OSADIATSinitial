from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from .models import Candidate
from datetime import datetime

async def create_candidate(db: AsyncSession, data: dict):
    new_candidate = Candidate(
        name          = data.get("name"),
        email         = data.get("email"),
        phone         = data.get("phone"),
        location      = data.get("location"),
        score         = data.get("score"),
        resume_text   = data.get("resume_text"),
        resume_url    = data.get("resume_url"),
        status        = data.get("status", "PENDING"),
        role_applied  = data.get("role_applied"),
        reject_reason = None,
        recuiter_name = None,
    )

    db.add(new_candidate)
    await db.commit()
    await db.refresh(new_candidate)

    return new_candidate


async def update_decision(db: AsyncSession, candidate_id: int, decision: str, reason: str = None, recruiter: str = None):
    result = await db.execute(
        select(Candidate).where(Candidate.id == candidate_id)
    )
    candidate = result.scalars().first()

    if not candidate:
        return None

    candidate.status = decision

    if decision == "ABSCONDED" and reason:
        candidate.abscond_date = reason
    elif decision == "REJECTED" and reason:
        candidate.reject_reason = reason
    elif decision == "HIRED":
        if recruiter:
            candidate.recuiter_name = recruiter
        candidate.hired_date = datetime.utcnow()

    await db.commit()
    await db.refresh(candidate)

    return candidate
