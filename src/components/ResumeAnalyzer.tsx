import React, { useState, useRef } from 'react';
import { candidateStore } from '../store/candidateStore';
import {
  Upload,
  AlertCircle,
  FileSearch,
  AlertTriangle,
} from 'lucide-react';
import { atsApi } from '../services/atsApi';

type Decision =
  | 'approved'
  | 'rejected'
  | 'kiv'
  | 'pending'
  | 'hired';

const REJECT_REASONS = [
  { code: 'INCOMPLETE', label: 'Resume not complete – Missing details like experience or contact info' },
  { code: 'LOW_SKILL', label: 'Not enough skills – Does not match job requirements' },
  { code: 'INSTRUCTIONS', label: 'Did not follow instructions – Forgot to attach documents or missed deadline' },
  { code: 'LEVEL_MISMATCH', label: 'Overqualified or underqualified – Job level does not fit the candidate' },
  { code: 'CULTURE', label: 'Not a good fit for company – Work style or attitude does not match company culture' },
  { code: 'VETTING', label: 'Fail vetting' },
];

const RECRUITERS = [
  "Kayryinna B",
  "Jusnie R",
  "Masmera",
  "Ilham",
  "Liyana",
  "Armi",
  "Zawani",
];

const getStatusStyle = (decision: string) => {
  switch (decision) {
    case 'pending': return { background: '#374151', color: 'white', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 'bold' };
    case 'approved': return { background: '#dcfce7', color: '#15803d', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 'bold' };
    case 'rejected': return { background: '#fee2e2', color: '#dc2626', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 'bold' };
    case 'kiv': return { background: '#fef9c3', color: '#854d0e', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 'bold' };
    case 'hired': return { background: '#dbeafe', color: '#1d4ed8', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 'bold' };
    default: return { background: '#f3f4f6', color: '#374151', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 'bold' };
  }
};

