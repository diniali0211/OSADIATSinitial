import React, { useEffect, useState } from "react";
import { atsApi } from "../services/atsApi";
import {
  CheckCircle,
  XCircle,
  Eye,
  Users,
} from "lucide-react";

const RECRUITERS = [
  "Kayryinna B",
  "Jusnie R",
  "Masmera",
  "Ilham",
  "Liyana",
  "Armi",
  "Zawani",
];

export function DecisionQueue() {
  const [kivCandidates, setKivCandidates] = useState<any[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; candidateId: string | null }>({ open: false, candidateId: null });
  const [rejectReason, setRejectReason] = useState('');
  const [recruiterModal, setRecruiterModal] = useState<{ open: boolean; candidateId: string | null }>({ open: false, candidateId: null });
  const [selectedRecruiter, setSelectedRecruiter] = useState('');

  const glassStyle = {
    backdropFilter: "blur(16px)",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    boxShadow: "0 8px 32px rgba(31,38,135,0.15)",
  };

  const loadKIV = async () => {
    try {
      const data = await atsApi.getAllResumes();
      const kiv = data
        .filter((c: any) => c.status === "KIV")
        .map((c: any) => {
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
            id: String(c.id),
            resume_url: c.resume_url,
            fileName: c.name || "Resume",
            decision: "kiv",
            analysis: {
              overallScore: c.score || 0,
              personalInfo: {
                name: c.name,
                email: c.email,
                phone: c.phone,
                location: c.location,
              },
              experience: {
                totalYears: totalYears,
              },
              skills: [],
            },
          };
        });
      setKivCandidates(kiv);
    } catch (err) {
      console.error("Failed to load KIV candidates", err);
    }
  };

  useEffect(() => {
    loadKIV();
  }, []);

  const REJECT_REASONS = [
    "INCOMPLETE",
    "LOW_SKILL",
    "INSTRUCTIONS",
    "LEVEL_MISMATCH",
    "CULTURE",
    "VETTING",
  ];

  const confirmReject = async () => {
    if (!rejectModal.candidateId || !rejectReason) return;
    await atsApi.setDecision(rejectModal.candidateId, "REJECTED", rejectReason);
    setRejectModal({ open: false, candidateId: null });
    setRejectReason('');
    setSelectedCandidate(null);
    await loadKIV();
  };

  const confirmHire = async () => {
    if (!recruiterModal.candidateId || !selectedRecruiter) return;
    await atsApi.setDecision(recruiterModal.candidateId, "HIRED", undefined, selectedRecruiter);
    setRecruiterModal({ open: false, candidateId: null });
    setSelectedRecruiter('');
    setSelectedCandidate(null);
    await loadKIV();
  };

  const openRecruiterModal = (candidateId: string) => {
    setRecruiterModal({ open: true, candidateId });
    setSelectedRecruiter('');
  };

  return (
    <div className="space-y-6">

      <h1 className="text-3xl bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
        Decision Queue (KIV)
      </h1>

      {kivCandidates.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {kivCandidates.map((candidate) => (
            <div
              key={candidate.id}
              className="rounded-2xl p-6 shadow-xl"
              style={glassStyle}
            >
              <div className="flex justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">
                    {candidate.analysis?.personalInfo?.name || candidate.fileName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Score: {candidate.analysis?.overallScore || 0}%
                  </p>
                </div>
                <span style={{ padding: '4px 12px', background: '#fef9c3', color: '#854d0e', borderRadius: '999px', fontSize: '12px', fontWeight: '600' }}>
                  KIV
                </span>
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button
                  onClick={async () => {
                    await atsApi.setDecision(candidate.id, "APPROVED");
                    await loadKIV();
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: '#16a34a', color: 'white', borderRadius: '8px', fontSize: '14px', border: 'none', cursor: 'pointer' }}
                >
                  <CheckCircle style={{ width: '16px', height: '16px' }} />
                  Approve
                </button>

                <button
                  onClick={() => setRejectModal({ open: true, candidateId: candidate.id })}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: '#dc2626', color: 'white', borderRadius: '8px', fontSize: '14px', border: 'none', cursor: 'pointer' }}
                >
                  <XCircle style={{ width: '16px', height: '16px' }} />
                  Reject
                </button>

                <button
                  onClick={() => setSelectedCandidate(candidate)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'white', color: '#374151', borderRadius: '8px', fontSize: '14px', border: '1px solid #d1d5db', cursor: 'pointer' }}
                >
                  <Eye style={{ width: '16px', height: '16px' }} />
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="w-12 h-12 mx-auto text-purple-500 mb-3" />
          <h3>No KIV candidates</h3>
        </div>
      )}

      {/* Candidate Review Modal */}
      {selectedCandidate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            width: '100%',
            maxWidth: '600px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
            position: 'relative',
          }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111' }}>Candidate Review</h2>
              <button
                onClick={() => setSelectedCandidate(null)}
                style={{ color: '#6b7280', fontSize: '20px', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111', marginBottom: '4px' }}>
                  {selectedCandidate.analysis?.personalInfo?.name}
                </h3>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                  {selectedCandidate.analysis?.experience?.totalYears
                    ? `${selectedCandidate.analysis.experience.totalYears} years experience`
                    : 'Experience not detected'}
                </p>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>
                  {selectedCandidate.fileName}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ padding: '6px 16px', background: '#f3e8ff', color: '#7c3aed', borderRadius: '999px', fontSize: '14px' }}>
                  {selectedCandidate.analysis?.overallScore || 0}%
                </span>
                <span style={{ padding: '6px 16px', background: '#fef9c3', color: '#854d0e', borderRadius: '999px', fontSize: '14px' }}>
                  kiv
                </span>
              </div>
            </div>

            {/* Skills */}
            {selectedCandidate.analysis?.skills?.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontWeight: '500', marginBottom: '8px', color: '#111' }}>Top Skills</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedCandidate.analysis.skills.slice(0, 10).map((s: any, index: number) => (
                    <span
                      key={index}
                      style={{ padding: '4px 12px', background: '#dbeafe', color: '#1d4ed8', borderRadius: '999px', fontSize: '12px' }}
                    >
                      {typeof s === 'string' ? s : s.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
              <button
                onClick={async () => {
                  try {
                    if (!selectedCandidate.resume_url) {
                      alert("No resume available for this candidate");
                      return;
                    }
                    const url = await atsApi.getResumeUrl(selectedCandidate.id);
                    window.open(url, '_blank');
                  } catch (err) {
                    console.error("View resume error:", err);
                    alert("Resume not available");
                  }
                }}
                style={{ padding: '8px 16px', background: '#f3e8ff', color: '#7c3aed', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px' }}
              >
                View Resume
              </button>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => openRecruiterModal(selectedCandidate.id)}
                  style={{ padding: '8px 20px', background: '#2563eb', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                >
                  Hire
                </button>

                <button
                  onClick={() => setRejectModal({ open: true, candidateId: selectedCandidate.id })}
                  style={{ padding: '8px 20px', background: '#dc2626', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                >
                  Reject
                </button>

                <button
                  onClick={() => setSelectedCandidate(null)}
                  style={{ padding: '8px 20px', background: '#f3f4f6', color: '#374151', borderRadius: '8px', border: '1px solid #d1d5db', cursor: 'pointer', fontSize: '14px' }}
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Recruiter Selection Modal */}
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
                onClick={() => { setRecruiterModal({ open: false, candidateId: null }); setSelectedRecruiter(''); }}
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

      {/* Reject Reason Modal */}
      {rejectModal.open && (
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
            <h3 style={{ color: '#dc2626', fontWeight: '600', fontSize: '18px', marginBottom: '16px' }}>
              Select Reject Reason
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {REJECT_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setRejectReason(reason)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: rejectReason === reason ? '2px solid #dc2626' : '1px solid #d1d5db',
                    background: rejectReason === reason ? '#fee2e2' : 'white',
                    color: rejectReason === reason ? '#dc2626' : '#374151',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  {reason}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => { setRejectModal({ open: false, candidateId: null }); setRejectReason(''); }}
                style={{ padding: '8px 16px', borderRadius: '8px', background: '#f3f4f6', color: '#374151', fontSize: '14px', border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={!rejectReason}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: rejectReason ? '#dc2626' : '#fca5a5',
                  color: 'white',
                  fontSize: '14px',
                  border: 'none',
                  cursor: rejectReason ? 'pointer' : 'not-allowed'
                }}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}