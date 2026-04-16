from typing import Dict
from datetime import datetime

# In-memory "database"
CANDIDATES: Dict[str, dict] = {}

def save_candidate(candidate_id: str, data: dict):
    CANDIDATES[candidate_id] = data

def get_candidate(candidate_id: str):
    return CANDIDATES.get(candidate_id)

from typing import List, Optional

def update_decision(candidate_id: str, decision: str, reasons: Optional[List[str]] = None):
    candidate = CANDIDATES.get(candidate_id)

    if not candidate:
        return None

    candidate["decision"] = decision

    if decision == "REJECTED":
        candidate["reject_reasons"] = reasons or []

    else:
        candidate["reject_reasons"] = None

    candidate["decided_at"] = datetime.utcnow().isoformat()

    return candidate


def get_all_candidates():
    return list(CANDIDATES.values())
