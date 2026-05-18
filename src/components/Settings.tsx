import React, { useState, useEffect } from 'react';
import {
  User,
  Lock,
  Database,
  Download,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Palette,
  Monitor,
  CheckCircle,
  LogOut,
} from 'lucide-react';
import { atsApi } from '../services/atsApi';

export function Settings({ onThemeChange, currentTheme, onLogout }: {
  onThemeChange: (theme: string) => void,
  currentTheme: string,
  onLogout: () => void,
}) {
  const [activeSection, setActiveSection] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [currentDeletePassword, setCurrentDeletePassword] = useState('');
  const [newDeletePassword, setNewDeletePassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [settings, setSettings] = useState({
    company_name: '',
    hr_name: '',
    hr_email: '',
    hiring_position: '',
    min_score: 50,
    data_retention: '90',
    language: 'en',
    date_format: 'DD/MM/YYYY',
    privacy: {
      shareAnalytics: false,
      autoDelete: true,
    },
    appearance: {
      theme: currentTheme,
    },
  });

  const glassStyle = {
    backdropFilter: 'blur(16px)',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    boxShadow: '0 8px 32px rgba(31,38,135,0.15)',
  };

  const sections = [
    { id: 'profile', label: 'Company Profile', icon: User },
    { id: 'recruitment', label: 'Recruitment', icon: Monitor },
    { id: 'privacy', label: 'Privacy & Security', icon: Lock },
    { id: 'data', label: 'Data Management', icon: Database },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const data = await atsApi.getSettings();
      setSettings(prev => ({
        ...prev,
        company_name: data.company_name || '',
        hr_name: data.hr_name || '',
        hr_email: data.hr_email || '',
        hiring_position: data.hiring_position || '',
        min_score: data.min_score || 50,
        data_retention: data.data_retention || '90',
        language: data.language || 'en',
        date_format: data.date_format || 'DD/MM/YYYY',
      }));
    } catch (err) {
      console.error("Failed to load settings", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const payload: any = {
        company_name: settings.company_name,
        hr_name: settings.hr_name,
        hr_email: settings.hr_email,
        hiring_position: settings.hiring_position,
        min_score: settings.min_score,
        data_retention: settings.data_retention,
        language: settings.language,
        date_format: settings.date_format,
      };
      if (newPassword.trim()) {
        payload.app_password = newPassword.trim();
      }
      await atsApi.saveSettings(payload);
      setSaveSuccess(true);
      setNewPassword('');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save settings", err);
      alert("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateNested = (section: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...(prev as any)[section],
        [key]: value,
      },
    }));
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    background: 'rgba(255,255,255,0.8)',
    color: '#1f2937',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '6px',
    fontWeight: '500' as const,
  };

  const cardStyle = {
    padding: '16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    marginBottom: '12px',
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '256px' }}>
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const renderProfile = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={labelStyle}>Company Name</label>
          <input
            style={inputStyle}
            type="text"
            value={settings.company_name}
            onChange={e => updateSetting('company_name', e.target.value)}
            placeholder="e.g. OSADI Sdn Bhd"
          />
        </div>
        <div>
          <label style={labelStyle}>HR Manager Name</label>
          <input
            style={inputStyle}
            type="text"
            value={settings.hr_name}
            onChange={e => updateSetting('hr_name', e.target.value)}
            placeholder="e.g. Ahmad bin Ali"
          />
        </div>
        <div>
          <label style={labelStyle}>HR Email Address</label>
          <input
            style={inputStyle}
            type="email"
            value={settings.hr_email}
            onChange={e => updateSetting('hr_email', e.target.value)}
            placeholder="e.g. hr@company.com"
          />
        </div>
      </div>

      {/* Change Login Password */}
      <div>
        <label style={labelStyle}>Change Login Password</label>
        <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>
          Leave blank to keep current password. Click Save Changes to apply.
        </p>
        <div style={{ position: 'relative' }}>
          <input
            style={{ ...inputStyle, paddingRight: '44px' }}
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Enter new login password"
          />
          <button
            onClick={() => setShowPassword(!showPassword)}
            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
          >
            {showPassword
              ? <EyeOff style={{ width: '16px', height: '16px' }} />
              : <Eye style={{ width: '16px', height: '16px' }} />}
          </button>
        </div>
      </div>

      {/* Change Delete Data Password */}
      <div style={{ ...cardStyle, background: '#fef2f2', border: '1px solid #fecaca' }}>
        <label style={{ ...labelStyle, color: '#dc2626' }}>Change Delete Data Password</label>
        <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '12px' }}>
          Enter current delete password first, then set a new one.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input
            style={inputStyle}
            type="password"
            value={currentDeletePassword}
            onChange={e => setCurrentDeletePassword(e.target.value)}
            placeholder="Enter current delete password"
          />
          <input
            style={inputStyle}
            type="password"
            value={newDeletePassword}
            onChange={e => setNewDeletePassword(e.target.value)}
            placeholder="Enter new delete password"
          />
          <button
            onClick={async () => {
              if (!currentDeletePassword || !newDeletePassword) {
                alert('Please fill in both fields.');
                return;
              }
              const isValid = await atsApi.verifyDeletePassword(currentDeletePassword);
              if (!isValid) {
                alert('❌ Current delete password is incorrect.');
                return;
              }
              try {
                await atsApi.saveSettings({ delete_password: newDeletePassword });
                alert('✅ Delete password changed successfully!');
                setCurrentDeletePassword('');
                setNewDeletePassword('');
              } catch {
                alert('Failed to update password. Please try again.');
              }
            }}
            style={{
              padding: '10px 16px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              alignSelf: 'flex-start',
            }}
          >
            Change Delete Password
          </button>
        </div>
      </div>

      {/* Logout */}
      <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.08)', marginTop: '8px' }}>
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to logout?')) {
              onLogout();
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          <LogOut style={{ width: '16px', height: '16px' }} />
          Logout
        </button>
      </div>
    </div>
  );

  const renderRecruitment = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={cardStyle}>
        <label style={labelStyle}>Hiring Position</label>
        <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>
          The job position you are currently hiring for. This helps the AI score candidates more accurately.
        </p>
        <input
          style={inputStyle}
          type="text"
          value={settings.hiring_position}
          onChange={e => updateSetting('hiring_position', e.target.value)}
          placeholder="e.g. Production Operator, Quality Inspector"
        />
      </div>

      <div style={cardStyle}>
        <label style={labelStyle}>Minimum Score Threshold: {settings.min_score}%</label>
        <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '12px' }}>
          Candidates below this score will be flagged automatically.
        </p>
        <input
          type="range"
          min="0"
          max="100"
          value={settings.min_score}
          onChange={e => updateSetting('min_score', parseInt(e.target.value))}
          style={{ width: '100%', accentColor: '#7c3aed' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
          <span>0%</span>
          <span style={{ color: '#7c3aed', fontWeight: '600' }}>{settings.min_score}%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );

  const renderPrivacy = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={cardStyle}>
        <p style={{ fontWeight: '500', color: '#1f2937', marginBottom: '4px' }}>Data Retention Period</p>
        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>How long should we keep uploaded resumes?</p>
        <select
          value={settings.data_retention}
          onChange={e => updateSetting('data_retention', e.target.value)}
          style={inputStyle}
        >
          <option value="30">30 days</option>
          <option value="90">90 days</option>
          <option value="180">6 months</option>
          <option value="365">1 year</option>
          <option value="forever">Keep forever</option>
        </select>
      </div>

      {[
        { key: 'shareAnalytics', label: 'Share Anonymous Analytics', desc: 'Help improve the system by sharing anonymous usage data' },
        { key: 'autoDelete', label: 'Auto-delete Old Data', desc: 'Automatically delete data after retention period' },
      ].map(item => (
        <div key={item.key} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
          <div>
            <p style={{ fontWeight: '500', color: '#1f2937', marginBottom: '2px' }}>{item.label}</p>
            <p style={{ fontSize: '13px', color: '#6b7280' }}>{item.desc}</p>
          </div>
          <div
            onClick={() => updateNested('privacy', item.key, !(settings.privacy as any)[item.key])}
            style={{
              width: '44px',
              height: '24px',
              borderRadius: '999px',
              background: (settings.privacy as any)[item.key] ? '#7c3aed' : '#d1d5db',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <div style={{
              position: 'absolute',
              top: '2px',
              left: (settings.privacy as any)[item.key] ? '22px' : '2px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'white',
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
        </div>
      ))}
    </div>
  );

  const renderData = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

      {/* Export Data */}
      <button
        onClick={async () => {
          try {
            await atsApi.exportCandidatesCSV();
          } catch {
            alert("Export failed. Please try again.");
          }
        }}
        style={{ padding: '24px', background: '#f3e8ff', border: 'none', borderRadius: '12px', textAlign: 'left', cursor: 'pointer' }}
      >
        <Download style={{ width: '32px', height: '32px', color: '#7c3aed', marginBottom: '12px' }} />
        <p style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>Export Data</p>
        <p style={{ fontSize: '13px', color: '#6b7280' }}>Download all candidates as CSV</p>
      </button>

      {/* Import Data */}
      <button
        onClick={() => alert("Import feature coming soon!")}
        style={{ padding: '24px', background: '#f0fdfa', border: 'none', borderRadius: '12px', textAlign: 'left', cursor: 'pointer' }}
      >
        <Upload style={{ width: '32px', height: '32px', color: '#0d9488', marginBottom: '12px' }} />
        <p style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>Import Data</p>
        <p style={{ fontSize: '13px', color: '#6b7280' }}>Import data from previous backups</p>
      </button>

      {/* Reset Settings */}
      <button
        onClick={async () => {
          if (window.confirm('Reset all settings to default values? This cannot be undone.')) {
            try {
              await atsApi.resetSettings();
              await loadSettings();
              alert("Settings reset successfully!");
            } catch {
              alert("Reset failed. Please try again.");
            }
          }
        }}
        style={{ padding: '24px', background: '#eff6ff', border: 'none', borderRadius: '12px', textAlign: 'left', cursor: 'pointer' }}
      >
        <RefreshCw style={{ width: '32px', height: '32px', color: '#2563eb', marginBottom: '12px' }} />
        <p style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>Reset Settings</p>
        <p style={{ fontSize: '13px', color: '#6b7280' }}>Reset all settings to default values</p>
      </button>

      {/* Delete All Data - Password Protected */}
      <button
        onClick={async () => {
          const enteredPassword = window.prompt('🔐 Enter delete password to proceed:');
          if (enteredPassword === null || enteredPassword === '') return;

          try {
            const isValid = await atsApi.verifyDeletePassword(enteredPassword);
            if (!isValid) {
              alert('❌ Incorrect password. Delete cancelled.');
              return;
            }
            if (window.confirm('⚠️ WARNING: This will permanently delete ALL candidate data. This cannot be undone!')) {
              await atsApi.deleteAllCandidates();
              alert('✅ All candidate data deleted successfully.');
            }
          } catch {
            alert('Delete failed. Please try again.');
          }
        }}
        style={{ padding: '24px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', textAlign: 'left', cursor: 'pointer' }}
      >
        <Trash2 style={{ width: '32px', height: '32px', color: '#dc2626', marginBottom: '12px' }} />
        <p style={{ fontWeight: '600', color: '#dc2626', marginBottom: '4px' }}>Delete All Data</p>
        <p style={{ fontSize: '13px', color: '#ef4444' }}>Password protected — permanently delete all data</p>
      </button>

    </div>
  );

  const renderAppearance = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={cardStyle}>
        <p style={{ fontWeight: '500', color: '#1f2937', marginBottom: '4px' }}>Theme</p>
        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>Choose your preferred color scheme</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          {['light', 'dark', 'auto'].map(themeOption => (
            <button
              key={themeOption}
              onClick={() => {
                updateNested('appearance', 'theme', themeOption);
                onThemeChange(themeOption);
              }}
              style={{
                padding: '12px',
                borderRadius: '10px',
                border: settings.appearance.theme === themeOption ? '2px solid #7c3aed' : '1px solid #d1d5db',
                background: settings.appearance.theme === themeOption ? '#f3e8ff' : 'white',
                color: settings.appearance.theme === themeOption ? '#7c3aed' : '#374151',
                cursor: 'pointer',
                textTransform: 'capitalize',
                fontWeight: '500',
              }}
            >
              <Monitor style={{ width: '20px', height: '20px', margin: '0 auto 4px' }} />
              {themeOption}
            </button>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <p style={{ fontWeight: '500', color: '#1f2937', marginBottom: '4px' }}>Language</p>
        <select
          value={settings.language}
          onChange={e => updateSetting('language', e.target.value)}
          style={{ ...inputStyle, marginTop: '8px' }}
        >
          <option value="en">English</option>
          <option value="ms">Bahasa Malaysia</option>
          <option value="zh">Chinese</option>
        </select>
      </div>

      <div style={cardStyle}>
        <p style={{ fontWeight: '500', color: '#1f2937', marginBottom: '4px' }}>Date Format</p>
        <select
          value={settings.date_format}
          onChange={e => updateSetting('date_format', e.target.value)}
          style={{ ...inputStyle, marginTop: '8px' }}
        >
          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
        </select>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'profile': return renderProfile();
      case 'recruitment': return renderRecruitment();
      case 'privacy': return renderPrivacy();
      case 'data': return renderData();
      case 'appearance': return renderAppearance();
      default: return renderProfile();
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
          Settings
        </h1>
        <p style={{ color: '#6b7280', marginTop: '4px' }}>
          Manage your company profile and application preferences.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '24px' }}>

        {/* Sidebar */}
        <div style={{ borderRadius: '16px', padding: '16px', ...glassStyle }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sections.map(section => {
              const Icon = section.icon;
              const active = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    background: active ? 'linear-gradient(to right, #8b5cf6, #14b8a6)' : 'transparent',
                    color: active ? 'white' : '#374151',
                    fontWeight: active ? '600' : '400',
                    fontSize: '14px',
                  }}
                >
                  <Icon style={{ width: '18px', height: '18px' }} />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div style={{ borderRadius: '16px', padding: '24px', ...glassStyle }}>

          {/* Content Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937' }}>
              {sections.find(s => s.id === activeSection)?.label}
            </h2>

            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: saveSuccess ? '#22c55e' : 'linear-gradient(to right, #8b5cf6, #14b8a6)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: isSaving ? 0.7 : 1,
                transition: 'background 0.3s',
              }}
            >
              {saveSuccess
                ? <><CheckCircle style={{ width: '16px', height: '16px' }} /> Saved!</>
                : isSaving
                ? <><RefreshCw style={{ width: '16px', height: '16px' }} /> Saving...</>
                : <><Save style={{ width: '16px', height: '16px' }} /> Save Changes</>
              }
            </button>
          </div>

          {renderContent()}
        </div>
      </div>
    </div>
  );
}