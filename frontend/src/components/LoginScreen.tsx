import React, { useState } from 'react';
import { Lock, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
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
    <div className="min-h-screen w-screen bg-[#090a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#12141c] border border-[#262a3c] rounded-2xl p-8 shadow-2xl space-y-6">
        
        {/* Brand & Title */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto">
            <Lock size={22} />
          </div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">
            Nexus Personal Command Center
          </h1>
          <p className="text-xs text-slate-400">
            Single-user authenticated execution environment.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs text-center">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              className="w-full bg-[#181a24] border border-[#262a3c] rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="w-full bg-[#181a24] border border-[#262a3c] rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold tracking-wide transition-all shadow-md mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Unlock Workspace</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Security badge */}
        <div className="pt-4 border-t border-[#262a3c]/60 flex items-center justify-center space-x-2 text-[11px] text-slate-400">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Single-user encrypted session token</span>
        </div>

      </div>
    </div>
  );
};
