interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
}

interface Analysis {
  overallScore: number;
  personalInfo: PersonalInfo;
  [key: string]: any;
}

interface AnalysisStatus {
  status: 'processing' | 'completed' | 'failed' | 'unknown';
  progress?: number;
}

interface BackendStatus {
  available: boolean;
  url: string;
}

interface ModeInfo {
  mode: 'backend' | 'demo';
  features: string[];
}

class ATSApiService {
  private baseUrl = "https://osadiatsinitial-production.up.railway.app";

  async uploadResume(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${this.baseUrl}/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Upload failed");

  const result = await res.json();
  console.log("Upload result:", result);

  // Pass through duplicate detection fields
  if (result.duplicate) {
    return {
      duplicate: true,
      message: result.message,
      existing_candidate_id: result.existing_candidate_id,
      analysis: result.analysis,
      resumeId: result.existing_candidate_id,
    };
  }

  return {
    duplicate: false,
    resumeId: result.id ?? result.candidate_id,
    analysis: result.analysis,
  };
}

  async getAllResumes(): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/candidates`);
    if (!res.ok) throw new Error("Failed to fetch candidates");
    const data = await res.json();
    console.log("Candidates from backend:", data);
    return data;
  }

  async getResumeUrl(candidateId: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/resume-url/${candidateId}`);
    if (!res.ok) throw new Error("Failed to get resume URL");
    const data = await res.json();
    return data.url;
  }

  async setDecision(candidateId: string, decision: string, reason?: string, recruiter?: string) {
    const res = await fetch(`${this.baseUrl}/decision`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        candidate_id: String(candidateId),
        decision,
        reason: reason || null,
        recruiter: recruiter || null,
      }),
    });

    if (!res.ok) {
      const errBody = await res.json();
      console.error("Error detail:", errBody);
      throw new Error("Failed to update decision");
    }

    return res.json();
  }

  async exportAnalysis(ids: string[], format: string): Promise<Blob> {
    const res = await fetch(`${this.baseUrl}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, format }),
    });
    if (!res.ok) throw new Error("Export failed");
    return res.blob();
  }

  async getSettings(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/settings`);
    if (!res.ok) throw new Error("Failed to get settings");
    return res.json();
  }

  async saveSettings(settings: any): Promise<void> {
    const res = await fetch(`${this.baseUrl}/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error("Failed to save settings");
  }

  async login(password: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
  async verifyDeletePassword(password: string): Promise<boolean> {
  try {
    const res = await fetch(`${this.baseUrl}/verify-delete-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

  async exportCandidatesCSV(): Promise<void> {
    const res = await fetch(`${this.baseUrl}/export-csv`);
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'candidates_export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async resetSettings(): Promise<void> {
    const res = await fetch(`${this.baseUrl}/settings/reset`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Reset failed");
  }

  async deleteAllCandidates(): Promise<void> {
    const res = await fetch(`${this.baseUrl}/candidates/all`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Delete failed");
  }

  async getAnalysisStatus(): Promise<AnalysisStatus> {
    return { status: "completed", progress: 100 };
  }

  getBackendStatus(): BackendStatus {
    return {
      available: true,
      url: this.baseUrl,
    };
  }

  getModeInfo(): ModeInfo {
    return {
      mode: "backend",
      features: [
        "FastAPI backend",
        "Resume parsing",
        "Decision tracking",
      ],
    };
  }
}

export const atsApi = new ATSApiService();
