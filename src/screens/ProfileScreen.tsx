import React, { useState } from 'react';
import { useBus } from '../context/BusContext';
import { GlassCard } from '../components/GlassCard';
import type { ThemeMode, VoiceAssistantId } from '../types/bus';
import { VOICE_PROFILES, VOICE_SPEEDS } from '../services/speechSynthesis';
import {
  Bus,
  MapPin,
  Bell,
  Navigation,
  Sun,
  Smartphone,
  LogOut,
  ChevronRight,
  QrCode,
  Check,
  AlertTriangle,
  Info,
  Volume2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export const ProfileScreen: React.FC = () => {
  const {
    student,
    studentStop,
    selectedBus,
    allBuses,
    selectBus,
    selectedRoute,
    updateStudentStop,
    theme,
    setTheme,
    isSoundMuted,
    toggleSound,
    isGracefulVoiceEnabled,
    toggleGracefulVoice,
    testGracefulVoice,
    voiceAssistantId,
    setVoiceAssistantId,
    voiceSpeed,
    setVoiceSpeed,
    useRealGeolocation,
    setUseRealGeolocation,
    setIsApkModalOpen,
    setIsSosModalOpen,
    logout,
  } = useBus();

  const [showQrModal, setShowQrModal] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 pb-24 lg:pb-8 animate-[fadeIn_0.35s_cubic-bezier(0.16,1,0.3,1)]">
      
      {/* PROFILE GLASS HERO CARD (Requirement 14) */}
      <GlassCard className="p-6 sm:p-8 text-center relative overflow-hidden">
        {/* Decorative Top Accent Glow */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

        <div className="flex flex-col items-center">
          {/* Avatar Icon */}
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-[2px] shadow-[0_0_25px_rgba(6,182,212,0.35)]">
              <div className="w-full h-full rounded-[22px] dark:bg-[#070B19] bg-white flex items-center justify-center">
                <span className="text-3xl">👤</span>
              </div>
            </div>
            {/* Active Status Badge */}
            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 dark:border-[#070B19] border-white shadow-sm" />
          </div>

          {/* Student Name & ID */}
          <h2 className="text-xl sm:text-2xl font-black dark:text-white text-slate-900 tracking-tight">
            {student.name}
          </h2>
          <span className="text-xs font-mono font-bold text-cyan-500 dark:text-cyan-400 mt-0.5">
            Roll / Student ID: {student.id}
          </span>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {student.department} • {student.semester}
          </p>
          <span className="mt-1 px-3 py-0.5 rounded-full text-[10px] font-bold dark:bg-cyan-500/10 bg-cyan-50 text-cyan-600 dark:text-cyan-400 border border-cyan-400/20">
            Dhanalakshmi College of Engineering, Chennai
          </span>

          {/* Bus & Stop Quick Overview Pill (Requirement 14) */}
          <div className="mt-5 pt-4 border-t dark:border-white/10 border-slate-200/80 w-full max-w-md grid grid-cols-2 gap-3 text-left">
            <div className="p-3 rounded-2xl dark:bg-white/5 bg-slate-50 border dark:border-white/5 border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Assigned Bus
              </span>
              <span className="text-sm font-bold dark:text-white text-slate-800 flex items-center gap-1.5">
                🚌 {selectedBus.busNumber}
              </span>
            </div>

            <div className="p-3 rounded-2xl dark:bg-white/5 bg-slate-50 border dark:border-white/5 border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Assigned Stop
              </span>
              <span className="text-sm font-bold dark:text-white text-slate-800 truncate block">
                📍 {studentStop.shortName}
              </span>
            </div>
          </div>

          {/* QR Pass Button */}
          <button
            onClick={() => setShowQrModal(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold dark:bg-white/5 bg-slate-100 hover:bg-cyan-500/10 dark:hover:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border dark:border-white/10 border-slate-200 transition-all active:scale-95"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Digital Bus Pass QR</span>
          </button>
        </div>
      </GlassCard>

      {/* OPTIONS LIST (Requirement 14 & 15) */}
      <GlassCard className="p-4 sm:p-6 divide-y dark:divide-white/10 divide-slate-200/80">
        
        {/* OPTION 1: My Bus */}
        <div className="py-3.5 first:pt-0">
          <div
            onClick={() => setActiveSection(activeSection === 'bus' ? null : 'bus')}
            className="flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                <Bus className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold dark:text-white text-slate-800 group-hover:text-cyan-400 transition-colors">
                  My Bus
                </h4>
                <p className="text-xs text-slate-400">
                  Select your default daily college transport vehicle
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-cyan-400">
                {selectedBus.busNumber}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Bus selection drawer */}
          {activeSection === 'bus' && (
            <div className="mt-3 pl-12 space-y-2 animate-[fadeIn_0.2s_ease-out]">
              {allBuses.map((bus) => (
                <button
                  key={bus.id}
                  onClick={() => selectBus(bus.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedBus.id === bus.id
                      ? 'dark:bg-cyan-500/20 bg-cyan-50 text-cyan-500 dark:text-cyan-400 border border-cyan-400/40'
                      : 'dark:bg-white/5 bg-slate-50 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>🚌 {bus.busNumber}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({bus.plateNumber})</span>
                  </div>
                  {selectedBus.id === bus.id && <Check className="w-4 h-4 text-cyan-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* OPTION 2: My Stop */}
        <div className="py-3.5">
          <div
            onClick={() => setActiveSection(activeSection === 'stop' ? null : 'stop')}
            className="flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold dark:text-white text-slate-800 group-hover:text-blue-400 transition-colors">
                  My Stop
                </h4>
                <p className="text-xs text-slate-400">
                  Default boarding and drop-off point
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-400">
                {studentStop.shortName}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Stop selection drawer */}
          {activeSection === 'stop' && (
            <div className="mt-3 pl-12 space-y-2 animate-[fadeIn_0.2s_ease-out]">
              {selectedRoute.stops.map((stop) => (
                <button
                  key={stop.id}
                  onClick={() => updateStudentStop(stop.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all ${
                    studentStop.id === stop.id
                      ? 'dark:bg-blue-500/20 bg-blue-50 text-blue-500 dark:text-blue-400 border border-blue-400/40'
                      : 'dark:bg-white/5 bg-slate-50 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span>📍 {stop.name}</span>
                  {studentStop.id === stop.id && <Check className="w-4 h-4 text-blue-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* OPTION 3: Notifications & Audio */}
        <div className="py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold dark:text-white text-slate-800">
                  Approaching Audio Chimes
                </h4>
                <p className="text-xs text-slate-400">
                  Sound alerts at 1 km, 500 m, 200 m, & Arrival
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={!isSoundMuted}
              onChange={toggleSound}
              className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 cursor-pointer"
            />
          </div>
        </div>

        {/* OPTION: Gemini Audio Voice Assistance (5 Personas + 5 Speeds) */}
        <div className="py-4 border-b dark:border-white/10 border-slate-200/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.25)]">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold dark:text-white text-slate-800">
                    Voice Assistant: {VOICE_PROFILES[voiceAssistantId]?.name || 'Leda'}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/20 text-cyan-500 dark:text-cyan-400 border border-cyan-400/30">
                    {voiceSpeed}x SPEED
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {VOICE_PROFILES[voiceAssistantId]?.description || 'Spoken transit milestones & AI Copilot narration'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => testGracefulVoice(voiceAssistantId, voiceSpeed)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-600 dark:text-cyan-400 transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                title="Sample Current Voice"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Sample</span>
              </button>
              <input
                type="checkbox"
                checked={isGracefulVoiceEnabled}
                onChange={toggleGracefulVoice}
                className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 cursor-pointer"
                title="Enable/Disable Voice Assistant"
              />
            </div>
          </div>

          {isGracefulVoiceEnabled && (
            <div className="mt-4 space-y-4 pl-0 sm:pl-13 animate-[fadeIn_0.2s_ease-out]">
              {/* Speed Selector (0.9, 0.95, 1, 1.5, 2) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Playback Speed
                  </label>
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono font-semibold">
                    Current: {voiceSpeed}x
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {VOICE_SPEEDS.map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setVoiceSpeed(spd)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        voiceSpeed === spd
                          ? 'bg-cyan-500 text-black shadow-md scale-105 ring-2 ring-cyan-400/50'
                          : 'dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-700 border dark:border-white/10 border-slate-200 hover:border-cyan-400/60'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* 5 Voice Assistant Personas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Voice Persona (5 Assistants Available)
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Gemini 2.0 Audio + System TTS
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {(Object.keys(VOICE_PROFILES) as VoiceAssistantId[]).map((id) => {
                    const prof = VOICE_PROFILES[id];
                    const isSelected = voiceAssistantId === id;
                    return (
                      <div
                        key={id}
                        onClick={() => setVoiceAssistantId(id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between select-none ${
                          isSelected
                            ? 'dark:bg-cyan-500/15 bg-cyan-50/80 border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.18)] ring-1 ring-cyan-400'
                            : 'dark:bg-white/5 bg-slate-50 dark:border-white/10 border-slate-200 hover:border-cyan-500/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shadow-sm ${
                                isSelected
                                  ? 'bg-cyan-500 text-black'
                                  : 'dark:bg-white/10 bg-slate-200 dark:text-white text-slate-800'
                              }`}
                            >
                              {prof.name[0]}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold dark:text-white text-slate-900">
                                  {prof.name}
                                </span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full font-semibold dark:bg-white/10 bg-slate-200 text-slate-500 dark:text-slate-300">
                                  {prof.gender}
                                </span>
                              </div>
                              <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium block">
                                {prof.tag}
                              </span>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                          {prof.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* OPTION 4: Location Settings (Requirement 14) */}
        <div className="py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold dark:text-white text-slate-800">
                  Live Device GPS Positioning
                </h4>
                <p className="text-xs text-slate-400">
                  Sync your phone's real GPS with the map
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={useRealGeolocation}
              onChange={(e) => setUseRealGeolocation(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 cursor-pointer"
            />
          </div>
        </div>

        {/* OPTION 5: Dark Mode Toggle (Requirement 14 & 15: System | Light | Dark) */}
        <div className="py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold dark:text-white text-slate-800">
                  Theme Appearance
                </h4>
                <p className="text-xs text-slate-400">
                  Select System, Light glass, or Deep Dark
                </p>
              </div>
            </div>

            {/* 3-Pill Theme Switcher (Requirement 15) */}
            <div className="flex items-center p-1 rounded-xl dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 self-start sm:self-auto">
              {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setTheme(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                    theme === mode
                      ? 'bg-cyan-500 text-black shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* OPTION 6: Download APK & App */}
        <div className="py-3.5">
          <div
            onClick={() => setIsApkModalOpen(true)}
            className="flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold dark:text-white text-slate-800 group-hover:text-cyan-400 transition-colors">
                  Mobile APK & Installation
                </h4>
                <p className="text-xs text-slate-400">
                  Android APK build package & 1-tap PWA Install
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* OPTION 7: Emergency SOS */}
        <div className="py-3.5">
          <div
            onClick={() => setIsSosModalOpen(true)}
            className="flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-500 transition-colors">
                  Emergency Transport Desk
                </h4>
                <p className="text-xs text-slate-400">
                  Direct security helpline & panic beacon
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* OPTION 8: About & Version */}
        <div className="py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-500/15 text-slate-400 flex items-center justify-center">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold dark:text-white text-slate-800">
                  About College Bus Tracker
                </h4>
                <p className="text-xs text-slate-400">
                  v2.4.0 • Commercial Glassmorphism Edition
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-cyan-400">60 FPS</span>
          </div>
        </div>

        {/* OPTION 9: Logout (Requirement 14) */}
        <div className="pt-3.5">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold text-rose-500 dark:bg-rose-500/10 bg-rose-50 border border-rose-500/20 hover:bg-rose-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Session</span>
          </button>
        </div>

      </GlassCard>

      {/* QR Code Digital Pass Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="relative w-full max-w-sm rounded-3xl dark:bg-[#0B132B] bg-white p-6 text-center border dark:border-white/15 border-slate-200 shadow-2xl">
            <h3 className="font-extrabold text-base dark:text-white text-slate-900 mb-1">
              DCE Digital Transport Pass
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Dhanalakshmi College of Engineering • Scan upon boarding {selectedBus.busNumber}
            </p>

            <div className="p-4 bg-white rounded-2xl inline-block shadow-md mx-auto mb-4">
              <QRCodeSVG
                value={`DCE-BUS-PASS:${student.id}:${selectedBus.busNumber}:CHENNAI`}
                size={180}
              />
            </div>

            <div className="text-xs font-mono font-bold dark:text-cyan-400 text-cyan-600 mb-4">
              PASS #{student.id}
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-white/10 dark:text-white text-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
