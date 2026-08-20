import React, { useState } from 'react';
import { ArrowRight, Loader2, Shield } from 'lucide-react';
import { api } from '../services/api';

interface LoginScreenProps {
  onLoginSuccess: (username: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.login(username.trim(), password);
      onLoginSuccess(res.username);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-screen flex items-center justify-center p-4"
      style={{ background: '#0d0d0f' }}
    >
      {/* Background ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(139, 92, 246, 0.12) 0%, transparent 70%)',
        }}
      />

      <div
        className="relative w-full max-w-sm rounded-3xl p-8 shadow-2xl"
        style={{
          background: '#141416',
          border: '1px solid #2e2e33',
          boxShadow: '0 0 0 1px #2e2e33, 0 32px 64px rgba(0,0,0,0.6), 0 0 60px rgba(139, 92, 246, 0.08)',
        }}
      >
        {/* Brand & Title */}
        <div className="text-center space-y-4 mb-8">
          {/* Logo mark */}
          <div className="flex justify-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                boxShadow: '0 0 30px rgba(139, 92, 246, 0.4), 0 0 60px rgba(236, 72, 153, 0.2)',
                animation: 'float 3s ease-in-out infinite',
              }}
            >
              ✦
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Nexus OS
            </h1>
            <p className="text-sm mt-1" style={{ color: '#71717a' }}>
              Your personal command center
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              className="p-3 rounded-xl text-sm text-center"
              style={{
                background: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: '#fb7185',
              }}
            >
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: '#71717a' }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              className="w-full px-4 py-3 text-sm text-white rounded-xl outline-none transition-all"
              style={{
                background: '#1c1c1f',
                border: '1px solid #2e2e33',
              }}
              onFocus={e => {
                e.target.style.borderColor = '#8b5cf6';
                e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.12)';
              }}
              onBlur={e => {
                e.target.style.borderColor = '#2e2e33';
                e.target.style.boxShadow = '';
              }}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: '#71717a' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="w-full px-4 py-3 text-sm text-white rounded-xl outline-none transition-all"
              style={{
                background: '#1c1c1f',
                border: '1px solid #2e2e33',
              }}
              onFocus={e => {
                e.target.style.borderColor = '#8b5cf6';
                e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.12)';
              }}
              onBlur={e => {
                e.target.style.borderColor = '#2e2e33';
                e.target.style.boxShadow = '';
              }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 py-3 text-white rounded-xl text-sm font-semibold tracking-wide transition-all mt-2"
            style={{
              background: isLoading
                ? 'linear-gradient(135deg, #6d28d9, #be185d)'
                : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              boxShadow: '0 4px 20px rgba(139, 92, 246, 0.35)',
              opacity: isLoading ? 0.7 : 1,
            }}
            onMouseEnter={e => {
              if (!isLoading) {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 30px rgba(139, 92, 246, 0.55)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(139, 92, 246, 0.35)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Enter Workspace</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Security badge */}
        <div
          className="pt-5 mt-5 flex items-center justify-center space-x-2 text-xs"
          style={{ borderTop: '1px solid #2e2e33', color: '#52525b' }}
        >
          <Shield size={12} style={{ color: '#10b981' }} />
          <span>Single-user encrypted session</span>
        </div>

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-6px); }
          }
        `}</style>
      </div>
    </div>
  );
};
