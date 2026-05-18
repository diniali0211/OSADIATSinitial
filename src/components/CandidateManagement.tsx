import React, { useState, useEffect } from 'react';
import {
  Users,
  Download,
  Calendar,
  MapPin,
  Mail,
  Phone,
  MoreVertical,
} from 'lucide-react';

import { atsApi } from '../services/atsApi';

const RECRUITERS = [
  "Kayryinna B",
  "Jusnie R",
  "Masmera",
  "Ilham",
  "Liyana",
  "Armi",
  "Zawani",
];

export function CandidateManagement() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [recruiterModal, setRecruiterModal] = useState<{ open: boolean; candidateId: string | null }>({ open: false, candidateId: null });
  const [selectedRecruiter, setSelectedRecruiter] = useState('');

  const glassStyle = {
    backdropFilter: 'blur(16px)',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    boxShadow: '0 8px 32px rgba(31,38,135,0.15)',
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  useEffect(() => {
    filterAndSortCandidates();
  }, [candidates, searchTerm, sortBy, sortOrder]);

  const loadCandidates = async () => {
    try {
      const data = await atsApi.getAllResumes();
      const approved = data
        .filter((c: any) => c.status === "APPROVED")
        .map((c: any) => {
          // Parse experience from resume_text
          let totalYears = null;
          try {
            if (typeof c.resume_text === 'string') {
              const match = c.resume_text.match(/'totalYears':\s*(\d+)/);
              if (match) {
                totalYears = parseInt(match[1]);
              }
            }
          } catch {}

          return {
            id: c.id,
            fileName: c.name || "Resume",
            uploadedAt: c.created_at,
            resume_url: c.resume_url,
            analysis: {
              overallScore: c.score,
              personalInfo: {
                name: c.name,
                email: c.email,
                phone: c.phone,
                location: c.location,
              },
              experience: { totalYears: totalYears },
            },
            decision: "approved",
          };
        });
      setCandidates(approved);
    } catch (err) {
      console.error("Failed to load candidates", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortCandidates = () => {
    let filtered = [...candidates];

    if (searchTerm) {
      filtered = filtered.filter((candidate) =>
        candidate.fileName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      let aVal: number = 0;
      let bVal: number = 0;
      switch (sortBy) {
        case 'date':
        default:
          aVal = new Date(a.uploadedAt).getTime();
          bVal = new Date(b.uploadedAt).getTime();
          break;
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    setFilteredCandidates(filtered);
  };

  const confirmHire = async () => {
    if (!recruiterModal.candidateId || !selectedRecruiter) return;
    await atsApi.setDecision(
      String(recruiterModal.candidateId),
      "HIRED",
      undefined,
      selectedRecruiter
    );
    setRecruiterModal({ open: false, candidateId: null });
    setSelectedRecruiter('');
    await loadCandidates();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return { background: '#dcfce7', color: '#15803d' };
    if (score >= 60) return { background: '#fef9c3', color: '#854d0e' };
    if (score >= 40) return { background: '#ffedd5', color: '#c2410c' };
    return { background: '#fee2e2', color: '#dc2626' };
  };

  const exportSelected = async () => {
    const ids =
      selectedCandidates.size > 0
        ? Array.from(selectedCandidates)
        : filteredCandidates.map((c) => c.id);
    const blob = await atsApi.exportAnalysis(ids, 'csv');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'candidates_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
          Candidate Management
        </h1>

        <button
          onClick={exportSelected}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-teal-500 text-white rounded-xl"
        >
          <Download className="w-4 h-4 inline mr-2" />
          Export
        </button>
      </div>

      {/* Candidates */}
      {filteredCandidates.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCandidates.map((candidate) => (
            <div
              key={candidate.id}
              className="rounded-2xl p-6 shadow-xl"
              style={glassStyle}
            >
              {/* Top */}
              <div className="flex justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">
                    {candidate.analysis?.personalInfo?.name || candidate.fileName}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {candidate.analysis?.experience?.totalYears
                      ? `${candidate.analysis.experience.totalYears} years experience`
                      : "Experience not detected"}
                  </p>
                  <p className="text-sm text-gray-600">
                    {candidate.uploadedAt
                      ? new Date(candidate.uploadedAt).toLocaleDateString()
                      : "-"}
                  </p>
                </div>

                {/* Fixed Approved Badge */}
                <span style={{
                  padding: '4px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: '#22c55e',
                  color: 'white',
                  height: 'fit-content',
                }}>
                  APPROVED
                </span>
              </div>

              {/* Contact Info */}
              <div className="space-y-1 mb-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-400" />
                  <span>{candidate.analysis?.personalInfo?.email || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-purple-400" />
                  <span>{candidate.analysis?.personalInfo?.phone || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-purple-400" />
                  <span>{candidate.analysis?.personalInfo?.location || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span>{candidate.uploadedAt
                    ? new Date(candidate.uploadedAt).toLocaleDateString()
                    : '-'}</span>
                </div>
              </div>

              {/* Bottom */}
              <div className="flex justify-between items-center">
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: '600',
                  ...getScoreColor(candidate.analysis?.overallScore || 0)
                }}>
                  {candidate.analysis?.overallScore || 0}%
                </span>

                <div className="flex gap-2 items-center">
                  <button
                    onClick={async () => {
                      try {
                        if (!candidate.resume_url) {
                          alert("No resume uploaded for this candidate");
                          return;
                        }
                        const url = await atsApi.getResumeUrl(String(candidate.id));
                        window.open(url, '_blank');
                      } catch (err) {
                        console.error("View resume error:", err);
                        alert("Resume not available");
                      }
                    }}
                    style={{ padding: '4px 12px', background: '#f3e8ff', color: '#7c3aed', borderRadius: '8px', fontSize: '12px', fontWeight: '500', border: 'none', cursor: 'pointer' }}
                  >
                    View Resume
                  </button>

                  <button
                    onClick={() => setRecruiterModal({ open: true, candidateId: String(candidate.id) })}
                    style={{ padding: '4px 12px', background: '#2563eb', color: 'white', borderRadius: '8px', fontSize: '12px', fontWeight: '500', border: 'none', cursor: 'pointer' }}
                  >
                    Hire
                  </button>

                  <MoreVertical className="w-4 h-4 cursor-pointer" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="w-12 h-12 mx-auto text-purple-500 mb-3" />
          <h3>No Candidates Found</h3>
        </div>
      )}

      {/* Recruiter Modal */}
      {recruiterModal.open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
          }}>
            <h3 style={{ color: '#2563eb', fontWeight: '600', fontSize: '18px', marginBottom: '8px' }}>
              Select Recruiter
            </h3>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
              Who is hiring this candidate?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {RECRUITERS.map((recruiter) => (
                <button
                  key={recruiter}
                  onClick={() => setSelectedRecruiter(recruiter)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: selectedRecruiter === recruiter ? '2px solid #2563eb' : '1px solid #d1d5db',
                    background: selectedRecruiter === recruiter ? '#eff6ff' : 'white',
                    color: selectedRecruiter === recruiter ? '#2563eb' : '#374151',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: selectedRecruiter === recruiter ? '600' : '400',
                  }}
                >
                  {recruiter}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => {
                  setRecruiterModal({ open: false, candidateId: null });
                  setSelectedRecruiter('');
                }}
                style={{ padding: '8px 16px', borderRadius: '8px', background: '#f3f4f6', color: '#374151', fontSize: '14px', border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmHire}
                disabled={!selectedRecruiter}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: selectedRecruiter ? '#2563eb' : '#93c5fd',
                  color: 'white',
                  fontSize: '14px',
                  border: 'none',
                  cursor: selectedRecruiter ? 'pointer' : 'not-allowed'
                }}
              >
                Confirm Hire
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}