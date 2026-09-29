import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, ArrowRight, ArrowLeft, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { busApiService } from '../../services/busApiService';
import { sound } from '../../utils/sound';

interface AdminLoginScreenProps {
  onLoginSuccess: () => void;
  onNavigateHome: () => void;
}

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({ onLoginSuccess, onNavigateHome }) => {
  const [email, setEmail] = useState('admin@dce.edu');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both administrative email and password.');
      sound.playAlert();
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    sound.playClick();

    try {
      await busApiService.adminLogin(email.trim(), password.trim());
      sound.playSuccess();
      onLoginSuccess();
    } catch (err: any) {
      sound.playAlert();
      setErrorMsg(err.message || 'Invalid administrator credentials. Access Denied.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillQuickDemo = () => {
    setEmail('admin@dce.edu');
    setPassword('admin123');
    setErrorMsg(null);
    sound.playClick();
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 relative overflow-hidden dark:bg-[#070B19] bg-[#0A1224] text-white selection:bg-cyan-500 selection:text-black">
      
      {/* Background Ambient Cyber Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 sm:w-[600px] h-96 sm:h-[600px] rounded-full bg-cyan-500/10 blur-[130px] transform-gpu" />
        <div className="absolute top-1/2 -left-32 w-96 sm:w-[500px] h-96 sm:h-[500px] rounded-full bg-blue-600/15 blur-[140px] transform-gpu" />
        <div className="absolute -bottom-32 right-1/4 w-80 h-80 rounded-full bg-indigo-600/10 blur-[120px] transform-gpu" />
      </div>

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-md backdrop-blur-2xl bg-white/[0.04] dark:bg-black/40 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        
        {/* Back Link to Tracking Map */}
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Live Bus Tracker</span>
        </button>

        {/* Header & Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 text-cyan-400 mb-4 shadow-[0_0_25px_rgba(6,182,212,0.3)]">
            <ShieldCheck className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            DCE Admin Command
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 font-medium">
            Dhanalakshmi College of Engineering, Chennai
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase mt-3 bg-cyan-500/10 text-cyan-400 border border-cyan-400/25">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Web-Only Administration Portal</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-[fadeIn_0.2s_ease-out]">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Administrator Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@dce.edu"
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Master Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-11 py-3 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-mono"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-400"
              />
              <span>Remember session</span>
            </label>
            <button
              type="button"
              onClick={fillQuickDemo}
              className="text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer underline decoration-cyan-400/40"
            >
              Fill Default Admin
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 mt-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-sm tracking-wide transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Authenticating Clearance...</span>
              </span>
            ) : (
              <>
                <span>Access Admin Console</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Links between Portals */}
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('dce_navigate', { detail: { route: 'staff-login' } }))}
            className="hover:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>🚌 Driver & Staff Login</span>
          </button>
          <button
            type="button"
            onClick={onNavigateHome}
            className="hover:text-cyan-400 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>🎓 Student & Guest Portal</span>
          </button>
        </div>

        {/* Security Notice */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Restricted access for Dhanalakshmi College of Engineering Transport Cell. 
            All access logs, sessions, and mutations are cryptographically recorded.
          </p>
        </div>

      </div>

    </div>
  );
};
