import React, { useState, useEffect } from 'react';
import { candidateStore } from '../store/candidateStore';

import {
  Users,
  Search,
  Filter,
  Download,
  Trash2,  
  Calendar,
  MapPin,
  Mail,
  Phone,
  MoreVertical,
  SortAsc,
  SortDesc,
} from 'lucide-react';

import { atsApi } from '../services/atsApi';

export function CandidateManagement() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterScore, setFilterScore] = useState('all');
  const [filterStatus, setFilterStatus] = useState('approved');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(
    new Set()
  );

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
  }, [candidates, searchTerm, sortBy, sortOrder, filterScore, filterStatus]);

  const loadCandidates = () => {
  const approved = candidateStore.getApproved();
  setCandidates(approved);
  setIsLoading(false);
};


  const filterAndSortCandidates = () => {
    let filtered = [...candidates];

    if (searchTerm) {
      filtered = filtered.filter((candidate) =>
        candidate.fileName
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase())
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    if (score >= 40) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusBadge = (decision: string) => {
    switch (decision) {
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'hired':
        return 'bg-blue-100 text-blue-700';
      case 'resigned':
        return 'bg-orange-100 text-orange-700';
      case 'absconded':
        return 'bg-red-100 text-red-700';
      case 'kiv':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const toggleCandidateSelection = (id: string) => {
    const updated = new Set(selectedCandidates);
    updated.has(id) ? updated.delete(id) : updated.add(id);
    setSelectedCandidates(updated);
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

                <span
                  className={`px-3 py-1 rounded-full text-xs ${getStatusBadge(
                    candidate.decision
                  )}`}
                >
                  {candidate.decision}
                </span>
              </div>

              <div className="flex gap-2 mb-4">
                <Mail className="w-4 h-4" />
                <Phone className="w-4 h-4" />
                <MapPin className="w-4 h-4" />
                <Calendar className="w-4 h-4" />
              </div>

              <div className="flex justify-between items-center">

                <span
                  className={`px-3 py-1 rounded-full text-xs ${getScoreColor(
                    candidate.analysis?.overallScore || 0
                  )}`}
                >
                  {candidate.analysis?.overallScore || 0}%
                </span>

                <div className="flex gap-2 items-center">

                  <button
                    onClick={() => {
                      candidateStore.hireCandidate(candidate.id);
                      loadCandidates(); // refresh approved list
                    }}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
    </div>
  );
}
      