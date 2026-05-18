const BASE_URL = "http://192.168.1.5:8000";

export const atsApi = {
  analyzeResume: async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${BASE_URL}/analyze`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Analysis failed");
    }

    const result = await res.json();
    return result.analysis;
  },

  createCandidate: async (data) => {
    const res = await fetch(`${BASE_URL}/candidates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return res.json();
  },

  // 🔥 THIS IS THE IMPORTANT PART
  uploadResume: async (file) => {
    // 1. Analyze resume
    const analysis = await atsApi.analyzeResume(file);

    // 2. Prepare data for DB
    const candidate = {
      name: analysis.personalInfo?.name || "Unknown",
      email: analysis.personalInfo?.email || "",
      phone: analysis.personalInfo?.phone || "",
      location: analysis.personalInfo?.location || "",
      score: analysis.overallScore || 0,
      resume_text: JSON.stringify(analysis),
    };

    // 3. Save to backend DB
    const saved = await atsApi.createCandidate(candidate);

    // 4. Return combined result (for UI)
    return {
      id: saved.id,
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
      analysis: analysis,
      decision: "pending",
    };
  },
};