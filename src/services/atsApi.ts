// ATS API Service - TypeScript Implementation
interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
}

interface Section {
  name: string;
  score: number;
  status: string;
  found: boolean;
}

interface Skill {
  name: string;
  confidence: number;
  category: string;
}

interface Experience {
  totalYears: number;
  positions: Array<{
    title: string;
    company: string;
    duration: string;
    skills: string[];
  }>;
}

interface Education {
  degree: string;
  institution: string;
  year: string;
}

interface JobMatch {
  title: string;
  matchPercentage: number;
  missingSkills: string[];
  strengths: string[];
  recommendations: string[];
}

interface Keywords {
  found: string[];
  missing: string[];
  density: number;
}

interface Formatting {
  score: number;
  issues: string[];
}

interface Analysis {
  overallScore: number;
  personalInfo: PersonalInfo;
  sections: Section[];
  skills: Skill[];
  experience: Experience;
  education: Education[];
  jobMatch: JobMatch;
  keywords: Keywords;
  formatting: Formatting;
  analysisDate: string;
  textLength: number;
}

interface Resume {
  id: string;
  filename: string;
  uploadDate: string;
  status: 'completed' | 'processing' | 'failed' | 'queued';
  analysis?: Analysis;
}

interface JobProfile {
  id: string;
  title: string;
  requiredSkills: string[];
  preferredSkills: string[];
  minimumExperience: number;
  description: string;
}

interface AnalysisStatus {
  status: 'processing' | 'completed' | 'failed' | 'unknown';
  progress?: number;
}

interface UploadResponse {
  jobId: string;
  resumeId: string;
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
  private baseUrl = "http://127.0.0.1:8000";
  private results = new Map<string, any>();

  /**
   * Upload resume and get analysis from FastAPI backend
   */
  async analyzeResume(file: File): Promise<Analysis> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${this.baseUrl}/analyze`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Resume analysis failed");
    }

    const result = await response.json();

    // Backend already returns { analysis: {...} }
    return result.analysis;
  }

    /**
   * Dashboard expects this
   * Backend does not persist resumes yet
   * 
   */


  async getJobProfiles() {
  // Temporary backend-compatible stub
  return [
    {
      id: "default",
      title: "Software Engineer",
      requiredSkills: ["python", "javascript", "react", "sql"],
      preferredSkills: [],
      minimumExperience: 1,
      description: "Default job profile"
    }
  ];
}


  async getAllResumes(): Promise<Resume[]> {
    return [];
  }

  /**
   * Resume Analyzer expects this
   */
      async uploadResume(file: File) {
    const analysis = await this.analyzeResume(file);

    const resumeId = crypto.randomUUID();
    const jobId = "sync-job";

    // Store result so UI can fetch it later
    this.results.set(resumeId, analysis);

    return { jobId, resumeId };
  }



  /**
   * Analysis result passthrough
   */
      async getAnalysisResult(resumeId: string) {
    const analysis = this.results.get(resumeId);

    if (!analysis) {
      throw new Error("Analysis not ready");
    }

    return analysis;
  }



  /**
   * Backend runs synchronously
   */
  async getAnalysisStatus(): Promise<AnalysisStatus> {
    return { status: "completed", progress: 100 };
  }

  /**
   * Backend availability
   */
  getBackendStatus(): BackendStatus {
    return {
      available: true,
      url: this.baseUrl,
    };
  }

  /**
   * App mode info
   */
  getModeInfo(): ModeInfo {
    return {
      mode: "backend",
      features: [
        "FastAPI backend",
        "Real resume parsing",
        "NLP-based extraction",
      ],
    };
  }
}








// Export singleton instance
export const atsApi = new ATSApiService();