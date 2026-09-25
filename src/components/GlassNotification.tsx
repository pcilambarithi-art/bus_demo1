import React from 'react';
import { useBus } from '../context/BusContext';
import { Bell, CheckCircle2, Navigation, X } from 'lucide-react';
import { formatDistance } from '../utils/geo';

export const GlassNotification: React.FC = () => {
  const { activeAlert, dismissAlert, telemetry, studentStop, selectedBus } = useBus();

  if (!activeAlert) return null;

  const isArrived = activeAlert.tier === 'arrived';
  const is200m = activeAlert.tier === '200m';

  const badgeColor = isArrived
    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    : is200m
    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';

  const iconGlow = isArrived
    ? 'shadow-[0_0_15px_rgba(16,185,129,0.5)] bg-emerald-500 text-white'
    : is200m
    ? 'shadow-[0_0_15px_rgba(245,158,11,0.5)] bg-amber-500 text-white'
    : 'shadow-[0_0_15px_rgba(6,182,212,0.5)] bg-cyan-500 text-black';

  return (
    <div className="fixed top-20 sm:top-6 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-md pointer-events-auto transition-all duration-500 ease-out animate-[slideDown_0.4s_cubic-bezier(0.16,1,0.3,1)]">
      <div
        className={`
          relative overflow-hidden rounded-[24px] p-4 sm:p-5
          backdrop-blur-[24px] -webkit-backdrop-blur-[24px]
          /* Theme dependent glass */
          dark:bg-[rgba(10,18,36,0.85)] dark:border-[rgba(255,255,255,0.18)]
          bg-[rgba(255,255,255,0.88)] border-[rgba(255,255,255,0.6)]
          border shadow-[0_20px_50px_rgba(0,0,0,0.35)]
        `}
      >
        {/* Specular highlight */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

        <div className="flex items-start gap-3.5">
          {/* Animated Icon Avatar */}
          <div
            className={`
              w-11 h-11 rounded-2xl flex items-center justify-center shrink-0
              ${iconGlow} transition-transform duration-300
              ${isArrived ? 'animate-bounce' : 'animate-pulse'}
            `}
          >
            {isArrived ? (
              <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
            ) : is200m ? (
              <Bell className="w-5 h-5 stroke-[2.5]" />
            ) : (
              <Navigation className="w-5 h-5 stroke-[2.5]" />
            )}
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                {selectedBus.busNumber} • {activeAlert.tier.toUpperCase()}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {activeAlert.timestamp}
              </span>
            </div>

            <h4 className="text-sm sm:text-base font-bold dark:text-white text-slate-900 tracking-tight">
              {activeAlert.title}
            </h4>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              {activeAlert.message}
            </p>

            {/* Quick Live Distance & Stop Badge */}
            <div className="mt-3 flex items-center gap-3 pt-2 border-t border-slate-200/50 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 font-mono font-semibold text-cyan-600 dark:text-cyan-400">
                📍 {formatDistance(telemetry.distanceToStudentStopMeters)} away
              </span>
              <span>•</span>
              <span className="truncate">Your stop: <strong>{studentStop.shortName}</strong></span>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={dismissAlert}
            className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
