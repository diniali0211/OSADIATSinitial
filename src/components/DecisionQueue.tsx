import React, { useEffect, useState } from "react";
import { candidateStore } from "../store/candidateStore";
import {
  CheckCircle,
  XCircle,
  Eye,
  Users,
} from "lucide-react";

export function DecisionQueue() {
  const [kivCandidates, setKivCandidates] = useState<any[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);


  const glassStyle = {
    backdropFilter: "blur(16px)",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    boxShadow: "0 8px 32px rgba(31,38,135,0.15)",
  };

  const loadKIV = () => {
    const kiv = candidateStore.getKiv();
    setKivCandidates(kiv);
  };

  useEffect(() => {
    loadKIV();
  }, []);

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
                    {candidate.analysis?.personalInfo?.name ||
                      candidate.fileName}
                  </h3>

                  <p className="text-sm text-gray-600">
                    Score: {candidate.analysis?.overallScore || 0}%
                  </p>
                </div>

                <span className="px-3 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">
                  KIV
                </span>
              </div>

              <div className="flex gap-3 justify-end mt-4">

                <button
                  onClick={() => {
                    candidateStore.setDecision(
                      candidate.id,
                      "approved"
                    );
                    loadKIV();
                  }}
                  className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-lg text-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>

                <button
                  onClick={() => {
                    candidateStore.setDecision(
                      candidate.id,
                      "rejected"
                    );
                    loadKIV();
                  }}
                  className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-lg text-sm"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>

                <button
                onClick={() => setSelectedCandidate(candidate)}
                className="flex items-center gap-2 px-3 py-1 border rounded-lg text-sm"
              >
                  <Eye className="w-4 h-4" />
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

            {selectedCandidate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">

          <div className="w-[90%] max-w-4xl bg-white rounded-2xl p-6 shadow-2xl">

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">
                Candidate Review
              </h2>

              <button
                onClick={() => setSelectedCandidate(null)}
                className="text-gray-600 hover:text-black"
              >
                ✕
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-6 mb-6">

              <div>
                <h3 className="font-semibold text-lg">
                  {selectedCandidate.analysis?.personalInfo?.name}
                </h3>

                <p className="text-sm text-gray-600">
                  {selectedCandidate.analysis?.experience?.totalYears || 0} years experience
                </p>

                <p className="text-sm">
                  {selectedCandidate.fileName}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full">
                  {selectedCandidate.analysis?.overallScore}%
                </span>

                <span className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full">
                  {selectedCandidate.decision}
                </span>
              </div>

            </div>

            {/* Skills */}
            <div className="mb-6">
              <h4 className="font-medium mb-2">Top Skills</h4>
              <div className="flex flex-wrap gap-2">
                {selectedCandidate.analysis?.skills?.slice(0, 10).map((s: any) => (
                  <span
                    key={s.name}
                    className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-700"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 mt-8">

              <button
                onClick={() => {
                  candidateStore.hireCandidate(selectedCandidate.id);
                  setSelectedCandidate(null);
                  loadKIV();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Hire
              </button>

              <button
                onClick={() => {
                  candidateStore.setDecision(
                    selectedCandidate.id,
                    "rejected"
                  );
                  setSelectedCandidate(null);
                  loadKIV();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg"
              >
                Reject
              </button>

              <button
                onClick={() => setSelectedCandidate(null)}
                className="px-4 py-2 border rounded-lg"
              >
                Close
              </button>

            </div>

          </div>
        </div>
      )}
      
    </div>
  );
}
