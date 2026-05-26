import React, { useState, useEffect } from 'react';
import {
  Users, FileText, Calendar, Download, Eye, X,
  CheckCircle, XCircle, Clock, Star
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis,
  AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer,
} from 'recharts';
import { atsApi } from '../services/atsApi';

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

function parseTotalYears(resumeText: string): number {
  try {
    const m = resumeText.match(/'totalYears':\s*(\d+)/);
    return m ? parseInt(m[1]) : 0;
  } catch { return 0; }
}

function parsePositions(resumeText: string): any[] {
  try {
    const m = resumeText.match(/'positions':\s*(\[.*?\])/s);
    if (m) {
      return JSON.parse(
        m[1].replace(/'/g, '"').replace(/None/g, 'null').replace(/True/g, 'true').replace(/False/g, 'false')
      );
    }
  } catch {}
  return [];
}

function parseEducation(resumeText: string): any[] {
  try {
    const m = resumeText.match(/'education':\s*(\[.*?\])/s);
    if (m) {
      return JSON.parse(
        m[1].replace(/'/g, '"').replace(/None/g, 'null').replace(/True/g, 'true').replace(/False/g, 'false')
      );
    }
  } catch {}
  return [];
}

export function Analytics() {
  const [isLoading, setIsLoading]     = useState(true);
  const [allCandidates, setAllCandidates] = useState<any[]>([]);
  const [selectedList, setSelectedList]   = useState<'REJECTED'|'KIV'|'APPROVED'|'PENDING'|null>(null);

  // Modals
  const [viewCandidate,   setViewCandidate]   = useState<any|null>(null);
  const [actionCandidate, setActionCandidate] = useState<any|null>(null);

  // Reject sub-modal
  const [rejectModal,     setRejectModal]     = useState(false);
  const [rejectReason,    setRejectReason]    = useState('');

  // Hire sub-modal
  const [hireModal,       setHireModal]       = useState(false);
  const [selectedRecruiter, setSelectedRecruiter] = useState('');

  const [analyticsData, setAnalyticsData] = useState({ scoreTrends: [], applicationVolume: [], performanceMetrics: [] });

  const glassStyle = {
    backdropFilter: 'blur(16px)',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    boxShadow: '0 8px 32px rgba(31,38,135,0.15)',
  };

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const resumes = await atsApi.getAllResumes();
      setAllCandidates(resumes);
      setAnalyticsData({
        scoreTrends:        Array.from({ length: 7  }, (_, i) => ({ date: `Day ${i+1}`, avgScore: 70 + Math.random() * 20 })),
        applicationVolume:  Array.from({ length: 14 }, (_, i) => ({ date: `D${i+1}`, applications: Math.floor(Math.random()*8)+1, completed: Math.floor(Math.random()*6)+1 })),
        performanceMetrics: ['Communication','Technical','Experience','Education','Culture','Leadership'].map(m => ({ metric: m, current: 70+Math.random()*25, benchmark: 75+Math.random()*15 })),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stats = {
    total:    allCandidates.length,
    approved: allCandidates.filter(c => c.status === 'APPROVED').length,
    rejected: allCandidates.filter(c => c.status === 'REJECTED').length,
    kiv:      allCandidates.filter(c => c.status === 'KIV').length,
    pending:  allCandidates.filter(c => c.status === 'PENDING').length,
  };

  const listCandidates = selectedList ? allCandidates.filter(c => c.status === selectedList) : [];

  // ── Enrich candidate with parsed resume data ──
  const parseTotalMonths = (resumeText: string): number => {
    try {
      const m = resumeText.match(/'totalMonths':\s*(\d+)/);
      return m ? parseInt(m[1]) : 0;
    } catch { return 0; }
  };

  const enrich = (c: any) => ({
    ...c,
    totalYears:  parseTotalYears(c.resume_text || ''),
    totalMonths: parseTotalMonths(c.resume_text || ''),
    positions:   parsePositions(c.resume_text || ''),
    education:   parseEducation(c.resume_text || ''),
  });

  // ── Actions ──
  const doDecision = async (id: string, decision: string, reason?: string, recruiter?: string) => {
    await atsApi.setDecision(id, decision, reason, recruiter);
    setActionCandidate(null);
    setViewCandidate(null);
    setRejectModal(false);
    setHireModal(false);
    setRejectReason('');
    setSelectedRecruiter('');
    await loadData();
  };

  const openAction = (c: any) => setActionCandidate(enrich(c));
  const openView   = (c: any) => setViewCandidate(enrich(c));

  const listTitle: Record<string, string> = {
    PENDING:  'Pending Candidates',
    APPROVED: 'Approved Candidates',
    REJECTED: 'Rejected Candidates',
    KIV:      'Candidates in KIV',
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING:  '#374151',
      APPROVED: '#15803d',
      REJECTED: '#dc2626',
      KIV:      '#854d0e',
      HIRED:    '#1d4ed8',
    };
    return { background: map[status] || '#374151', color: 'white', padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '600' };
  };


  const formatExperience = (totalYears: number, totalMonths?: number) => {
    if (totalMonths && totalMonths > 0) {
      const yrs = Math.floor(totalMonths / 12);
      const mths = totalMonths % 12;
      if (yrs === 0) return `${mths} month${mths !== 1 ? 's' : ''}`;
      if (mths === 0) return `${yrs} year${yrs !== 1 ? 's' : ''}`;
      return `${yrs} yr${yrs !== 1 ? 's' : ''} ${mths} month${mths !== 1 ? 's' : ''}`;
    }
    if (totalYears > 0) return `${totalYears} year${totalYears !== 1 ? 's' : ''}`;
    return null;
  };

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Reports</h1>
          <p className="text-gray-600">Recruitment insights</p>
        </div>
        <button
          onClick={async () => {
            try {
              const BASE = import.meta.env.VITE_API_URL || 'https://osadiatsinitial-production.up.railway.app';
              const res = await fetch(`${BASE}/export-csv`);
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'candidates_export.csv';
              a.click();
              URL.revokeObjectURL(url);
            } catch (e) {
              alert('Export failed. Please try again.');
            }
          }}
          className="px-4 py-2 bg-purple-600 text-white rounded-xl flex items-center gap-2"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { key: 'PENDING',  icon: <FileText className="mb-3" />,                        val: stats.total,    label: 'Total Applications',   color: '' },
          { key: 'APPROVED', icon: <Users className="mb-3 text-green-600" />,            val: stats.approved, label: 'Approved Candidates',  color: 'text-green-600' },
          { key: 'REJECTED', icon: <Eye className="mb-3 text-red-600" />,               val: stats.rejected, label: 'Rejected Candidates',  color: 'text-red-600' },
          { key: 'KIV',      icon: <Calendar className="mb-3 text-yellow-600" />,       val: stats.kiv,      label: 'Candidates in KIV',    color: 'text-yellow-600' },
        ].map(card => (
          <div
            key={card.key}
            onClick={() => setSelectedList(selectedList === card.key as any ? null : card.key as any)}
            className="rounded-2xl p-6 cursor-pointer hover:scale-105 transition-transform"
            style={{ ...glassStyle, outline: selectedList === card.key ? '2px solid #8B5CF6' : 'none' }}
          >
            {card.icon}
            <h3 className={`text-2xl ${card.color}`}>{card.val}</h3>
            <p className="text-sm">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Candidate List Panel */}
      {selectedList && (
        <div className="rounded-2xl p-6" style={glassStyle}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">{listTitle[selectedList]}</h3>
            <button onClick={() => setSelectedList(null)}><X className="w-5 h-5 text-gray-500" /></button>
          </div>

          {listCandidates.length === 0 ? (
            <p className="text-gray-500 text-sm">No candidates in this category.</p>
          ) : (
            <div className="space-y-3">
              {listCandidates.map(c => (
                <div
                  key={c.id}
                  onClick={() => (selectedList === 'PENDING' || selectedList === 'KIV') ? openAction(c) : openView(c)}
                  className="rounded-xl p-4 bg-white/60 flex justify-between items-center cursor-pointer hover:bg-white/80 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-800">{c.name || 'Unknown'}</p>
                    <p className="text-sm text-gray-500">{c.email || '-'} · {c.phone || '-'}</p>
                    <p className="text-sm text-gray-500">{c.location || '-'}</p>
                    {selectedList === 'REJECTED' && c.reject_reason && (
                      <p className="text-sm text-red-600 mt-1 font-medium">
                        Reason: {REJECT_REASONS.find(r => r.code === c.reject_reason)?.label || c.reject_reason}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span style={statusBadge(c.status)}>{c.status}</span>
                    <span className="px-3 py-1 rounded-full text-xs bg-purple-100 text-purple-700">Score: {c.score || 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl p-6" style={glassStyle}>
          <h3 className="mb-4">Score Trends</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={analyticsData.scoreTrends}>
              <XAxis dataKey="date" /><YAxis />
              <Line dataKey="avgScore" stroke="#8B5CF6" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-2xl p-6" style={glassStyle}>
          <h3 className="mb-4">Application Volume</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={analyticsData.applicationVolume}>
              <XAxis dataKey="date" /><YAxis />
              <Area dataKey="applications" stroke="#8B5CF6" fill="#8B5CF6" />
              <Area dataKey="completed"    stroke="#14B8A6" fill="#14B8A6" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl p-6" style={glassStyle}>
        <h3 className="mb-4">Performance Metrics</h3>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={analyticsData.performanceMetrics}>
            <PolarGrid /><PolarAngleAxis dataKey="metric" /><PolarRadiusAxis domain={[0,100]} />
            <Radar dataKey="current"   stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
            <Radar dataKey="benchmark" stroke="#14B8A6" fill="#14B8A6" fillOpacity={0.15} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* ── ACTION MODAL (Pending & KIV) ── */}
      {actionCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '620px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Candidate Review</h2>
              <button onClick={() => setActionCandidate(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#6b7280' }}>✕</button>
            </div>

            {/* Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>{actionCandidate.name}</h3>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '2px' }}>
                  {formatExperience(actionCandidate.totalYears, actionCandidate.totalMonths)
                    ? `${formatExperience(actionCandidate.totalYears, actionCandidate.totalMonths)} experience`
                    : 'Experience not detected'}
                </p>
                {actionCandidate.phone    && <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '2px' }}>📞 {actionCandidate.phone}</p>}
                {actionCandidate.location && <p style={{ fontSize: '14px', color: '#6b7280' }}>📍 {actionCandidate.location}</p>}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ padding: '6px 16px', background: '#f3e8ff', color: '#7c3aed', borderRadius: '999px', fontSize: '14px' }}>{actionCandidate.score || 0}%</span>
                <span style={statusBadge(actionCandidate.status)}>{actionCandidate.status}</span>
              </div>
            </div>

            {/* Work Experience */}
            {actionCandidate.positions?.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontWeight: '600', fontSize: '15px', marginBottom: '10px' }}>Work Experience ({formatExperience(actionCandidate.totalYears, actionCandidate.totalMonths) ?? '0 months'})</h4>
                {actionCandidate.positions.map((pos: any, i: number) => (
                  <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', marginBottom: '8px', background: '#fafafa' }}>
                    <p style={{ fontWeight: '500', fontSize: '14px' }}>{pos.title}</p>
                    <p style={{ fontSize: '13px', color: '#4b5563' }}>{pos.company}</p>
                    {pos.duration && <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{pos.duration}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Education */}
            {actionCandidate.education?.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontWeight: '600', fontSize: '15px', marginBottom: '10px' }}>Education</h4>
                {actionCandidate.education.map((edu: any, i: number) => (
                  <div key={i} style={{ border: '1px solid #e0e7ff', borderRadius: '8px', padding: '12px', marginBottom: '8px', background: 'rgba(238,242,255,0.5)' }}>
                    {edu.level && <span style={{ display: 'inline-block', background: '#e0e7ff', color: '#3730a3', padding: '2px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>{edu.level}</span>}
                    {edu.institution && <p style={{ fontWeight: '500', fontSize: '14px' }}>{edu.institution}</p>}
                    {edu.field && <p style={{ fontSize: '13px', color: '#4b5563' }}>{edu.field}</p>}
                    {edu.year && <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{edu.year}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginTop: '8px' }}>
              <button
                onClick={async () => { try { const url = await atsApi.getResumeUrl(actionCandidate.id); window.open(url, '_blank'); } catch { alert('Resume not available'); } }}
                style={{ padding: '8px 16px', background: '#f3e8ff', color: '#7c3aed', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px' }}
              >
                View Resume
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => doDecision(String(actionCandidate.id), 'APPROVED')}
                  style={{ padding: '8px 18px', background: '#16a34a', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
                  ✓ Approve
                </button>
                <button onClick={() => setRejectModal(true)}
                  style={{ padding: '8px 18px', background: '#dc2626', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
                  ✗ Reject
                </button>
                {actionCandidate.status !== 'KIV' && (
                  <button onClick={() => doDecision(String(actionCandidate.id), 'KIV')}
                    style={{ padding: '8px 18px', background: '#eab308', color: '#1a1a1a', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
                    ⏸ KIV
                  </button>
                )}
                <button onClick={() => setHireModal(true)}
                  style={{ padding: '8px 18px', background: '#2563eb', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
                  ★ Hire
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW MODAL (Approved & Rejected) ── */}
      {viewCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '620px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Candidate Profile</h2>
              <button onClick={() => setViewCandidate(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#6b7280' }}>✕</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>{viewCandidate.name}</h3>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '2px' }}>
                  {formatExperience(viewCandidate.totalYears, viewCandidate.totalMonths)
                    ? `${formatExperience(viewCandidate.totalYears, viewCandidate.totalMonths)} experience`
                    : 'Experience not detected'}
                </p>
                {viewCandidate.email    && <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '2px' }}>✉️ {viewCandidate.email}</p>}
                {viewCandidate.phone    && <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '2px' }}>📞 {viewCandidate.phone}</p>}
                {viewCandidate.location && <p style={{ fontSize: '14px', color: '#6b7280' }}>📍 {viewCandidate.location}</p>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                <span style={{ padding: '6px 16px', background: '#f3e8ff', color: '#7c3aed', borderRadius: '999px', fontSize: '14px' }}>{viewCandidate.score || 0}%</span>
                <span style={statusBadge(viewCandidate.status)}>{viewCandidate.status}</span>
              </div>
            </div>

            {/* Reject reason if applicable */}
            {viewCandidate.reject_reason && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', color: '#dc2626', fontWeight: '600' }}>
                  Reject Reason: {REJECT_REASONS.find(r => r.code === viewCandidate.reject_reason)?.label || viewCandidate.reject_reason}
                </p>
              </div>
            )}

            {/* Work Experience */}
            {viewCandidate.positions?.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontWeight: '600', fontSize: '15px', marginBottom: '10px' }}>Work Experience ({formatExperience(viewCandidate.totalYears, viewCandidate.totalMonths) ?? '0 months'})</h4>
                {viewCandidate.positions.map((pos: any, i: number) => (
                  <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', marginBottom: '8px', background: '#fafafa' }}>
                    <p style={{ fontWeight: '500', fontSize: '14px' }}>{pos.title}</p>
                    <p style={{ fontSize: '13px', color: '#4b5563' }}>{pos.company}</p>
                    {pos.duration && <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{pos.duration}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Education */}
            {viewCandidate.education?.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontWeight: '600', fontSize: '15px', marginBottom: '10px' }}>Education</h4>
                {viewCandidate.education.map((edu: any, i: number) => (
                  <div key={i} style={{ border: '1px solid #e0e7ff', borderRadius: '8px', padding: '12px', marginBottom: '8px', background: 'rgba(238,242,255,0.5)' }}>
                    {edu.level && <span style={{ display: 'inline-block', background: '#e0e7ff', color: '#3730a3', padding: '2px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>{edu.level}</span>}
                    {edu.institution && <p style={{ fontWeight: '500', fontSize: '14px' }}>{edu.institution}</p>}
                    {edu.field && <p style={{ fontSize: '13px', color: '#4b5563' }}>{edu.field}</p>}
                    {edu.year && <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{edu.year}</p>}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
              <button
                onClick={async () => { try { const url = await atsApi.getResumeUrl(viewCandidate.id); window.open(url, '_blank'); } catch { alert('Resume not available'); } }}
                style={{ padding: '8px 16px', background: '#f3e8ff', color: '#7c3aed', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px' }}
              >
                View Resume
              </button>
              <button onClick={() => setViewCandidate(null)}
                style={{ padding: '8px 20px', background: '#f3f4f6', color: '#374151', borderRadius: '8px', border: '1px solid #d1d5db', cursor: 'pointer', fontSize: '14px' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REJECT SUB-MODAL ── */}
      {rejectModal && actionCandidate && (
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
              <button onClick={() => doDecision(String(actionCandidate.id), 'REJECTED', rejectReason)} disabled={!rejectReason}
                style={{ padding: '8px 16px', background: rejectReason ? '#dc2626' : '#fca5a5', color: 'white', borderRadius: '8px', border: 'none', cursor: rejectReason ? 'pointer' : 'not-allowed', fontSize: '14px' }}>
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HIRE SUB-MODAL ── */}
      {hireModal && actionCandidate && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
            <h3 style={{ color: '#2563eb', fontWeight: '600', fontSize: '18px', marginBottom: '8px' }}>Select Recruiter</h3>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>Who is hiring this candidate?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {RECRUITERS.map(rec => (
                <button key={rec} onClick={() => setSelectedRecruiter(rec)}
                  style={{ padding: '10px 16px', borderRadius: '8px', border: selectedRecruiter === rec ? '2px solid #2563eb' : '1px solid #d1d5db', background: selectedRecruiter === rec ? '#eff6ff' : 'white', color: selectedRecruiter === rec ? '#2563eb' : '#374151', cursor: 'pointer', textAlign: 'left', fontSize: '14px', fontWeight: selectedRecruiter === rec ? '600' : '400' }}>
                  {rec}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => { setHireModal(false); setSelectedRecruiter(''); }}
                style={{ padding: '8px 16px', background: '#f3f4f6', color: '#374151', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
              <button onClick={() => doDecision(String(actionCandidate.id), 'HIRED', undefined, selectedRecruiter)} disabled={!selectedRecruiter}
                style={{ padding: '8px 16px', background: selectedRecruiter ? '#2563eb' : '#93c5fd', color: 'white', borderRadius: '8px', border: 'none', cursor: selectedRecruiter ? 'pointer' : 'not-allowed', fontSize: '14px' }}>
                Confirm Hire
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
