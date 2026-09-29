import React, { useState } from 'react';
import { useBus } from '../context/BusContext';
import { isWebBrowser } from '../utils/platform';
import { busApiService } from '../services/busApiService';
import { sound } from '../utils/sound';
import {
  Volume2,
  VolumeX,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  User,
  Hash,
  BookOpen,
  MapPin,
  CheckCircle,
  Radio,
  Sun,
  Moon,
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const {
    loginWithGoogle,
    loginWithCollegeId,
    loginAsGuest,
    setMode,
    isSoundMuted,
    toggleSound,
    allRoutes,
    setTheme,
    isDark,
  } = useBus();

  const isWeb = isWebBrowser();
  const [activeTab, setActiveTab] = useState<'google' | 'college' | 'admin'>('google');

  // Admin Login State
  const [adminEmail, setAdminEmail] = useState('admin@dce.edu');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Google Modal State
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');

  // College ID Form State
  const [name, setName] = useState('Karthik S.');
  const [rollNumber, setRollNumber] = useState('DCE-2024-CSE-042');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [selectedRouteId, setSelectedRouteId] = useState(allRoutes[0]?.id || 'route-07');

  const handleGoogleSubmit = (email?: string, displayName?: string) => {
    loginWithGoogle({
      email: email || customGoogleEmail || 'karthik.s.dce@gmail.com',
      name: displayName || customGoogleName || 'Karthik S.',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
    });
    setIsGoogleModalOpen(false);
  };

  const handleCollegeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const route = allRoutes.find((r) => r.id === selectedRouteId) || allRoutes[0];
    loginWithCollegeId({
      name,
      rollNumber,
      department,
      busId: route.id === 'route-04' ? 'bus-04' : route.id === 'route-01' ? 'bus-01' : route.id === 'route-12' ? 'bus-12' : 'bus-07',
      stopId: route.stops[2]?.id || route.stops[0]?.id,
    });
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminPassword.trim()) {
      setAdminError('Please enter administrator email and password.');
      sound.playAlert();
      return;
    }
    setAdminLoading(true);
    setAdminError(null);
    sound.playClick();
    try {
      await busApiService.adminLogin(adminEmail.trim(), adminPassword.trim());
      sound.playSuccess();
      window.dispatchEvent(new CustomEvent('dce_navigate', { detail: { route: 'admin-dashboard' } }));
    } catch (err: any) {
      sound.playAlert();
      setAdminError(err.message || 'Invalid administrator credentials. Access Denied.');
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-between dark:bg-[#070B19] bg-[#F8FAFC] dark:text-white text-slate-900 selection:bg-cyan-500 selection:text-black overflow-x-hidden font-sans transition-colors duration-300">
      
      {/* Ambient Atmospheric Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 sm:w-[500px] h-96 sm:h-[500px] rounded-full dark:bg-cyan-500/15 bg-cyan-400/20 blur-[140px] transform-gpu" />
        <div className="absolute top-1/3 -right-32 w-96 sm:w-[550px] h-96 sm:h-[550px] rounded-full dark:bg-blue-600/15 bg-blue-400/15 blur-[150px] transform-gpu" />
        <div className="absolute -bottom-32 left-1/4 w-80 h-80 rounded-full dark:bg-indigo-600/15 bg-indigo-300/20 blur-[140px] transform-gpu" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 w-full px-4 sm:px-8 py-4 sm:py-6 flex items-center justify-between border-b dark:border-white/10 border-slate-200/80 dark:bg-transparent bg-white/50 backdrop-blur-md">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-10 h-10 rounded-2xl overflow-hidden border border-cyan-400/40 shadow-[0_0_20px_rgba(6,182,212,0.4)] shrink-0 bg-white">
            <img
              src="./app-logo.jpg"
              alt="DCE Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <span className="font-extrabold text-base sm:text-lg tracking-tight dark:text-white text-slate-900 block leading-tight">
              DCE<span className="text-cyan-500 dark:text-cyan-400"> BUS TRACKER</span>
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wider uppercase leading-tight hidden sm:block">
              Dhanalakshmi College of Engineering
            </span>
          </div>
        </div>

        {/* Audio Mute/Unmute, Theme Toggle & Campus Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md dark:bg-white/5 bg-emerald-50 dark:border-white/10 border-emerald-200 text-emerald-600 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Campus Fleet Live</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center backdrop-blur-xl border transition-all active:scale-95 shadow-sm dark:bg-white/5 bg-white text-slate-700 dark:text-slate-300 dark:border-white/10 border-slate-200 hover:bg-slate-100 dark:hover:bg-white/15 cursor-pointer"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>

          {/* Audio Sound Toggle */}
          <button
            onClick={toggleSound}
            title={isSoundMuted ? 'Unmute Audio & Voice' : 'Mute Audio & Voice'}
            aria-label="Toggle Sound"
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center backdrop-blur-xl border transition-all active:scale-95 shadow-sm cursor-pointer ${
              isSoundMuted
                ? 'bg-rose-500/15 border-rose-500/35 text-rose-500 dark:text-rose-400 hover:bg-rose-500/25'
                : 'bg-cyan-500/15 border-cyan-400/40 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/25'
            }`}
          >
            {isSoundMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4 animate-pulse" />
            )}
          </button>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-md backdrop-blur-2xl dark:bg-slate-900/80 bg-white/90 dark:border-white/10 border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative overflow-hidden transition-colors duration-300">
          
          {/* Top Neon Border Glow */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

          {/* Welcome Badge */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full dark:bg-cyan-500/10 bg-cyan-50 border dark:border-cyan-400/30 border-cyan-200 text-cyan-600 dark:text-cyan-400 text-xs font-semibold mb-3">
              {activeTab === 'admin' ? <Shield className="w-3.5 h-3.5 text-cyan-500" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>
                {activeTab === 'admin' ? 'DCE Central Administration' : 'Official Student & Faculty Portal'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black dark:text-white text-slate-900 tracking-tight">
              {activeTab === 'admin' ? 'Administrator Login' : 'Sign In to Transit'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {activeTab === 'admin'
                ? 'Role-based fleet management, routes & live telemetry control'
                : 'Track your college bus live with GPS & voice alerts'}
            </p>
          </div>

          {/* Tab Switcher (Google Connect vs College ID vs Admin Login) */}
          <div className="flex p-1 rounded-2xl dark:bg-[#070B19]/80 bg-slate-100 dark:border-white/10 border-slate-200 mb-6 gap-1">
            <button
              onClick={() => setActiveTab('google')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'google'
                  ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Google</span>
            </button>
            <button
              onClick={() => setActiveTab('college')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'college'
                  ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>College ID</span>
            </button>
            {isWeb && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-cyan-400'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            )}
          </div>

          {/* 1. GOOGLE CONNECT SECTION */}
          {activeTab === 'google' && (
            <div className="space-y-4 animate-[fadeIn_0.25s_ease-out]">
              <div className="p-4 rounded-2xl dark:bg-[#0B132B]/80 bg-cyan-50/70 border dark:border-cyan-500/20 border-cyan-200 text-center">
                <p className="text-xs dark:text-slate-300 text-slate-700 leading-relaxed">
                  Connect your Google account to automatically synchronize your DCE transit pass, notifications, and stops.
                </p>
              </div>

              {/* Primary "Connect with Google" Button */}
              <button
                type="button"
                onClick={() => setIsGoogleModalOpen(true)}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl dark:bg-white/10 bg-white hover:bg-slate-50 dark:hover:bg-white/15 dark:text-white text-slate-800 font-bold text-sm border dark:border-white/15 border-slate-300 shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                {/* Official Google G Logo */}
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* One-tap Quick Connect */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => handleGoogleSubmit('karthik.s.dce@gmail.com', 'Karthik S.')}
                  className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-semibold cursor-pointer"
                >
                  ⚡ One-Tap Connect (Karthik S. • CSE)
                </button>
              </div>
            </div>
          )}

          {/* 2. COLLEGE ID FORM SECTION */}
          {activeTab === 'college' && (
            <form onSubmit={handleCollegeSubmit} className="space-y-3.5 animate-[fadeIn_0.25s_ease-out]">
              <div>
                <label className="block text-[11px] font-bold dark:text-slate-300 text-slate-700 uppercase tracking-wider mb-1">
                  Student Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Karthik S."
                    className="w-full dark:bg-[#070B19] bg-slate-50 border dark:border-white/15 border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs dark:text-white text-slate-900 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold dark:text-slate-300 text-slate-700 uppercase tracking-wider mb-1">
                  College Roll Number / ID
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="e.g. DCE-2024-CSE-042"
                    className="w-full dark:bg-[#070B19] bg-slate-50 border dark:border-white/15 border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs dark:text-white text-slate-900 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold dark:text-slate-300 text-slate-700 uppercase tracking-wider mb-1">
                  Department
                </label>
                <div className="relative">
                  <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full dark:bg-[#070B19] bg-slate-50 border dark:border-white/15 border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs dark:text-white text-slate-900 focus:outline-none focus:border-cyan-500 transition-colors"
                  >
                    <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                    <option value="Artificial Intelligence & Data Science">Artificial Intelligence & Data Science</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electronics & Communication Engineering">Electronics & Communication Engineering</option>
                    <option value="Electrical & Electronics Engineering">Electrical & Electronics Engineering</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold dark:text-slate-300 text-slate-700 uppercase tracking-wider mb-1">
                  Assigned Bus Route
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <select
                    value={selectedRouteId}
                    onChange={(e) => setSelectedRouteId(e.target.value)}
                    className="w-full dark:bg-[#070B19] bg-slate-50 border dark:border-white/15 border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs dark:text-white text-slate-900 focus:outline-none focus:border-cyan-500 transition-colors"
                  >
                    {allRoutes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Enter Transit System</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* 3. ADMIN LOGIN SECTION */}
          {activeTab === 'admin' && (
            <form onSubmit={handleAdminSubmit} className="space-y-3.5 animate-[fadeIn_0.25s_ease-out]">
              <div className="p-3.5 rounded-2xl dark:bg-[#0B132B]/80 bg-cyan-50/70 border dark:border-cyan-500/25 border-cyan-200 text-center">
                <p className="text-xs dark:text-cyan-300 text-cyan-800 font-bold">
                  Authorized Transport Administration Only
                </p>
                <p className="text-[11px] dark:text-slate-400 text-slate-600 mt-0.5">
                  Direct management of all buses, routes, map pins, and driver rosters.
                </p>
              </div>

              {adminError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 animate-[fadeIn_0.2s_ease-out]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{adminError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold dark:text-slate-300 text-slate-700 uppercase tracking-wider mb-1">
                  Administrator Username / Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@dce.edu"
                    className="w-full dark:bg-[#070B19] bg-slate-50 border dark:border-white/15 border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs dark:text-white text-slate-900 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold dark:text-slate-300 text-slate-700 uppercase tracking-wider mb-1">
                  Admin Security Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full dark:bg-[#070B19] bg-slate-50 border dark:border-white/15 border-slate-300 rounded-xl pl-9 pr-10 py-2 text-xs dark:text-white text-slate-900 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={adminLoading}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-extrabold text-xs shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{adminLoading ? 'Authenticating Admin...' : 'Enter Admin Console'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAdminEmail('admin@dce.edu');
                    setAdminPassword('admin123');
                    setAdminError(null);
                  }}
                  className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline font-semibold cursor-pointer"
                >
                  ⚡ Quick Fill Admin (admin@dce.edu / admin123)
                </button>
              </div>
            </form>
          )}

          {/* Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t dark:border-white/10 border-slate-200" />
            </div>
            <span className="relative px-3 dark:bg-slate-900 bg-white text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Quick Options
            </span>
          </div>

          {/* Instant Guest / Visitor Login */}
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={loginAsGuest}
              className="w-full py-2.5 px-4 rounded-xl border dark:border-white/15 border-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 dark:text-slate-300 text-slate-700 font-medium text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Instant Guest Pass (Explore Routes)</span>
            </button>

            {/* Switch to Driver Cockpit Mode */}
            <button
              type="button"
              onClick={() => {
                if (isWeb) {
                  window.dispatchEvent(new CustomEvent('dce_navigate', { detail: { route: 'staff-login' } }));
                } else {
                  setMode('driver');
                }
              }}
              className="w-full py-2.5 px-4 rounded-xl border border-amber-500/30 dark:bg-amber-500/10 bg-amber-50 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 animate-pulse" />
              <span>DCE Bus Driver? Open Cockpit</span>
            </button>

            {/* Switch to Admin Console Mode (Web Only) */}
            {isWeb && (
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className="w-full py-2.5 px-4 rounded-xl border border-cyan-500/40 dark:bg-cyan-500/10 bg-cyan-50 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-semibold text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.15)]"
              >
                <Shield className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                <span>DCE Administrator? Sign In to Console</span>
              </button>
            )}
          </div>

          {/* Security Footer Note */}
          <div className="mt-6 flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
            <span>Secured with DCE Campus SSO & Real-Time Telemetry</span>
          </div>
        </div>
      </main>

      {/* Campus Transit Stats Ticker */}
      <footer className="relative z-10 w-full py-3 px-4 border-t dark:border-white/10 border-slate-200/80 dark:bg-[#070B19]/80 bg-slate-100/90 backdrop-blur-md text-center text-xs dark:text-slate-400 text-slate-600 flex flex-wrap items-center justify-center gap-3 sm:gap-6 font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse"></span>
          <span>4 Active Express Routes</span>
        </span>
        <span className="hidden sm:inline dark:text-white/20 text-slate-400">•</span>
        <span>16 GPS Transmitters</span>
        <span className="hidden sm:inline dark:text-white/20 text-slate-400">•</span>
        <span>2,400+ Daily Student Boardings</span>
        <span className="hidden sm:inline dark:text-white/20 text-slate-400">•</span>
        <span className="text-cyan-600 dark:text-cyan-400">DCE Manimangalam Campus</span>
      </footer>

      {/* GOOGLE ACCOUNT CHOOSER MODAL */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="relative w-full max-w-sm rounded-3xl dark:bg-slate-900 bg-white border dark:border-white/20 border-slate-200 p-6 shadow-2xl">
            {/* Header with Google Logo */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b dark:border-white/10 border-slate-200">
              <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <div>
                <h3 className="font-extrabold text-sm dark:text-white text-slate-900">Sign in with Google</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Choose an account for DCE Bus Tracker</p>
              </div>
            </div>

            {/* List of Available Accounts */}
            <div className="space-y-2 mb-4">
              {/* Account 1 */}
              <button
                onClick={() => handleGoogleSubmit('ilambarithi2006@gmail.com', 'Ilambarithi')}
                className="w-full flex items-center gap-3 p-3 rounded-2xl dark:bg-white/5 bg-slate-50 hover:bg-slate-100 dark:hover:bg-white/10 border dark:border-white/10 border-slate-200 transition-all text-left cursor-pointer active:scale-98"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  I
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold dark:text-white text-slate-900 truncate">Ilambarithi</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">ilambarithi2006@gmail.com</div>
                </div>
                <CheckCircle className="w-4 h-4 text-cyan-500 dark:text-cyan-400 flex-shrink-0" />
              </button>

              {/* Account 2 */}
              <button
                onClick={() => handleGoogleSubmit('karthik.s.dce@gmail.com', 'Karthik S.')}
                className="w-full flex items-center gap-3 p-3 rounded-2xl dark:bg-white/5 bg-slate-50 hover:bg-slate-100 dark:hover:bg-white/10 border dark:border-white/10 border-slate-200 transition-all text-left cursor-pointer active:scale-98"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  K
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold dark:text-white text-slate-900 truncate">Karthik S.</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">karthik.s.dce@gmail.com</div>
                </div>
                <CheckCircle className="w-4 h-4 text-cyan-500 dark:text-cyan-400 flex-shrink-0" />
              </button>
            </div>

            {/* Custom Google Email input */}
            <div className="mb-4 pt-2 border-t dark:border-white/10 border-slate-200">
              <label className="block text-[11px] font-semibold dark:text-slate-300 text-slate-700 mb-1.5">
                Or enter another Google account:
              </label>
              <input
                type="email"
                placeholder="student.name@gmail.com"
                value={customGoogleEmail}
                onChange={(e) => setCustomGoogleEmail(e.target.value)}
                className="w-full dark:bg-[#070B19] bg-slate-50 border dark:border-white/15 border-slate-300 rounded-xl px-3 py-2 text-xs dark:text-white text-slate-900 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 mb-2"
              />
              <input
                type="text"
                placeholder="Full Name"
                value={customGoogleName}
                onChange={(e) => setCustomGoogleName(e.target.value)}
                className="w-full dark:bg-[#070B19] bg-slate-50 border dark:border-white/15 border-slate-300 rounded-xl px-3 py-2 text-xs dark:text-white text-slate-900 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsGoogleModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border dark:border-white/15 border-slate-300 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleGoogleSubmit()}
                className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
