type Decision =
  | 'approved'
  | 'rejected'
  | 'kiv'
  | 'pending'
  | 'hired'
  | 'resigned'
  | 'absconded';

interface Candidate {
  id: string;
  fileName: string;
  analysis: any;

  decision: Decision;
  decidedAt: string | null;
  decisionReason?: string;

  hiredAt?: string;
  exitAt?: string;
  exitReason?: string;
}

class CandidateStore {
  private candidates: Candidate[] = [];

  /* ---------------- ADD / UPDATE ---------------- */

  addCandidate(candidate: Candidate) {
    this.candidates.push(candidate);
  }

  setDecision(
    id: string,
    decision: Decision,
    reason?: string
  ) {
    this.candidates = this.candidates.map(c =>
      c.id === id
        ? {
            ...c,
            decision,
            decisionReason: reason,
            decidedAt: new Date().toISOString(),
          }
        : c
    );
  }
  approveCandidate(id: string) {
    this.setDecision(id, "approved");
  }

  rejectCandidate(id: string, reason?: string) {
    this.setDecision(id, "rejected", reason);
  }

  kivCandidate(id: string, reason?: string) {
    this.setDecision(id, "kiv", reason);
  }

  /* ---------------- HIRING FLOW ---------------- */

  hireCandidate(id: string) {
    this.candidates = this.candidates.map(c =>
      c.id === id
        ? {
            ...c,
            decision: 'hired',
            hiredAt: new Date().toISOString(),
          }
        : c
    );
  }

  markResigned(id: string, reason?: string) {
    this.candidates = this.candidates.map(c =>
      c.id === id
        ? {
            ...c,
            decision: 'resigned',
            exitAt: new Date().toISOString(),
            exitReason: reason,
          }
        : c
    );
  }

  markAbsconded(id: string, reason?: string) {
    this.candidates = this.candidates.map(c =>
      c.id === id
        ? {
            ...c,
            decision: 'absconded',
            exitAt: new Date().toISOString(),
            exitReason: reason,
          }
        : c
    );
  }

  returnToAvailable(id: string) {
    this.candidates = this.candidates.map(c =>
      c.id === id
        ? {
            ...c,
            decision: 'approved',
            exitAt: undefined,
            exitReason: undefined,
          }
        : c
    );
  }

  /* ---------------- GETTERS ---------------- */

  getAll() {
    return this.candidates;
  }

  getApproved() {
    return this.candidates.filter(c => c.decision === 'approved');
  }

    getPending() {
    return this.candidates.filter(c => c.decision === "pending");
  }

  getHired() {
    return this.candidates.filter(c => c.decision === 'hired');
  }

  getRejected() {
    return this.candidates.filter(c => c.decision === 'rejected');
  }

  getKiv() {
    return this.candidates.filter(c => c.decision === 'kiv');
  }

  
  getExited() {
    return this.candidates.filter(
      c => c.decision === 'resigned' || c.decision === 'absconded'
    );
  }

  

  /* ---------------- STATS ---------------- */

  getStats() {
    return {
      approved: this.candidates.filter(c => c.decision === 'approved').length,
      rejected: this.candidates.filter(c => c.decision === 'rejected').length,
      kiv: this.candidates.filter(c => c.decision === 'kiv').length,
      hired: this.candidates.filter(c => c.decision === 'hired').length,
      exited: this.candidates.filter(
        c =>
          c.decision === 'resigned' ||
          c.decision === 'absconded'
      ).length,
      total: this.candidates.length,
    };
  }
}

export const candidateStore = new CandidateStore();
