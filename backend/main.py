from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from datetime import datetime
import tempfile
import shutil
import os
import uuid

from ats_processor import ATSProcessor
from database import save_candidate, update_decision

# -------------------------
# App setup
# -------------------------

app = FastAPI(title="ATS Resume Analyzer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

processor = ATSProcessor()

# -------------------------
# Constants & Schemas
# -------------------------

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
async def analyze_resume(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1].lower()

    if ext not in [".pdf", ".doc", ".docx"]:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    candidate_id = str(uuid.uuid4())

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        shutil.copyfileobj(file.file, tmp)
        temp_path = tmp.name

    try:
        analysis = processor.analyze_resume(temp_path)

        save_candidate(candidate_id, {
            "id": candidate_id,
            "filename": file.filename,
            "analysis": analysis,
            "decision": None,
            "uploaded_at": datetime.utcnow().isoformat(),
        })

        return {
            "candidate_id": candidate_id,
            "analysis": analysis
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

# -------------------------
# Decision Update
# -------------------------

@app.post("/decision")
def set_decision(payload: DecisionPayload):
    decision = payload.decision.upper()

    if decision == "REJECTED":
        if not payload.reason:
            raise HTTPException(
                status_code=400,
                detail="Reject reason required"
            )

        if payload.reason not in VALID_REJECT_REASONS:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Invalid reject reason",
                    "allowed": list(VALID_REJECT_REASONS),
                },
            )

    updated = update_decision(
        payload.candidate_id,
        decision,
        [payload.reason] if decision == "REJECTED" else None
    )

    if not updated:
        raise HTTPException(status_code=404, detail="Candidate not found")

    return {
        "status": "ok",
        "candidate": updated
    }