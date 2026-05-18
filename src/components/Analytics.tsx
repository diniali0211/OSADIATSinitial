import React, { useState, useEffect } from 'react';
import {
  Users,
  FileText,
  Calendar,
  Download,
  Eye,
  X
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import { atsApi } from '../services/atsApi';

export function Analytics() {
  const [dateRange, setDateRange] = useState('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [allCandidates, setAllCandidates] = useState<any[]>([]);
  const [selectedList, setSelectedList] = useState<'REJECTED' | 'KIV' | 'APPROVED' | 'PENDING' | null>(null);

  const [analyticsData, setAnalyticsData] = useState({
    scoreTrends: [],
    applicationVolume: [],
    performanceMetrics: []
  });

  const glassStyle = {
    backdropFilter: 'blur(16px)',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    boxShadow: '0 8px 32px rgba(31,38,135,0.15)'
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [dateRange]);

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);
      const resumes = await atsApi.getAllResumes();
      setAllCandidates(resumes);

      setAnalyticsData({
        scoreTrends: generateScoreTrends(),
        applicationVolume: generateApplicationVolume(),
        performanceMetrics: generatePerformanceMetrics()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateScoreTrends = () =>
    Array.from({ length: 7 }, (_, i) => ({
      date: `Day ${i + 1}`,
      avgScore: 70 + Math.random() * 20
    }));

  const generateApplicationVolume = () =>
    Array.from({ length: 14 }, (_, i) => ({
      date: `D${i + 1}`,
      applications: Math.floor(Math.random() * 8) + 1,
      completed: Math.floor(Math.random() * 6) + 1
    }));

  const generatePerformanceMetrics = () =>
    ['Communication', 'Technical', 'Experience', 'Education', 'Culture', 'Leadership']
      .map(m => ({
        metric: m,
        current: 70 + Math.random() * 25,
        benchmark: 75 + Math.random() * 15
      }));

  // Stats from real backend data
  const stats = {
    total: allCandidates.length,
    approved: allCandidates.filter(c => c.status === 'APPROVED').length,
    rejected: allCandidates.filter(c => c.status === 'REJECTED').length,
    kiv: allCandidates.filter(c => c.status === 'KIV').length,
    pending: allCandidates.filter(c => c.status === 'PENDING').length,
  };

  const getListCandidates = () => {
    if (!selectedList) return [];
    return allCandidates.filter(c => c.status === selectedList);
  };

  const getListTitle = () => {
    switch (selectedList) {
      case 'APPROVED': return 'Approved Candidates';
      case 'REJECTED': return 'Rejected Candidates';
      case 'KIV': return 'Candidates in KIV';
      case 'PENDING': return 'Pending Candidates';
      default: return '';
    }
  };

  const REJECT_REASON_LABELS: Record<string, string> = {
    INCOMPLETE: 'Incomplete Application',
    LOW_SKILL: 'Low Skill Level',
    INSTRUCTIONS: 'Did Not Follow Instructions',
    LEVEL_MISMATCH: 'Level Mismatch',
    CULTURE: 'Culture Fit',
    VETTING: 'Failed Vetting',
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
        <div>
          <h1 className="text-3xl font-bold">Analytics & Reports</h1>
          <p className="text-gray-600">Recruitment insights</p>
        </div>

        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="px-4 py-2 rounded-xl"
            style={glassStyle}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>

          <button
            onClick={loadAnalyticsData}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl flex items-center gap-2"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* OVERVIEW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        <div
          onClick={() => setSelectedList(selectedList === 'PENDING' ? null : 'PENDING')}
          className="rounded-2xl p-6 cursor-pointer hover:scale-105 transition-transform"
          style={glassStyle}
        >
          <FileText className="mb-3" />
          <h3 className="text-2xl">{stats.total}</h3>
          <p className="text-sm">Total Applications</p>
        </div>

        <div
          onClick={() => setSelectedList(selectedList === 'APPROVED' ? null : 'APPROVED')}
          className="rounded-2xl p-6 cursor-pointer hover:scale-105 transition-transform"
          style={glassStyle}
        >
          <Users className="mb-3 text-green-600" />
          <h3 className="text-2xl text-green-600">{stats.approved}</h3>
          <p className="text-sm">Approved Candidates</p>
        </div>

        <div
          onClick={() => setSelectedList(selectedList === 'REJECTED' ? null : 'REJECTED')}
          className="rounded-2xl p-6 cursor-pointer hover:scale-105 transition-transform"
          style={glassStyle}
        >
          <Eye className="mb-3 text-red-600" />
          <h3 className="text-2xl text-red-600">{stats.rejected}</h3>
          <p className="text-sm">Rejected Candidates</p>
        </div>

        <div
          onClick={() => setSelectedList(selectedList === 'KIV' ? null : 'KIV')}
          className="rounded-2xl p-6 cursor-pointer hover:scale-105 transition-transform"
          style={glassStyle}
        >
          <Calendar className="mb-3 text-yellow-600" />
          <h3 className="text-2xl text-yellow-600">{stats.kiv}</h3>
          <p className="text-sm">Candidates in KIV</p>
        </div>

      </div>

      {/* CANDIDATE LIST PANEL */}
      {selectedList && (
        <div className="rounded-2xl p-6" style={glassStyle}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">{getListTitle()}</h3>
            <button
              onClick={() => setSelectedList(null)}
              className="text-gray-500 hover:text-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {getListCandidates().length === 0 ? (
            <p className="text-gray-500 text-sm">No candidates in this category.</p>
          ) : (
            <div className="space-y-3">
              {getListCandidates().map((c: any) => (
                <div
                  key={c.id}
                  className="rounded-xl p-4 bg-white/60 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-gray-800">{c.name || 'Unknown'}</p>
                    <p className="text-sm text-gray-500">{c.email || '-'} · {c.phone || '-'}</p>
                    <p className="text-sm text-gray-500">{c.location || '-'}</p>
                    {/* Show reject reason only for rejected */}
                    {selectedList === 'REJECTED' && c.reject_reason && (
                      <p className="text-sm text-red-600 mt-1 font-medium">
                        Reason: {REJECT_REASON_LABELS[c.reject_reason] || c.reject_reason}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 rounded-full text-xs bg-purple-100 text-purple-700">
                      Score: {c.score || 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="rounded-2xl p-6" style={glassStyle}>
          <h3 className="mb-4">Score Trends</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={analyticsData.scoreTrends}>
              <XAxis dataKey="date" />
              <YAxis />
              <Line dataKey="avgScore" stroke="#8B5CF6" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl p-6" style={glassStyle}>
          <h3 className="mb-4">Application Volume</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={analyticsData.applicationVolume}>
              <XAxis dataKey="date" />
              <YAxis />
              <Area dataKey="applications" stroke="#8B5CF6" fill="#8B5CF6" />
              <Area dataKey="completed" stroke="#14B8A6" fill="#14B8A6" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </div>

      <div className="rounded-2xl p-6" style={glassStyle}>
        <h3 className="mb-4">Performance Metrics</h3>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={analyticsData.performanceMetrics}>
            <PolarGrid />
            <PolarAngleAxis dataKey="metric" />
            <PolarRadiusAxis domain={[0, 100]} />
            <Radar dataKey="current" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
            <Radar dataKey="benchmark" stroke="#14B8A6" fill="#14B8A6" fillOpacity={0.15} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}