import { atsApi } from '../services/atsApi';
import React, { useEffect, useState } from 'react';
import {
  Users,
  Calendar,
  MapPin,
  Mail,
  Phone,
  UserMinus,
  AlertTriangle,
  Briefcase,
  User,
} from 'lucide-react';

const RECRUITERS = [
  "Kayryinna B",
  "Jusnie R",
  "Masmera",
  "Ilham",
  "Liyana",
  "Armi",
  "Zawani",
];

export default function HiredCandidates() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [abscondModal, setAbscondModal] = useState<{
    open: boolean;
    candidateId: string | null;
  }>({ open: false, candidateId: null });
  const [abscondDate, setAbscondDate] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const data = await atsApi.getAllResumes();
      const hired = data
        .filter((c: any) =>
          c.status === "HIRED" ||
          c.status === "ABSCONDED"
        )
        .map((c: any) => {
          let parsed: any = {};
          try {
            if (typeof c.resume_text === 'string') {
              parsed = JSON.parse(c.resume_text.replace(/'/g, '"'));
            }
          } catch {}

          return {
            id: String(c.id),
            status: c.status,
            name: c.name || parsed?.personalInfo?.name || 'Unknown',
            email: c.email || parsed?.personalInfo?.email || '-',
            phone: c.phone || parsed?.personalInfo?.phone || '-',
            location: c.location || parsed?.personalInfo?.location || '-',
            position: parsed?.jobMatch?.title || parsed?.experience?.positions?.[0]?.title || '-',
            hiredAt: c.created_at,
            abscondedAt: c.abscond_date || null,
            resume_url: c.resume_url,
            recruiter_name: c.recruiter_name || '-',
          };
        });
      setCandidates(hired);
    } catch (err) {
      console.error("Failed to load hired candidates", err);
    }
  };

  const markResigned = async (id: string) => {
    await atsApi.setDecision(id, "APPROVED");
    await load();
  };

  const openAbscondModal = (id: string) => {
    setAbscondModal({ open: true, candidateId: id });
    setAbscondDate('');
  };

  const confirmAbscond = async () => {
    if (!abscondModal.candidateId) return;
    await atsApi.setDecision(abscondModal.candidateId, "ABSCONDED", abscondDate || undefined);
    setAbscondModal({ open: false, candidateId: null });
    setAbscondDate('');
    await load();
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ABSCONDED': return {
        background: '#ef4444',
        color: 'white',
        padding: '4px 12px',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: 'bold',
        border: 'none',
      };
      case 'RESIGNED': return {
        background: '#f97316',
        color: 'white',
        padding: '4px 12px',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: 'bold',
        border: 'none',
      };
      default: return {
        background: '#3b82f6',
        color: 'white',
        padding: '4px 12px',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: 'bold',
        border: 'none',
      };
    }
  };

  const glassStyle = {
    backdropFilter: 'blur(16px)',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    boxShadow: '0 8px 32px rgba(31,38,135,0.15)',
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
          Hired Employees
        </h1>
      </div>

      {/* Cards */}
      {candidates.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {candidates.map(candidate => (
            <div
              key={candidate.id}
              className="rounded-2xl p-6 shadow-xl"
              style={glassStyle}
            >
              {/* Top */}
              <div className="flex justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{candidate.name}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    {candidate.position}
                  </p>
                  {/* Recruiter */}
                  <p className="text-sm text-purple-600 flex items-center gap-1 font-medium">
                    <User className="w-3 h-3" />
                    Recruiter: {candidate.recruiter_name}
                  </p>
                  <p className="text-xs text-gray-400">
                    Hired: {candidate.hiredAt
                      ? new Date(candidate.hiredAt).toLocaleDateString()
                      : '-'}
                  </p>
                  {candidate.abscondedAt && (
                    <p className="text-xs text-red-500 font-medium">
                      Absconded: {candidate.abscondedAt}
                    </p>
                  )}
                </div>

                {/* Status Badge */}
                <span style={getStatusStyle(candidate.status)}>
                  {candidate.status || 'HIRED'}
                </span>
              </div>

              {/* Contact Info */}
              <div className="space-y-1 mb-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-400" />
                  <span>{candidate.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-purple-400" />
                  <span>{candidate.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-purple-400" />
                  <span>{candidate.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span>{candidate.hiredAt
                    ? new Date(candidate.hiredAt).toLocaleDateString()
                    : '-'}</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-between items-center">

                {/* View Resume */}
                <button
                  onClick={async () => {
                    try {
                      if (!candidate.resume_url) {
                        alert("No resume available for this candidate");
                        return;
                      }
                      const url = await atsApi.getResumeUrl(candidate.id);
                      window.open(url, '_blank');
                    } catch (err) {
                      console.error("View resume error:", err);
                      alert("Resume not available");
                    }
                  }}
                  style={{ padding: '6px 14px', background: '#f3e8ff', color: '#7c3aed', borderRadius: '8px', fontSize: '12px', fontWeight: '500', border: 'none', cursor: 'pointer' }}
                >
                  View Resume
                </button>

                {/* Exit actions - only show if still hired */}
                {candidate.status === 'HIRED' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => markResigned(candidate.id)}
                      style={{ padding: '6px 12px', background: '#fff7ed', color: '#c2410c', borderRadius: '8px', fontSize: '12px', fontWeight: '500', border: '1px solid #fed7aa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <UserMinus style={{ width: '12px', height: '12px' }} />
                      Resigned
                    </button>

                    <button
                      onClick={() => openAbscondModal(candidate.id)}
                      style={{ padding: '6px 12px', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', fontSize: '12px', fontWeight: '500', border: '1px solid #fecaca', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <AlertTriangle style={{ width: '12px', height: '12px' }} />
                      Key In Abscond Date
                    </button>
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="w-12 h-12 mx-auto text-purple-500 mb-3" />
          <h3>No Hired Candidates</h3>
        </div>
      )}

      {/* Abscond Date Modal */}
      {abscondModal.open && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[9999] px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
            zIndex: 9999,
            position: 'relative',
          }}>
            <h3 style={{ color: '#dc2626', fontWeight: '600', fontSize: '18px', marginBottom: '16px' }}>
              Key In Abscond Date
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '14px', color: '#4b5563', display: 'block', marginBottom: '4px' }}>
                Date employee absconded
              </label>
              <input
                type="date"
                value={abscondDate}
                onChange={e => setAbscondDate(e.target.value)}
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', color: '#111', background: 'white', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setAbscondModal({ open: false, candidateId: null })}
                style={{ padding: '8px 16px', borderRadius: '8px', background: '#f3f4f6', color: '#374151', fontSize: '14px', border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmAbscond}
                disabled={!abscondDate}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: abscondDate ? '#dc2626' : '#fca5a5',
                  color: 'white',
                  fontSize: '14px',
                  border: 'none',
                  cursor: abscondDate ? 'pointer' : 'not-allowed'
                }}
              >
                Confirm Abscond
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}