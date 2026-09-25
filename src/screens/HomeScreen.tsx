import React, { useMemo } from 'react';
import { useBus } from '../context/BusContext';
import { GlassCard } from '../components/GlassCard';
import { InteractiveMap } from '../components/InteractiveMap';
import { EtaDisplay } from '../components/EtaDisplay';
import { formatDistance } from '../utils/geo';
import {
  ArrowRight,
  Gauge,
  Clock,
  MapPin,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';

export const HomeScreen: React.FC = () => {
  const {
    student,
    studentStop,
    selectedBus,
    selectedRoute,
    telemetry,
    setActiveTab,
    isSoundMuted,
    toggleSound,
    locationPermissionState,
    setIsLocationModalOpen,
  } = useBus();

  // Dynamic time greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  return (
    <div className="w-full h-full flex flex-col space-y-4 sm:space-y-6 pb-24 lg:pb-6 animate-[fadeIn_0.35s_cubic-bezier(0.16,1,0.3,1)]">
      
      {/* Top Greeting Header (Requirement 4) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div>
          <h2 className="text-lg sm:text-2xl font-black tracking-tight dark:text-white text-slate-900">
            {greeting}, {student.name.split(' ')[0]} 👋
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Bus is actively en route to your stop
          </p>
        </div>

        {/* Quick Stop Tag & Sound Mute/Unmute Button (Desktop & Mobile) */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md dark:bg-white/5 bg-slate-100 dark:border dark:border-white/10 border-slate-200 dark:text-slate-300 text-slate-700">
            Assigned: <strong className="text-cyan-500 dark:text-cyan-400">{studentStop.shortName}</strong>
          </span>

          <button
            onClick={toggleSound}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md border transition-all active:scale-95 shadow-sm ${
              isSoundMuted
                ? 'bg-rose-500/15 text-rose-400 border-rose-500/35 hover:bg-rose-500/25'
                : 'bg-cyan-500/15 text-cyan-400 border-cyan-400/40 hover:bg-cyan-500/25'
            }`}
            title={isSoundMuted ? 'Unmute Audio & Voice' : 'Mute Audio & Voice'}
            aria-label={isSoundMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isSoundMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-[11px]">Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span className="text-[11px]">Sound On</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* GPS Location Access Request Banner (Shows if not yet granted) */}
      {locationPermissionState !== 'granted' && (
        <div
          onClick={() => setIsLocationModalOpen(true)}
          className="p-3.5 sm:p-4 rounded-2xl backdrop-blur-xl bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-indigo-500/15 border border-cyan-400/30 flex items-center justify-between gap-3 cursor-pointer hover:border-cyan-400/50 active:scale-99 transition-all shadow-[0_4px_20px_rgba(6,182,212,0.15)] group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-400/30 group-hover:scale-105 transition-transform">
              <MapPin className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-bold dark:text-white text-slate-900">
                  Allow GPS Location Access
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-cyan-500 text-black">
                  Recommended
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-300">
                Grant device location to track Bus {selectedBus.busNumber}, calculate walking ETA, and receive voice chimes.
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsLocationModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs shadow-md shrink-0 active:scale-95 transition-all"
          >
            Allow GPS
          </button>
        </div>
      )}

      {/* HERO GLASS BUS CARD */}
      <GlassCard
        onClick={() => setActiveTab('live')}
        interactive
        hoverEffect
        className="p-4 sm:p-7 group"
      >
        <div className="flex flex-col gap-3 sm:gap-5">
          {/* Top row: Bus number and Live Indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xl sm:text-2xl shadow-[0_4px_20px_rgba(6,182,212,0.45)] group-hover:scale-105 transition-transform duration-300">
                🚌
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-2xl font-black dark:text-white text-slate-900 tracking-tight font-sans">
                    {selectedBus.busNumber}
                  </h3>
                  {/* LIVE Status Badge */}
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    LIVE
                  </span>
                </div>
                <p className="text-[11px] sm:text-sm font-medium text-slate-500 dark:text-slate-400 truncate max-w-[200px] sm:max-w-none">
                  {selectedRoute.name}
                </p>
              </div>
            </div>

            {/* Tap to View Full Screen Indicator */}
            <div className="flex items-center gap-1 text-xs font-bold text-cyan-500 dark:text-cyan-400 group-hover:translate-x-1 transition-transform">
              <span className="hidden sm:inline">Track Live</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Middle Row: Speed, ETA, and Distance */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3 pt-2 sm:pt-3 border-t dark:border-white/10 border-slate-200/80">
            {/* Speed */}
            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl dark:bg-white/5 bg-slate-50/70 border dark:border-white/5 border-slate-200/50">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1 mb-0.5 sm:mb-1">
                <Gauge className="w-3 h-3 text-cyan-400" />
                Speed
              </span>
              <span className="text-base sm:text-2xl font-bold font-mono dark:text-white text-slate-900">
                {telemetry.speedKmh} <small className="text-[10px] sm:text-xs font-normal text-slate-400">km/h</small>
              </span>
            </div>

            {/* ETA */}
            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl dark:bg-white/5 bg-slate-50/70 border dark:border-white/5 border-slate-200/50">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1 mb-0.5 sm:mb-1">
                <Clock className="w-3 h-3 text-emerald-400" />
                ETA
              </span>
              <EtaDisplay minutes={telemetry.etaMinutes} size="md" className="text-emerald-500 dark:text-emerald-400 font-bold" />
            </div>

            {/* Distance Away */}
            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl dark:bg-white/5 bg-slate-50/70 border dark:border-white/5 border-slate-200/50">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1 mb-0.5 sm:mb-1">
                <MapPin className="w-3 h-3 text-blue-400" />
                Distance
              </span>
              <span className="text-base sm:text-2xl font-bold font-mono dark:text-white text-slate-900">
                {formatDistance(telemetry.distanceToStudentStopMeters)}
              </span>
            </div>

            {/* Capacity (Desktop only) */}
            <div className="hidden sm:block p-3 rounded-2xl dark:bg-white/5 bg-slate-50/70 border dark:border-white/5 border-slate-200/50">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                Available Seats
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono dark:text-white text-slate-900">
                {selectedBus.capacity - selectedBus.currentOccupancy}
                <span className="text-xs font-normal text-slate-400"> / {selectedBus.capacity}</span>
              </span>
            </div>
          </div>

          {/* Bottom Bar: Destination & Stop proximity */}
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 pt-0.5">
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
              <span className="truncate">Next: <strong>{telemetry.nextStop.name}</strong></span>
            </div>
            <span className="font-mono text-cyan-500 dark:text-cyan-400 font-semibold shrink-0 text-[10px] sm:text-xs">
              {formatDistance(telemetry.distanceToStudentStopMeters)} to your stop
            </span>
          </div>
        </div>
      </GlassCard>

      {/* LIVE MAP SECTION (Spacious and clean on mobile) */}
      <div className="flex-1 min-h-[350px] sm:min-h-[440px] lg:min-h-[500px] flex flex-col rounded-[24px] overflow-hidden border dark:border-white/10 border-slate-200 shadow-xl relative">
        <div className="absolute top-3 left-4 z-20 pointer-events-none">
          <span className="text-[10px] sm:text-xs font-extrabold tracking-wider uppercase px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full backdrop-blur-xl bg-slate-900/80 text-white border border-white/10 shadow-md">
            LIVE MAP
          </span>
        </div>

        <InteractiveMap
          className="flex-1 w-full h-full"
          showControls={true}
          showPlacesSearch={false}
        />
      </div>

    </div>
  );
};
