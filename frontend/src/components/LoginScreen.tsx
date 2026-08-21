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
      style={{ background: 'rgb(var(--sx-bg))' }}
    >
      {/* Background ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(171, 118, 49, 0.12) 0%, transparent 70%)',
        }}
      />

      <div
        className="relative w-full max-w-sm rounded-3xl p-8 shadow-2xl"
        style={{
          background: 'rgb(var(--sx-surface))',
          border: '1px solid rgb(var(--sx-border-2))',
          boxShadow: '0 0 0 1px rgb(var(--sx-border-2)), 0 32px 64px rgba(0,0,0,0.6), 0 0 60px rgba(171, 118, 49, 0.08)',
        }}
      >
        {/* Brand & Title */}
        <div className="text-center space-y-4 mb-8">
          {/* Logo mark */}
          <div className="flex justify-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl"
              style={{
                background: 'linear-gradient(135deg, rgb(var(--am-600)), var(--brand-deep))',
                boxShadow: '0 0 30px rgba(171, 118, 49, 0.4), 0 0 60px rgba(165, 100, 42, 0.2)',
                animation: 'float 3s ease-in-out infinite',
              }}
            >
              ✦
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-100 tracking-tight">
              Nexus OS
            </h1>
            <p className="text-sm mt-1" style={{ color: 'rgb(var(--st-500))' }}>
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
                color: 'var(--rose)',
              }}
            >
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--st-500))' }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              className="w-full px-4 py-3 text-sm text-stone-100 rounded-xl outline-none transition-all"
              style={{
                background: 'rgb(var(--sx-card))',
                border: '1px solid rgb(var(--sx-border-2))',
              }}
              onFocus={e => {
                e.target.style.borderColor = 'rgb(var(--am-600))';
                e.target.style.boxShadow = '0 0 0 3px rgba(171, 118, 49, 0.12)';
              }}
              onBlur={e => {
                e.target.style.borderColor = 'rgb(var(--sx-border-2))';
                e.target.style.boxShadow = '';
              }}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--st-500))' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="w-full px-4 py-3 text-sm text-stone-100 rounded-xl outline-none transition-all"
              style={{
                background: 'rgb(var(--sx-card))',
                border: '1px solid rgb(var(--sx-border-2))',
              }}
              onFocus={e => {
                e.target.style.borderColor = 'rgb(var(--am-600))';
                e.target.style.boxShadow = '0 0 0 3px rgba(171, 118, 49, 0.12)';
              }}
              onBlur={e => {
                e.target.style.borderColor = 'rgb(var(--sx-border-2))';
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
                ? 'linear-gradient(135deg, rgb(var(--am-800)), #c2410c)'
                : 'linear-gradient(135deg, rgb(var(--am-600)), var(--brand-deep))',
              boxShadow: '0 4px 20px rgba(171, 118, 49, 0.35)',
              opacity: isLoading ? 0.7 : 1,
            }}
            onMouseEnter={e => {
              if (!isLoading) {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 30px rgba(171, 118, 49, 0.55)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(171, 118, 49, 0.35)';
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
          style={{ borderTop: '1px solid rgb(var(--sx-border-2))', color: 'rgb(var(--st-600))' }}
        >
          <Shield size={12} style={{ color: 'var(--success)' }} />
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
