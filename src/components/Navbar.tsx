import React from 'react';
import { useBus } from '../context/BusContext';
import {
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Sparkles,
  AlertTriangle,
  Smartphone,
  MapPin,
  Radio,
  LogOut,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    student,
    logout,
    setTheme,
    isDark,
    isSoundMuted,
    toggleSound,
    connectionStatus,
    gpsStatus,
    setIsAiModalOpen,
    setIsSosModalOpen,
    setIsApkModalOpen,
    setMode,
    isDriverBroadcasting,
    setIsLocationModalOpen,
  } = useBus();

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl -webkit-backdrop-blur-xl border-b dark:bg-[#070B19]/70 bg-white/70 dark:border-white/10 border-slate-200/80 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between">
        
        {/* Brand & Live Connection Pill */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <span className="text-lg">🚌</span>
            </div>
            <div>
              <span className="font-extrabold text-sm sm:text-base tracking-tight dark:text-white text-slate-900 block leading-tight">
                DCE<span className="text-cyan-500 dark:text-cyan-400"> BUS</span>
              </span>
              <span className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wider uppercase leading-tight">
                Dhanalakshmi College of Engg, Chennai
              </span>
            </div>
          </div>

          {/* Connection Status Pill (Section 20) */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md dark:bg-white/5 bg-slate-100 dark:border dark:border-white/10 border border-slate-200">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'live'
                  ? 'bg-emerald-400 shadow-[0_0_8px_#10B981] animate-pulse'
                  : connectionStatus === 'reconnecting'
                  ? 'bg-amber-400'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-[11px] dark:text-slate-300 text-slate-700 font-bold sm:font-normal">
              {connectionStatus === 'live'
                ? 'Live'
                : connectionStatus === 'reconnecting'
                ? 'Reconnecting...'
                : 'Offline'}
            </span>
          </div>

          {/* GPS Status Pill (Clickable to trigger location permission) */}
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md border transition-all active:scale-95 cursor-pointer ${
              gpsStatus === 'active'
                ? 'dark:bg-emerald-500/15 bg-emerald-50 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : gpsStatus === 'improving'
                ? 'dark:bg-amber-500/15 bg-amber-50 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse'
                : 'dark:bg-cyan-500/15 bg-cyan-50 text-cyan-600 dark:text-cyan-400 border-cyan-400/40 hover:bg-cyan-500/25'
            }`}
            title="Click to request or view GPS location status"
          >
            <MapPin className="w-3 h-3 text-current" />
            <span className="text-[11px] font-bold">
              {gpsStatus === 'active'
                ? 'GPS Active'
                : gpsStatus === 'improving'
                ? 'Locating...'
                : 'Enable GPS'}
            </span>
          </button>

          {/* Driver Phone Broadcasting Indicator */}
          {isDriverBroadcasting && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
              <Radio className="w-3 h-3 text-amber-400" />
              <span className="text-[10px]">Driver GPS Live</span>
            </div>
          )}
        </div>

        {/* Action Controls & Toggles */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Driver Mode Button (Desktop) */}
          <button
            onClick={() => setMode('driver')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md dark:bg-amber-500/15 bg-amber-50 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 active:scale-95 transition-all shadow-sm"
            title="Switch to Driver Mode (Broadcasting Cockpit)"
          >
            <Radio className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>Driver Mode</span>
          </button>

          {/* Ask Transit AI Copilot Button */}
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md dark:bg-cyan-500/15 bg-cyan-50 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25 active:scale-95 transition-all shadow-[0_0_12px_rgba(6,182,212,0.25)]"
            title="Ask Campus Transit AI Copilot (Powered by Gemini API)"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>

          {/* Mobile APK / Install Button (Desktop/Tablet) */}
          <button
            onClick={() => setIsApkModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md dark:bg-blue-500/10 bg-blue-50 text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 active:scale-95 transition-all shadow-sm"
            title="Download Android APK & PWA instructions"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>APK & App</span>
          </button>

          {/* SOS Helpline Emergency Button */}
          <button
            onClick={() => setIsSosModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md bg-rose-500/15 text-rose-500 border border-rose-500/30 hover:bg-rose-500/25 active:scale-95 transition-all shadow-sm"
            title="Emergency College Security & Transport Desk"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>SOS</span>
          </button>

          {/* Sound Mute/Unmute Toggle (Desktop & Mobile) */}
          <button
            onClick={toggleSound}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md transition-all active:scale-95 shadow-sm border ${
              isSoundMuted
                ? 'bg-rose-500/15 text-rose-400 border-rose-500/35 hover:bg-rose-500/25 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                : 'bg-cyan-500/15 text-cyan-400 border-cyan-400/40 hover:bg-cyan-500/25 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
            }`}
            title={isSoundMuted ? 'Unmute Audio & Voice' : 'Mute Audio & Voice'}
            aria-label={isSoundMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isSoundMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
                <span className="text-[10px] sm:text-xs font-bold">Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 animate-pulse" />
                <span className="text-[10px] sm:text-xs font-bold">Sound On</span>
              </>
            )}
          </button>

          {/* Theme Toggle (Mobile & Desktop) */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="flex w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl items-center justify-center backdrop-blur-md dark:bg-white/5 bg-slate-100 text-slate-700 dark:text-slate-300 border dark:border-white/10 border-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>

          {/* User Profile Badge & Logout */}
          {student && (
            <div className="flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2 border-l dark:border-white/10 border-slate-200">
              <div
                className="flex items-center gap-1.5 max-w-[110px] sm:max-w-[150px] truncate"
                title={`${student.name} (${student.rollNo || student.email || 'Student'})`}
              >
                {student.avatarUrl ? (
                  <img
                    src={student.avatarUrl}
                    alt={student.name}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-cyan-400/50 object-cover shadow-sm flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden md:flex flex-col text-left leading-none">
                  <span className="text-xs font-semibold dark:text-white text-slate-900 truncate">
                    {student.name.split(' ')[0]}
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono truncate">
                    {student.authProvider === 'google' ? 'Google' : student.rollNo || 'Student'}
                  </span>
                </div>
              </div>

              <button
                onClick={logout}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 transition-all active:scale-95 shadow-sm"
                title="Sign Out / Change User"
                aria-label="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
