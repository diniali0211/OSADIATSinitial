from fastapi import FastAPI, UploadFile, File, HTTPException,Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List
from datetime import datetime
import tempfile
import shutil
import io
import os
import uuid
import csv
import sqlalchemy as sa

from ats_processor import ATSProcessor
from database.connection import get_db
from database.crud import create_candidate, update_decision
from database.models import Candidate, Settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from database.models import Candidate
from r2_storage import upload_pdf, get_pdf_url

# -------------------------
# App setup
# -------------------------

print("MAIN.PY  IS RUNNING")

from database.connection import engine, Base

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

app = FastAPI(title="ATS Resume Analyzer")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],

)

processor = ATSProcessor()


# -------------------------
# Constants & Schemas
# -------------------------


VALID_DECISIONS = {
    "APPROVED","REJECTED","KIV","HIRED","RESIGNED","ABSCONDED"
}

VALID_REJECT_REASONS = {
    "INCOMPLETE",
    "LOW_SKILL",
    "INSTRUCTIONS",
    "LEVEL_MISMATCH",
    "CULTURE",
    "VETTING",
}

class DecisionPayload(BaseModel):
    candidate_id: str
    decision: str
    reason: str | None = None
    recruiter: str | None = None

# -------------------------
# Health Check
# -------------------------

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat()
    }

# -------------------------
# Resume Analysis
# -------------------------

@app.post("/analyze")
async def analyze_resume(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    ext = os.path.splitext(file.filename)[1].lower()

    if ext not in [".pdf", ".doc", ".docx"]:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    candidate_id = str(uuid.uuid4())

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        shutil.copyfileobj(file.file, tmp)
        temp_path = tmp.name

    try:
        analysis = processor.analyze_resume(temp_path)

        try:
            unique_filename = f"{uuid.uuid4()}_{file.filename}"
            pdf_key = upload_pdf(temp_path, unique_filename)
        except Exception as r2_error:
            print(f"R2 UPLOAD ERROR: {r2_error}")
            pdf_key = None

        candidate = await create_candidate(db, {

            "name": analysis.get("personalInfo", {}).get("name"),
            "email": analysis.get("personalInfo", {}).get("email"),
            "phone": analysis.get("personalInfo", {}).get("phone"),
            "location" : analysis.get("personalInfo", {}).get("location"),
            "score":analysis.get("overallScore", 0),
            "resume_text": str(analysis),
            "resume_url": pdf_key,
        })

        return {
            "candidate_id": str(candidate.id),
            "analysis": analysis
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)



# -------------------------

@app.post("/decision")
async def set_decision(
    payload: DecisionPayload,
    db: AsyncSession = Depends(get_db)
):
    decision = payload.decision.upper()

    if decision not in VALID_DECISIONS:
        raise HTTPException(status_code=400, detail="Invalid decision")


    if decision == "REJECTED":
        if not payload.reason:
            raise HTTPException(
                status_code=400,detail="Reject reason required")
        if payload.reason not in VALID_REJECT_REASONS:
            raise HTTPException(
                status_code=400,detail={"error": "Invalid reject reason","allowed": list(VALID_REJECT_REASONS)})

    updated = await update_decision(
        db,
        payload.candidate_id,
        decision,
        payload.reason,
        payload.recruiter
    )

    if not updated:
        raise HTTPException(status_code=404, detail="Candidate not found")

    return {
        "status": "ok",
        "candidate": updated
    }


@app.get("/candidates")
async def get_candidates(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Candidate))
    candidates = result.scalars().all()

    formatted = []

    for c in candidates:
        formatted.append({
        "id": c.id,
        "name": c.name,
        "email": c.email,
        "phone": c.phone,
        "location": c.location,
        "score": c.score,
        "status": c.status,
        "resume_text": c.resume_text,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "abscond_date": c.abscond_date,
        "resume_url": c.resume_url,
        "reject_reason": c.reject_reason,
        "recruiter_name": c.recuiter_name,

      })

    return formatted


