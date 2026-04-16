import React, { useEffect, useState } from 'react';
import { candidateStore } from '../store/candidateStore';

import {
  Users,
  Calendar,
  MapPin,
  Mail,
  Phone,
  UserMinus,
  AlertTriangle,
} from 'lucide-react';

export default function HiredCandidates() {

  const [candidates, setCandidates] = useState<any[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = () => {
    const hired = candidateStore.getHired();
    setCandidates(hired);
  };

  const markResigned = (id: string) => {
    candidateStore.markResigned(id);
    load();
  };

  const markAbsconded = (id: string) => {
    candidateStore.markAbsconded(id);
    load();
  };

  const glassStyle = {
    backdropFilter: 'blur(16px)',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    boxShadow: '0 8px 32px rgba(31,38,135,0.15)',
  };


console.log("Hired page loaded");


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
                  <h3 className="font-semibold">
                    {candidate.fileName}
                  </h3>

                  <p className="text-sm text-gray-600">
                    Hired:{' '}
                    {candidate.hiredAt
                      ? new Date(candidate.hiredAt).toLocaleDateString()
                      : '-'}
                  </p>
                </div>

                <span className="px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                  HIRED
                </span>

              </div>

              {/* Icons */}
              <div className="flex gap-3 mb-4 text-gray-600">
                <Mail className="w-4 h-4" />
                <Phone className="w-4 h-4" />
                <MapPin className="w-4 h-4" />
                <Calendar className="w-4 h-4" />
              </div>

              {/* Exit actions */}
              <div className="flex justify-end gap-2">

                <button
                  onClick={() => markResigned(candidate.id)}
                  className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200"
                >
                  <UserMinus className="w-3 h-3 inline mr-1" />
                  Resigned
                </button>

                <button
                  onClick={() => markAbsconded(candidate.id)}
                  className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                >
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  Absconded
                </button>

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

    </div>
  );
}