export function ResumeAnalyzer() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<{
    message: string;
    existingId: string | number;
    fileName: string;
  } | null>(null);

  const [decisionModal, setDecisionModal] = useState<{
    open: boolean;
    candidateId: string | null;
    decision: Decision | null;
  }>({ open: false, candidateId: null, decision: null });

  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);

  const [recruiterModal, setRecruiterModal] = useState<{
    open: boolean;
    candidateId: string | null;
  }>({ open: false, candidateId: null });

  const [selectedRecruiter, setSelectedRecruiter] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---------------- Upload & Analysis ---------------- */
  const handleFiles = async (files: File[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
    setIsAnalyzing(true);
    setError('');
    setDuplicateWarning(null);

    try {
      for (const file of files) {
        const response = await atsApi.uploadResume(file);

        // ── Duplicate detected ──────────────────────────────────────
        if (response.duplicate) {
          setDuplicateWarning({
            message: response.message,
            existingId: response.existing_candidate_id,
            fileName: file.name,
          });
          // Still show the analysis result below the warning (read-only)
          const candidate = {
            id: response.existing_candidate_id,
            fileName: file.name,
            uploadedAt: new Date().toISOString(),
            analysis: response.analysis ?? {},
            decision: 'pending',
            decidedAt: null,
            decisionReason: undefined,
            isDuplicate: true,
          };
          setAnalysisResults(prev => [...prev, candidate]);
          continue;
        }
        // ─────────────────────────────────────────────────────────────

        const { resumeId, analysis } = response;

        const candidate = {
          id: resumeId,
          fileName: file.name,
          uploadedAt: new Date().toISOString(),
          analysis: analysis ?? {},
          decision: 'pending',
          decidedAt: null,
          decisionReason: undefined,
          isDuplicate: false,
        };

        candidateStore.addCandidate(candidate);
        setAnalysisResults(prev => [...prev, candidate]);
      }

    } catch (err) {
      console.error(err);
      setError('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  /* ---------------- Decisions ---------------- */
  const applyDecision = async (
    id: string,
    decision: Decision,
    reason?: string,
    recruiter?: string,
  ) => {
    try {
      await atsApi.setDecision(id, decision.toUpperCase(), reason, recruiter);
      candidateStore.setDecision(id, decision, reason);

      setAnalysisResults(prev =>
        prev.map(c =>
          c.id === id
            ? { ...c, decision, decisionReason: reason, decidedAt: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      console.error(err);
      setError("Failed to update decision");
    }
  };

  const confirmReject = () => {
    if (!decisionModal.candidateId) return;
    if (selectedReasons.length === 0) return;
    applyDecision(decisionModal.candidateId, 'rejected', selectedReasons[0]);
    setDecisionModal({ open: false, candidateId: null, decision: null });
    setSelectedReasons([]);
  };

  const confirmHire = async () => {
    if (!recruiterModal.candidateId || !selectedRecruiter) return;
    await applyDecision(recruiterModal.candidateId, 'hired', undefined, selectedRecruiter);
    setRecruiterModal({ open: false, candidateId: null });
    setSelectedRecruiter('');
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="space-y-6">

      {/* Upload Area */}
      <div
        style={{ border: '2px dashed #a855f7', borderRadius: '16px', padding: '32px', textAlign: 'center', cursor: 'pointer' }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx"
          hidden
          onChange={e => e.target.files && handleFiles(Array.from(e.target.files))}
        />
        <Upload style={{ margin: '0 auto 8px', color: '#a855f7', width: '32px', height: '32px' }} />
        <p style={{ color: '#4b5563', fontWeight: '500' }}>Click to upload resumes</p>
        <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>PDF, DOC, DOCX supported</p>
      </div>

      {/* Analyzing indicator */}
      {isAnalyzing && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '16px' }}>
          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p style={{ color: '#9333ea', fontWeight: '500' }}>Analyzing resume...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', background: '#fef2f2', padding: '12px', borderRadius: '8px' }}>
          <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
          {error}
        </div>
      )}

      {/* ── Duplicate Warning Banner ── */}
      {duplicateWarning && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '12px',
          background: '#fffbeb', border: '1px solid #f59e0b',
          borderRadius: '10px', padding: '16px',
        }}>
          <AlertTriangle style={{ width: '20px', height: '20px', color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
              Duplicate Candidate Detected
            </p>
            <p style={{ fontSize: '14px', color: '#78350f' }}>
              {duplicateWarning.message}
            </p>
            <p style={{ fontSize: '12px', color: '#a16207', marginTop: '6px' }}>
              File: <strong>{duplicateWarning.fileName}</strong> — The resume analysis is shown below for reference, but no new record was created.
            </p>
          </div>
          <button
            onClick={() => setDuplicateWarning(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a16207', fontSize: '18px', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Results */}
      {analysisResults.map(result => {
        const analysis = result.analysis ?? {};
        const personal = analysis.personalInfo ?? {};
        const skills = analysis.skills ?? [];
        const experience = analysis.experience ?? {};
        const positions = experience.positions ?? [];
        const education = analysis.education ?? [];

        return (
          <div
            key={result.id}
            style={{
              border: result.isDuplicate ? '2px solid #f59e0b' : '1px solid #e5e7eb',
              borderRadius: '12px', padding: '24px',
              background: result.isDuplicate ? 'rgba(255,251,235,0.6)' : 'rgba(255,255,255,0.4)',
              backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}
          >

            {/* Duplicate badge on card */}
            {result.isDuplicate && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: '#fef3c7', color: '#92400e',
                padding: '4px 10px', borderRadius: '999px',
                fontSize: '12px', fontWeight: '600', marginBottom: '12px'
              }}>
                <AlertTriangle style={{ width: '12px', height: '12px' }} />
                Already in system — read only
              </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
              <h3 style={{ fontWeight: '600', color: '#1f2937' }}>{result.fileName}</h3>

              {/* Only show action buttons for non-duplicates */}
              {!result.isDuplicate && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={getStatusStyle(result.decision)}>
                    {result.decision.toUpperCase()}
                  </span>
                  <button
                    onClick={() => applyDecision(String(result.id), 'approved')}
                    style={{ background: '#22c55e', color: 'white', padding: '6px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', border: 'none', cursor: 'pointer' }}
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => setDecisionModal({ open: true, candidateId: String(result.id), decision: 'rejected' })}
                    style={{ background: '#ef4444', color: 'white', padding: '6px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', border: 'none', cursor: 'pointer' }}
                  >
                    ✗ Reject
                  </button>
                  <button
                    onClick={() => applyDecision(String(result.id), 'kiv')}
                    style={{ background: '#eab308', color: '#1a1a1a', padding: '6px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', border: 'none', cursor: 'pointer' }}
                  >
                    ⏸ KIV
                  </button>
                  <button
                    onClick={() => setRecruiterModal({ open: true, candidateId: String(result.id) })}
                    style={{ background: '#2563eb', color: 'white', padding: '6px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', border: 'none', cursor: 'pointer' }}
                  >
                    ★ Hire
                  </button>
                </div>
              )}
            </div>

            {/* Personal Info */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <Info label="Name" value={personal.name} />
              <Info label="Email" value={personal.email} />
              <Info label="Phone" value={personal.phone} />
              <Info label="Location" value={personal.location} clamp />
            </div>

            {/* Skills */}
            {skills.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontWeight: '600', marginBottom: '8px' }}>Skills</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {skills.map((s: any, i: number) => (
                    <span key={i} style={{ padding: '4px 12px', background: '#f3e8ff', color: '#7e22ce', borderRadius: '999px', fontSize: '14px' }}>
                      {s.name ?? s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Work Experience */}
            {positions.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontWeight: '600', marginBottom: '8px' }}>
                  Work Experience ({experience.totalYears ?? 0} yrs)
                </h4>
                {positions.map((pos: any, i: number) => (
                  <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '12px', background: 'rgba(255,255,255,0.4)' }}>
                    <p style={{ fontWeight: '500' }}>{pos.title}</p>
                    <p style={{ fontSize: '14px', color: '#4b5563' }}>{pos.company}</p>
                    {pos.duration && (
                      <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{pos.duration}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Education */}
            {education.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontWeight: '600', marginBottom: '8px' }}>Education</h4>
                {education.map((edu: any, i: number) => (
                  <div key={i} style={{ border: '1px solid #e0e7ff', borderRadius: '8px', padding: '16px', marginBottom: '12px', background: 'rgba(238,242,255,0.4)' }}>
                    {edu.level && (
                      <span style={{ display: 'inline-block', background: '#e0e7ff', color: '#3730a3', padding: '2px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
                        {edu.level}
                      </span>
                    )}
                    {edu.institution && (
                      <p style={{ fontWeight: '500', color: '#1f2937' }}>{edu.institution}</p>
                    )}
                    {edu.field && (
                      <p style={{ fontSize: '14px', color: '#4b5563' }}>{edu.field}</p>
                    )}
                    {edu.year && (
                      <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{edu.year}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Overall Score */}
            <div style={{ background: '#faf5ff', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <p style={{ fontWeight: '600', color: '#7e22ce', whiteSpace: 'nowrap' }}>
                Overall Score: {analysis.overallScore ?? 0}%
              </p>
              <div style={{ flex: 1, background: '#e9d5ff', borderRadius: '999px', height: '10px' }}>
                <div style={{ width: `${analysis.overallScore ?? 0}%`, background: '#7c3aed', height: '10px', borderRadius: '999px', transition: 'width 0.3s ease' }} />
              </div>
            </div>

          </div>
        );
      })}

      {/* Recruiter Modal */}
      {recruiterModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#2563eb', marginBottom: '8px' }}>Select Recruiter</h3>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>Who is hiring this candidate?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {RECRUITERS.map(recruiter => (
                <button
                  key={recruiter}
                  onClick={() => setSelectedRecruiter(recruiter)}
                  style={{
                    padding: '10px 16px', borderRadius: '8px',
                    border: selectedRecruiter === recruiter ? '2px solid #2563eb' : '1px solid #d1d5db',
                    background: selectedRecruiter === recruiter ? '#eff6ff' : 'white',
                    color: selectedRecruiter === recruiter ? '#2563eb' : '#374151',
                    cursor: 'pointer', textAlign: 'left', fontSize: '14px',
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
                style={{ padding: '8px 16px', borderRadius: '8px', background: selectedRecruiter ? '#2563eb' : '#93c5fd', color: 'white', fontSize: '14px', border: 'none', cursor: selectedRecruiter ? 'pointer' : 'not-allowed' }}
              >
                Confirm Hire
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {decisionModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '480px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#dc2626', marginBottom: '16px' }}>Reject Candidate</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '256px', overflowY: 'auto', marginBottom: '16px' }}>
              {REJECT_REASONS.map(reason => {
                const checked = selectedReasons.includes(reason.code);
                return (
                  <label
                    key={reason.code}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '12px',
                      padding: '12px', borderRadius: '8px',
                      border: checked ? '2px solid #f87171' : '1px solid #d1d5db',
                      background: checked ? '#fef2f2' : 'white', cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedReasons(prev =>
                          prev.includes(reason.code) ? prev.filter(r => r !== reason.code) : [...prev, reason.code]
                        )
                      }
                      style={{ marginTop: '2px', accentColor: '#dc2626' }}
                    />
                    <span style={{ fontSize: '14px', color: '#1f2937', lineHeight: '1.4' }}>{reason.label}</span>
                  </label>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => { setDecisionModal({ open: false, candidateId: null, decision: null }); setSelectedReasons([]); }}
                style={{ padding: '8px 16px', borderRadius: '8px', background: '#f3f4f6', color: '#374151', fontSize: '14px', fontWeight: '500', border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={selectedReasons.length === 0}
                style={{ padding: '8px 16px', borderRadius: '8px', background: selectedReasons.length > 0 ? '#dc2626' : '#fca5a5', color: 'white', fontSize: '14px', fontWeight: '500', border: 'none', cursor: selectedReasons.length > 0 ? 'pointer' : 'not-allowed' }}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {uploadedFiles.length === 0 && analysisResults.length === 0 && (
        <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
          <FileSearch style={{ margin: '0 auto 8px', width: '40px', height: '40px', color: '#a855f7' }} />
          <p>No resumes uploaded yet</p>
          <p style={{ fontSize: '12px', marginTop: '4px', color: '#9ca3af' }}>Upload a PDF, DOC or DOCX to get started</p>
        </div>
      )}

    </div>
  );
}

/* ---------- helpers ---------- */

function Info({
  label,
  value,
  clamp = false,
}: {
  label: string;
  value?: string;
  clamp?: boolean;
}) {
  return (
    <div>
      <p style={{ fontSize: '14px', color: '#6b7280' }}>{label}</p>
      <p style={clamp ? { overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontSize: '14px', wordBreak: 'break-word' } : {}}>
        {value || '-'}
      </p>
    </div>
  );
}