@app.get("/resume-url/{candidate_id}")
async def get_resume_url(candidate_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Candidate).where(Candidate.id == candidate_id)
    )
    candidate = result.scalars().first()

    if not candidate or not candidate.resume_url:
        raise HTTPException(status_code=404, detail="Resume not found")

    url = get_pdf_url(candidate.resume_url)
    return {"url": url}


@app.get("/settings")
async def get_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Settings).where(Settings.id == 1))
    settings = result.scalars().first()
    if not settings:
        return {}
    return {
        "company_name": settings.company_name,
        "hr_name": settings.hr_name,
        "hr_email": settings.hr_email,
        "hiring_position": settings.hiring_position,
        "min_score": settings.min_score,
        "data_retention": settings.data_retention,
        "language": settings.language,
        "date_format": settings.date_format,
        "app_password": settings.app_password,
        "delete_password": settings.delete_password,
    }

@app.post("/settings")
async def save_settings(payload: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Settings).where(Settings.id == 1))
    settings = result.scalars().first()
    if not settings:
        settings = Settings(id=1)
        db.add(settings)

    settings.company_name = payload.get("company_name", settings.company_name)
    settings.hr_name = payload.get("hr_name", settings.hr_name)
    settings.hr_email = payload.get("hr_email", settings.hr_email)
    settings.hiring_position = payload.get("hiring_position", settings.hiring_position)
    settings.min_score = payload.get("min_score", settings.min_score)
    settings.data_retention = payload.get("data_retention", settings.data_retention)
    settings.language = payload.get("language", settings.language)
    settings.date_format = payload.get("date_format", settings.date_format)
    settings.app_password = payload.get("app_password", settings.app_password)
    settings.delete_password = payload.get("delete_password", settings.delete_password)

    await db.commit()
    await db.refresh(settings)
    return {"status":"ok"}



class DeletePasswordPayload(BaseModel):
    password: str

@app.post("/verify-delete-password")
async def verify_delete_password(payload: DeletePasswordPayload, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Settings).where(Settings.id == 1))
    settings = result.scalars().first()
    correct = settings.delete_password if settings else "delete124"
    if payload.password !=correct:
        raise HTTPException(status_code=401, detail="Invalid Password")
    return {"status": "ok"}


class LoginPayload(BaseModel):
    password: str

@app.post("/login")
async def login(payload: LoginPayload, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Settings).where(Settings.id == 1))
    settings = result.scalars().first()

    correct_password = settings.app_password if settings else "admin123"

    if payload.password != correct_password:
        raise HTTPException(status_code=401, detail="Invalid password")

    return {"status": "ok", "message": "Login Successful"}


@app.get("/export-csv")
async def export_csv(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Candidate))
    candidates = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID","Name","Email","Phone","Location","Score","Status","Reject Reason","Resume URL","Created At","Abscond Date","Recruiter"])

    for c in candidates:
        writer.writerow([
            c.id, c.name, c.email, c.phone, c.location,
            c.score, c.status, c.reject_reason, c.resume_url,
            c.created_at, c.abscond_date, c.recuiter_name
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=candidates_export.csv"}
    )


@app.post("/settings/reset")
async def reset_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Settings).where(Settings.id == 1))
    settings = result.scalars().first()
    if not settings:
        return {"status": "ok"}

    settings.company_name = "My company"
    settings.hr_name = ""
    settings.hr_email = ""
    settings.hiring_position = ""
    settings.min_score = 50.0
    settings.data_retention = "90"
    settings.language = "en"
    settings.date_format = "DD/MM/YYYY"
    settings.app_password = "admin123"

    await db.commit()
    return {"status": "ok"}


@app.delete("/candidates/all")
async def delete_all_candidates(db: AsyncSession = Depends(get_db)):
    await db.execute(sa.text("DELETE FROM candidates"))
    await db.commit()
    return {"status": "ok"}
