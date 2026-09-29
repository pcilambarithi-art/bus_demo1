import React, { useState } from 'react';
import { Bus, Lock, Mail, ArrowRight, ArrowLeft, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { busApiService } from '../../services/busApiService';
import { sound } from '../../utils/sound';

interface StaffLoginScreenProps {
  onLoginSuccess: () => void;
  onNavigateHome: () => void;
}

export const StaffLoginScreen: React.FC<StaffLoginScreenProps> = ({ onLoginSuccess, onNavigateHome }) => {
  const [emailOrPhone, setEmailOrPhone] = useState('murugan@dce.edu');
  const [password, setPassword] = useState('dce2024');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.trim() || !password.trim()) {
      setErrorMsg('Please enter your staff email/phone and password.');
      sound.playAlert();
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    sound.playClick();

    try {
      await busApiService.staffLogin(emailOrPhone.trim(), password.trim());
      sound.playSuccess();
      onLoginSuccess();
    } catch (err: any) {
      sound.playAlert();
      setErrorMsg(err.message || 'Staff login credentials not recognized. Contact Transport Desk.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (_name: string, email: string) => {
    setEmailOrPhone(email);
    setPassword('dce2024');
    setErrorMsg(null);
    sound.playClick();
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 relative overflow-hidden dark:bg-[#070B19] bg-[#0A1224] text-white selection:bg-amber-500 selection:text-black">
      
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 sm:w-[500px] h-96 sm:h-[500px] rounded-full bg-amber-500/10 blur-[130px] transform-gpu" />
        <div className="absolute top-1/2 -right-32 w-96 sm:w-[500px] h-96 sm:h-[500px] rounded-full bg-cyan-600/10 blur-[140px] transform-gpu" />
      </div>

      <div className="relative z-10 w-full max-w-md backdrop-blur-2xl bg-white/[0.04] dark:bg-black/40 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        
        {/* Back Link */}
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Bus Tracker</span>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-400 mb-3 shadow-[0_0_25px_rgba(245,158,11,0.3)]">
            <Bus className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Bus Staff & Driver Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Dhanalakshmi College of Engineering, Chennai
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase mt-2.5 bg-amber-500/10 text-amber-400 border border-amber-400/25">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Mobile-Optimized Staff Cockpit</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-[fadeIn_0.2s_ease-out]">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Staff Email or Phone
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                placeholder="murugan@dce.edu or phone"
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400 font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Staff Password
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
                className="w-full pl-10 pr-11 py-3 rounded-2xl bg-white/[0.06] border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400 font-mono"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 mt-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-sm tracking-wide transition-all shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isLoading ? 'Authenticating...' : 'Enter Driver Cockpit'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Driver Roster Selector for testing */}
        <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase block text-center">
            Quick Driver Login (Demo)
          </span>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              onClick={() => handleQuickFill('Muruganandam (Bus 07)', 'murugan@dce.edu')}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 text-left border border-white/5 cursor-pointer"
            >
              <div className="font-bold text-white">Muruganandam</div>
              <div className="text-[10px] text-amber-400">Bus DCE-07</div>
            </button>
            <button
              onClick={() => handleQuickFill('Senthil Kumar (Bus 04)', 'senthil@dce.edu')}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 text-left border border-white/5 cursor-pointer"
            >
              <div className="font-bold text-white">Senthil Kumar</div>
              <div className="text-[10px] text-amber-400">Bus DCE-04</div>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
