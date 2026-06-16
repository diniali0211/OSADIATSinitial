import React, { useEffect, useState } from 'react';
import { atsApi } from '../services/atsApi';
import { Users, CheckCircle, XCircle, Star, Clock } from 'lucide-react';

const REJECT_REASONS = [
  { code: 'INCOMPLETE',     label: 'Incomplete Application' },
  { code: 'LOW_SKILL',      label: 'Low Skill Level' },
  { code: 'INSTRUCTIONS',   label: 'Did Not Follow Instructions' },
  { code: 'LEVEL_MISMATCH', label: 'Level Mismatch' },
  { code: 'CULTURE',        label: 'Culture Fit' },
  { code: 'VETTING',        label: 'Failed Vetting' },
];

const RECRUITERS = [
  'Kayryinna B', 'Jusnie R', 'Masmera', 'Ilham', 'Liyana', 'Armi', 'Zawani',
];

const BASE = import.meta.env.VITE_API_URL || 'https://osadiatsinitial-production.up.railway.app';

function parseTotalYears(resumeText: string): number {
  try { const m = resumeText.match(/'totalYears':\s*(\d+)/); return m ? parseInt(m[1]) : 0; } catch { return 0; }
}
function parseTotalMonths(resumeText: string): number {
  try { const m = resumeText.match(/'totalMonths':\s*(\d+)/); return m ? parseInt(m[1]) : 0; } catch { return 0; }
}
function parsePositions(resumeText: string): any[] {
  try {
    const m = resumeText.match(/'positions':\s*(\[.*?\])/s);
    if (m) return JSON.parse(m[1].replace(/'/g,'"').replace(/None/g,'null').replace(/True/g,'true').replace(/False/g,'false'));
  } catch {}
  return [];
}
function parseEducation(resumeText: string): any[] {
  try {
    const m = resumeText.match(/'education':\s*(\[.*?\])/s);
    if (m) return JSON.parse(m[1].replace(/'/g,'"').replace(/None/g,'null').replace(/True/g,'true').replace(/False/g,'false'));
  } catch {}
  return [];
}
function formatExp(totalYears: number, totalMonths: number): string | null {
  if (totalMonths > 0) {
    const y = Math.floor(totalMonths / 12), m = totalMonths % 12;
    if (y === 0) return `${m} month${m !== 1 ? 's' : ''}`;
    if (m === 0) return `${y} yr${y !== 1 ? 's' : ''}`;
    return `${y} yr${y !== 1 ? 's' : ''} ${m} month${m !== 1 ? 's' : ''}`;
  }
  if (totalYears > 0) return `${totalYears} yr${totalYears !== 1 ? 's' : ''}`;
  return null;
}

export function Applicants() {
  const [applicants, setApplicants]     = useState<any[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [selected, setSelected]         = useState<any | null>(null);
  const [rejectModal, setRejectModal]   = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [hireModal, setHireModal]       = useState(false);
  const [recruiter, setRecruiter]       = useState('');

  const glassStyle = {
    backdropFilter: 'blur(16px)',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    boxShadow: '0 8px 32px rgba(31,38,135,0.15)',
  };

  const load = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${BASE}/applicants`);
      const data = await res.json();
      setApplicants(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const enrich = (c: any) => ({
    ...c,
    totalYears:  parseTotalYears(c.resume_text || ''),
    totalMonths: parseTotalMonths(c.resume_text || ''),
    positions:   parsePositions(c.resume_text || ''),
    education:   parseEducation(c.resume_text || ''),
  });

  const doDecision = async (id: string, decision: string, reason?: string, rec?: string) => {
    await atsApi.setDecision(id, decision, reason, rec);
    setSelected(null); setRejectModal(false); setHireModal(false);
    setRejectReason(''); setRecruiter('');
    await load();
  };

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
          Candidate Applicants
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Resumes submitted directly by candidates via the application portal
        </p>
      </div>

      {applicants.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={glassStyle}>
          <Users className="w-12 h-12 mx-auto text-purple-400 mb-3" />
          <p className="text-gray-500">No applicants yet</p>
          <p className="text-gray-400 text-sm mt-1">Share your candidate portal link to start receiving applications</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {applicants.map(c => {
            const exp = formatExp(parseTotalYears(c.resume_text || ''), parseTotalMonths(c.resume_text || ''));
            return (
              <div
                key={c.id}
                onClick={() => setSelected(enrich(c))}
                className="rounded-2xl p-5 cursor-pointer hover:scale-[1.01] transition-transform"
                style={glassStyle}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{c.name || 'Unknown'}</h3>
                    <p className="text-sm text-gray-500">{c.email || '-'}</p>
                    <p className="text-sm text-gray-500">{c.phone || '-'}</p>
                    {c.location && <p className="text-sm text-gray-500">📍 {c.location}</p>}
                    {exp && <p className="text-sm text-purple-600 mt-1">💼 {exp} experience</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span style={{ padding: '3px 10px', background: '#f3e8ff', color: '#7c3aed', borderRadius: '999px', fontSize: '12px', fontWeight: '600' }}>
                      Score: {c.score || 0}%
                    </span>
                    <span style={{ padding: '3px 10px', background: '#fef9c3', color: '#854d0e', borderRadius: '999px', fontSize: '11px', fontWeight: '600' }}>
                      APPLICANT
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  Applied: {c.created_at ? new Date(c.created_at).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Review Modal ── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.65)' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '640px', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Applicant Review</h2>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#6b7280' }}>✕</button>
            </div>

            {/* Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>{selected.name}</h3>
                {formatExp(selected.totalYears, selected.totalMonths) && (
                  <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '2px' }}>
                    💼 {formatExp(selected.totalYears, selected.totalMonths)} experience
                  </p>
                )}
                {selected.email    && <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '2px' }}>✉️ {selected.email}</p>}
                {selected.phone    && <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '2px' }}>📞 {selected.phone}</p>}
                {selected.location && <p style={{ fontSize: '14px', color: '#6b7280' }}>📍 {selected.location}</p>}
              </div>
              <span style={{ padding: '6px 16px', background: '#f3e8ff', color: '#7c3aed', borderRadius: '999px', fontSize: '14px' }}>
                {selected.score || 0}%
              </span>
            </div>

            {/* Work Experience */}
            {selected.positions?.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontWeight: '600', fontSize: '15px', marginBottom: '10px' }}>
                  Work Experience ({formatExp(selected.totalYears, selected.totalMonths) ?? '—'})
                </h4>
                {selected.positions.map((pos: any, i: number) => (
                  <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', marginBottom: '8px', background: '#fafafa' }}>
                    <p style={{ fontWeight: '500', fontSize: '14px' }}>{pos.title}</p>
                    <p style={{ fontSize: '13px', color: '#4b5563' }}>{pos.company}</p>
                    {pos.duration && <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{pos.duration}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Education */}
            {selected.education?.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontWeight: '600', fontSize: '15px', marginBottom: '10px' }}>Education</h4>
                {selected.education.map((edu: any, i: number) => (
                  <div key={i} style={{ border: '1px solid #e0e7ff', borderRadius: '8px', padding: '12px', marginBottom: '8px', background: 'rgba(238,242,255,0.5)' }}>
                    {edu.level && <span style={{ display: 'inline-block', background: '#e0e7ff', color: '#3730a3', padding: '2px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>{edu.level}</span>}
                    {edu.institution && <p style={{ fontWeight: '500', fontSize: '14px' }}>{edu.institution}</p>}
                    {edu.field && <p style={{ fontSize: '13px', color: '#4b5563' }}>{edu.field}</p>}
                    {edu.year && <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{edu.year}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e5e7eb', paddingTop: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <button
                onClick={async () => { try { const url = await atsApi.getResumeUrl(selected.id); window.open(url, '_blank'); } catch { alert('Resume not available'); } }}
                style={{ padding: '8px 16px', background: '#f3e8ff', color: '#7c3aed', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px' }}
              >
                View Resume
              </button>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => doDecision(String(selected.id), 'APPROVED')}
                  style={{ padding: '8px 16px', background: '#16a34a', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
                  ✓ Approve
                </button>
                <button onClick={() => setRejectModal(true)}
                  style={{ padding: '8px 16px', background: '#dc2626', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
                  ✗ Reject
                </button>
                <button onClick={() => doDecision(String(selected.id), 'KIV')}
                  style={{ padding: '8px 16px', background: '#eab308', color: '#1a1a1a', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
                  ⏸ KIV
                </button>
                <button onClick={() => setHireModal(true)}
                  style={{ padding: '8px 16px', background: '#2563eb', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
                  ★ Hire
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectModal && selected && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
            <h3 style={{ color: '#dc2626', fontWeight: '600', fontSize: '18px', marginBottom: '16px' }}>Select Reject Reason</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {REJECT_REASONS.map(r => (
                <button key={r.code} onClick={() => setRejectReason(r.code)}
                  style={{ padding: '10px 16px', borderRadius: '8px', border: rejectReason === r.code ? '2px solid #dc2626' : '1px solid #d1d5db', background: rejectReason === r.code ? '#fee2e2' : 'white', color: rejectReason === r.code ? '#dc2626' : '#374151', cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>
                  {r.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => { setRejectModal(false); setRejectReason(''); }}
                style={{ padding: '8px 16px', background: '#f3f4f6', color: '#374151', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
              <button onClick={() => doDecision(String(selected.id), 'REJECTED', rejectReason)} disabled={!rejectReason}
                style={{ padding: '8px 16px', background: rejectReason ? '#dc2626' : '#fca5a5', color: 'white', borderRadius: '8px', border: 'none', cursor: rejectReason ? 'pointer' : 'not-allowed', fontSize: '14px' }}>
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hire Modal ── */}
      {hireModal && selected && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
            <h3 style={{ color: '#2563eb', fontWeight: '600', fontSize: '18px', marginBottom: '8px' }}>Select Recruiter</h3>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>Who is hiring this candidate?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {RECRUITERS.map(r => (
                <button key={r} onClick={() => setRecruiter(r)}
                  style={{ padding: '10px 16px', borderRadius: '8px', border: recruiter === r ? '2px solid #2563eb' : '1px solid #d1d5db', background: recruiter === r ? '#eff6ff' : 'white', color: recruiter === r ? '#2563eb' : '#374151', cursor: 'pointer', textAlign: 'left', fontSize: '14px', fontWeight: recruiter === r ? '600' : '400' }}>
                  {r}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => { setHireModal(false); setRecruiter(''); }}
                style={{ padding: '8px 16px', background: '#f3f4f6', color: '#374151', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
              <button onClick={() => doDecision(String(selected.id), 'HIRED', undefined, recruiter)} disabled={!recruiter}
                style={{ padding: '8px 16px', background: recruiter ? '#2563eb' : '#93c5fd', color: 'white', borderRadius: '8px', border: 'none', cursor: recruiter ? 'pointer' : 'not-allowed', fontSize: '14px' }}>
                Confirm Hire
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
