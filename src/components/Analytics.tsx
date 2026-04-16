import { candidateStore } from '../store/candidateStore';
import React, { useState, useEffect } from 'react';
import {
  Users,
  FileText,
  Calendar,
  Download,
  Eye
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { atsApi } from '../services/atsApi';

export function Analytics() {
  const stats = candidateStore.getStats();
  const candidates = candidateStore.getAll();

  const [dateRange, setDateRange] = useState('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedList, setSelectedList] =
    useState<'rejected' | 'kiv' | null>(null);

  const [analyticsData, setAnalyticsData] = useState({
    overview: {},
    skillTrends: [],
    scoreTrends: [],
    applicationVolume: [],
    topSkills: [],
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
      const completed = resumes.filter(
        r => r.status === 'completed' && r.analysis
      );

      setAnalyticsData({
        overview: {},
        skillTrends: [],
        scoreTrends: generateScoreTrends(),
        applicationVolume: generateApplicationVolume(),
        topSkills: [],
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

        <div className="rounded-2xl p-6" style={glassStyle}>
          <FileText className="mb-3" />
          <h3 className="text-2xl">{stats.total}</h3>
          <p className="text-sm">Total Applications</p>
        </div>

        <div className="rounded-2xl p-6" style={glassStyle}>
          <Users className="mb-3 text-green-600" />
          <h3 className="text-2xl text-green-600">{stats.approved}</h3>
          <p className="text-sm">Approved Candidates</p>
        </div>

        <div
          onClick={() => setSelectedList('rejected')}
          className="rounded-2xl p-6 cursor-pointer"
          style={glassStyle}
        >
          <Eye className="mb-3 text-red-600" />
          <h3 className="text-2xl text-red-600">{stats.rejected}</h3>
          <p className="text-sm">Rejected Candidates</p>
        </div>

        <div
          onClick={() => setSelectedList('kiv')}
          className="rounded-2xl p-6 cursor-pointer"
          style={glassStyle}
        >
          <Calendar className="mb-3 text-yellow-600" />
          <h3 className="text-2xl text-yellow-600">{stats.kiv}</h3>
          <p className="text-sm">Candidates in KIV</p>
        </div>

      </div>

      {/* ✅ STEP 6.4 — LIST RENDER (CORRECT LOCATION) */}
      {selectedList && (
        <div className="rounded-2xl p-6" style={glassStyle}>
          <h3 className="text-xl font-semibold mb-4 capitalize">
            {selectedList === 'rejected'
              ? 'Rejected Candidates'
              : 'Candidates in KIV'}
          </h3>

          {candidates
            .filter(c => c.decision === selectedList)
            .map(c => (
              <div
                key={c.id}
                className="border rounded-lg p-4 mb-3 bg-white/40"
              >
                <p className="font-medium">{c.fileName}</p>

                {c.decisionReason && (
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-semibold">Reason:</span>{' '}
                    {c.decisionReason}
                  </p>
                )}

                <p className="text-xs text-gray-500 mt-1">
                  Decided at:{' '}
                  {c.decidedAt
                    ? new Date(c.decidedAt).toLocaleString()
                    : '-'}
                </p>
              </div>
            ))}

          {candidates.filter(c => c.decision === selectedList).length === 0 && (
            <p className="text-gray-500 text-sm">
              No candidates in this category.
            </p>
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
