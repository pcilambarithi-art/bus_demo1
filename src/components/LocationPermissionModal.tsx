import React, { useState } from 'react';
import { useBus } from '../context/BusContext';
import {
  MapPin,
  Navigation,
  Clock,
  Volume2,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  X,
} from 'lucide-react';

export const LocationPermissionModal: React.FC = () => {
  const {
    isLocationModalOpen,
    setIsLocationModalOpen,
    requestLocationPermission,
    selectedBus,
    studentStop,
  } = useBus();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isLocationModalOpen) return null;

  const handleGrantPermission = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const granted = await requestLocationPermission();
      if (granted) {
        setIsLocationModalOpen(false);
      } else {
        setErrorMessage('Location permission was not granted. Please enable GPS access in your browser or device settings.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to access location.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsLocationModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
      <div
        className={`
          relative w-full max-w-md rounded-3xl p-6 sm:p-7
          backdrop-blur-[28px] -webkit-backdrop-blur-[28px]
          dark:bg-[rgba(10,18,36,0.95)] bg-[rgba(255,255,255,0.96)]
          dark:border-[rgba(255,255,255,0.18)] border-[rgba(255,255,255,0.8)]
          border shadow-[0_24px_60px_rgba(0,0,0,0.5)]
          transition-all duration-300
        `}
      >
        {/* Top specular glow line */}
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-full dark:text-slate-400 hover:text-white dark:hover:bg-white/10 text-slate-500 hover:bg-slate-100 transition-colors"
          aria-label="Dismiss location request"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Animated Satellite / GPS Beacon Icon */}
        <div className="flex justify-center mb-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_30px_rgba(6,182,212,0.5)] animate-pulse">
              <MapPin className="w-8 h-8 stroke-[2.2]" />
            </div>
            {/* Ping Rings */}
            <div className="absolute -inset-2 rounded-3xl bg-cyan-400/20 animate-ping pointer-events-none" />
          </div>
        </div>

        {/* Title & Description */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-cyan-500/15 text-cyan-400 border border-cyan-400/30">
            <Navigation className="w-3 h-3 text-cyan-400" />
            <span>GPS Tracking Required</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight dark:text-white text-slate-900 font-sans">
            Enable Location Access
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300 leading-relaxed max-w-sm mx-auto">
            Allow <strong>DCE Bus Tracker</strong> to access your real-time GPS position to calculate walking distance and track <strong>Bus {selectedBus.busNumber}</strong> live.
          </p>
        </div>

        {/* Feature Highlights List */}
        <div className="space-y-2.5 mb-6 text-left">
          <div className="flex items-start gap-3 p-2.5 rounded-2xl dark:bg-white/5 bg-slate-50 border dark:border-white/5 border-slate-200">
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 shrink-0">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold dark:text-white text-slate-800">
                Live Relative Distance
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                See exact distance in metres between your current location and the moving bus.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-2xl dark:bg-white/5 bg-slate-50 border dark:border-white/5 border-slate-200">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold dark:text-white text-slate-800">
                Real-Time Arrival ETA
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Accurate traffic-aware minutes countdown to your stop ({studentStop.shortName}).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-2xl dark:bg-white/5 bg-slate-50 border dark:border-white/5 border-slate-200">
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 shrink-0">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold dark:text-white text-slate-800">
                Voice Milestone Alerts
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Spoken audio chimes from Leda when the bus is 1 km, 500 m, and 200 m away.
              </p>
            </div>
          </div>
        </div>

        {/* Error / Denied notice */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Privacy badge */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 mb-5">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Used exclusively on-device for transit navigation</span>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleGrantPermission}
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_4px_25px_rgba(6,182,212,0.4)] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Requesting Location Access...</span>
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 fill-current" />
                <span>Allow Location Access & Track Bus</span>
              </>
            )}
          </button>

          <button
            onClick={handleDismiss}
            className="w-full py-2.5 px-4 rounded-2xl font-semibold text-xs text-slate-400 hover:text-white hover:bg-white/5 active:scale-98 transition-all"
          >
            Use Default Assigned Stop ({studentStop.shortName})
          </button>
        </div>
      </div>
    </div>
  );
};
