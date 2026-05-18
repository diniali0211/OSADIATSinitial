import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { atsApi } from '../services/atsApi';

export function Login({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!password) {
      setError('Please enter a password');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const success = await atsApi.login(password);
      if (success) {
        sessionStorage.setItem('ats_logged_in', 'true');
        onLogin();
      } else {
        setError('Incorrect password. Please try again.');
      }
    } catch {
      setError('Cannot connect to server. Make sure backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f3e8ff 0%, #eff6ff 50%, #f0fdfa 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Background blobs */}
      <div style={{ position: 'fixed', inset: 0, opacity: 0.3, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '288px', height: '288px', background: '#d8b4fe', borderRadius: '50%', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: '288px', height: '288px', background: '#99f6e4', borderRadius: '50%', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: '50%', width: '288px', height: '288px', background: '#bfdbfe', borderRadius: '50%', filter: 'blur(60px)' }} />
      </div>

      {/* Login Card */}
      <div style={{
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.5)',
        borderRadius: '24px',
        padding: '48px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.1)',
        position: 'relative',
        zIndex: 10,
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #8b5cf6, #14b8a6)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Lock style={{ width: '32px', height: '32px', color: 'white' }} />
          </div>

          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            background: 'linear-gradient(to right, #8b5cf6, #14b8a6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px',
          }}>
            OSADI ATS
          </h1>

          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Enter your password to access the system
          </p>
        </div>

        {/* Password Input */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: '#374151', fontWeight: '500', marginBottom: '8px' }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Enter password"
              style={{
                width: '100%',
                padding: '12px 44px 12px 16px',
                borderRadius: '12px',
                border: error ? '2px solid #ef4444' : '1px solid #d1d5db',
                background: 'rgba(255,255,255,0.8)',
                fontSize: '14px',
                color: '#1f2937',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#9ca3af',
              }}
            >
              {showPassword
                ? <EyeOff style={{ width: '18px', height: '18px' }} />
                : <Eye style={{ width: '18px', height: '18px' }} />}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '14px',
            color: '#dc2626',
          }}>
            {error}
          </div>
        )}

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '14px',
            background: isLoading ? '#d1d5db' : 'linear-gradient(to right, #8b5cf6, #14b8a6)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            marginBottom: '16px',
          }}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>

        {/* Hint */}
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af' }}>
          Default password: <strong>admin123</strong>
        </p>
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
          Change it in Settings → Company Profile
        </p>

      </div>
    </div>
  );
}