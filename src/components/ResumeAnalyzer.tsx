import React, { useState, useRef } from 'react';
import { candidateStore } from '../store/candidateStore';
import {
  Upload,
  AlertCircle,
  FileSearch,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { atsApi } from '../services/atsApi';

type Decision =
  | 'approved'
  | 'rejected'
  | 'kiv'
  | 'pending'
  | 'hired';

const REJECT_REASONS = [
  'Resume not complete – Missing details like experience or contact info',
  'Not enough skills – Does not match job requirements',
  'Did not follow instructions – Forgot to attach documents or missed deadline',
  'Overqualified or underqualified – Job level does not fit the candidate',
  'Not a good fit for company – Work style or attitude does not match company culture',
  'Fail vetting',
];

export function ResumeAnalyzer() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const [decisionModal, setDecisionModal] = useState<{
    open: boolean;
    candidateId: string | null;
    decision: Decision | null;
  }>({ open: false, candidateId: null, decision: null });

  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---------------- Upload & Analysis ---------------- */

  const handleFiles = async (files: File[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
    setIsAnalyzing(true);

    try {
      for (const file of files) {
        const analysis = await atsApi.analyzeResume(file);

        const candidate = {
            id: crypto.randomUUID(),
            fileName: file.name,
            uploadedAt: new Date().toISOString(),
            analysis: analysis ?? {},
            decision: 'pending',
            decidedAt: null,
            decisionReason: undefined,
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

  const applyDecision = (
    id: string,
    decision: Decision,
    reason?: string
  ) => {
    candidateStore.setDecision(id, decision, reason);

    setAnalysisResults(prev =>
      prev.map(c =>
        c.id === id
          ? {
              ...c,
              decision,
              decisionReason: reason,
              decidedAt: new Date().toISOString(),
            }
          : c
      )
    );
  };

  const confirmReject = () => {
    if (!decisionModal.candidateId) return;

    applyDecision(
      decisionModal.candidateId,
      'rejected',
      selectedReasons.join(', ')
    );

    setDecisionModal({ open: false, candidateId: null, decision: null });
    setSelectedReasons([]);
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="space-y-6">

      {/* Upload */}
      <div
        className="rounded-2xl p-8 text-center cursor-pointer border-2 border-dashed"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx"
          hidden
          onChange={e =>
            e.target.files && handleFiles(Array.from(e.target.files))
          }
        />
        <Upload className="mx-auto mb-2" />
        <p>Click to upload resumes</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle />
          {error}
        </div>
      )}

      {/* Results */}
      {analysisResults.map(result => {
        const analysis = result.analysis ?? {};
        const personal = analysis.personalInfo ?? {};
        const skills = analysis.skills ?? [];
        const experience = analysis.experience ?? {};
        const positions = experience.positions ?? [];
        const jobMatch = analysis.jobMatch ?? {};

        return (
          <div
            key={result.id}
            className="border rounded-xl p-6 space-y-6 bg-white/40 backdrop-blur"
          >
            {/* Header */}
            <div className="flex justify-between items-start">
              <h3 className="font-semibold">{result.fileName}</h3>

              <div className="flex gap-2">
                <StatusBadge status={result.decision} />

                <button
                  onClick={() => applyDecision(result.id, 'approved')}
                  className="px-3 py-1 bg-green-100 text-green-700 rounded"
                >
                  Approve
                </button>

                <button
                  onClick={() =>
                    setDecisionModal({
                      open: true,
                      candidateId: result.id,
                      decision: 'rejected',
                    })
                  }
                  className="px-3 py-1 bg-red-100 text-red-700 rounded"
                >
                  Reject
                </button>

                <button
                  onClick={() => applyDecision(result.id, 'kiv')}
                  className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded"
                >
                  KIV
                </button>
              </div>
            </div>

            {/* Personal Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Info label="Name" value={personal.name} />
              <Info label="Email" value={personal.email} />
              <Info label="Phone" value={personal.phone} />
              <Info label="Location" value={personal.location} clamp />
            </div>

            {/* Skills */}
            {skills.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {skills.map((s: any, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                    >
                      {s.name ?? s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Experience */}
          {positions.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">
                Work Experience ({experience.totalYears ?? 0} yrs)
              </h4>

              {positions.map((pos: any, i: number) => (
                <div
                  key={i}
                  className="border rounded-lg p-4 mb-3 bg-white/40"
                >
                  {/* Job title */}
                  <p className="font-medium line-clamp-2">
                    {pos.title}
                  </p>

                  {/* Company */}
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {pos.company}
                  </p>

                  {/* Duration */}
                  {pos.duration && (
                    <p className="text-xs text-gray-500 mt-1">
                      {pos.duration}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          
            {/* Job Match */}
            <div className="bg-purple-50 p-4 rounded">
              <p className="font-semibold">
                Match: {jobMatch.matchPercentage ?? 0}%
              </p>
            </div>
          </div>
        );
      })}

      {/* Reject Modal */}
      {decisionModal.open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">

          <div className="bg-white shadow-2xl border border-gray-300 rounded-xl p-6 w-full max-w-md space-y-4">

            <h3 className="text-lg font-semibold">
              Reject Candidate
            </h3>

            <div className="space-y-3 max-h-64 overflow-y-auto">

              {REJECT_REASONS.map(reason => {
                const checked = selectedReasons.includes(reason);

                return (
                  <label
                    key={reason}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition
                      ${
                        checked
                          ? 'border-red-400 bg-red-50'
                          : 'hover:bg-gray-100 border-gray-300 bg-white'
                      }`}
                  >

                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedReasons(prev =>
                          prev.includes(reason)
                            ? prev.filter(r => r !== reason)
                            : [...prev, reason]
                        )
                      }
                      className="mt-1 accent-red-600"
                    />

                    <span className="text-sm leading-snug text-gray-800">
                      {reason}
                    </span>

                  </label>
                );
              })}

            </div>

            <div className="flex justify-end gap-2 pt-4">

              <button
                onClick={() => {
                  setDecisionModal({
                    open: false,
                    candidateId: null,
                    decision: null,
                  });
                  setSelectedReasons([]);
                }}
                className="px-3 py-2 rounded bg-gray-100"
              >
                Cancel
              </button>

              <button
                onClick={confirmReject}
                disabled={selectedReasons.length === 0}
                className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
              >
                Confirm
              </button>

            </div>

          </div>
        </div>
      )}


      {/* Empty */}
      {uploadedFiles.length === 0 && analysisResults.length === 0 && (
        <div className="text-center text-gray-500 py-10">
          <FileSearch className="mx-auto mb-2" />
          No resumes uploaded yet
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
      <p className="text-sm text-gray-500">{label}</p>

      <p
        className={
          clamp
            ? 'line-clamp-2 text-sm break-words'
            : ''
        }
      >
        {value || '-'}
      </p>
    </div>
  );
}


function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    kiv: 'bg-yellow-100 text-yellow-700',
    pending: 'bg-gray-100 text-gray-700',
    hired: 'bg-blue-100 text-blue-700',
  };

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium ${colors[status]}`}
    >
      {status.toUpperCase()}
    </span>
  );
}
