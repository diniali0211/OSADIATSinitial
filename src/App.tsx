import React, { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { ResumeAnalyzer } from "./components/ResumeAnalyzer";
import { CandidateManagement } from "./components/CandidateManagement";
import { Analytics } from "./components/Analytics";
import { Settings } from "./components/Settings";
import HiredCandidates from "./components/HiredCandidates";
import { DecisionQueue } from "./components/DecisionQueue";
import { Login } from "./components/Login";

export default function App() {
  const [activeTab, setActiveTab] = useState("analytics");
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [isLoggedIn, setIsLoggedIn] = useState(
    sessionStorage.getItem('ats_logged_in') === 'true'
  );

  useEffect(() => {
    applyTheme(theme);
  }, []);

  const applyTheme = (selectedTheme: string) => {
    if (selectedTheme === 'dark') {
      document.body.style.filter = 'invert(1) hue-rotate(180deg)';
      document.body.style.background = '#0f0f1a';
    } else if (selectedTheme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.body.style.filter = 'invert(1) hue-rotate(180deg)';
        document.body.style.background = '#0f0f1a';
      } else {
        document.body.style.filter = '';
        document.body.style.background = '';
      }
    } else {
      document.body.style.filter = '';
      document.body.style.background = '';
    }
    localStorage.setItem('theme', selectedTheme);
    setTheme(selectedTheme);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('ats_logged_in');
    setIsLoggedIn(false);
  };

  // Show login if not logged in
  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case "analyzer": return <ResumeAnalyzer />;
      case "candidates": return <CandidateManagement />;
      case "kiv": return <DecisionQueue />;
      case "analytics": return <Analytics />;
      case "hired": return <HiredCandidates />;
      case "settings": return <Settings onThemeChange={applyTheme} currentTheme={theme} onLogout={handleLogout} />;
      default: return <Analytics />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-teal-50">
      <div className="fixed inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
        <main className="flex-1 p-6">{renderContent()}</main>
      </div>

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
}
