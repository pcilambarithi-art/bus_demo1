import React, { useState } from 'react';
import { useBus } from '../context/BusContext';
import { InteractiveMap } from '../components/InteractiveMap';
import { EtaDisplay } from '../components/EtaDisplay';
import { formatDistance } from '../utils/geo';
import {
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Phone,
  ShieldCheck,
  Wind,
  Video,
  Clock,
  Gauge,
  MapPin,
  AlertTriangle,
  Volume2,
  VolumeX,
} from 'lucide-react';

export const LiveBusScreen: React.FC = () => {
  const {
    selectedBus,
    selectedRoute,
    telemetry,
    setActiveTab,
    allBuses,
    selectBus,
    setIsSosModalOpen,
    isSoundMuted,
    toggleSound,
    locationPermissionState,
    setIsLocationModalOpen,
  } = useBus();

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative w-full h-[calc(100vh-5rem)] lg:h-[calc(100vh-4.5rem)] flex flex-col overflow-hidden pb-16 lg:pb-0 animate-[fadeIn_0.3s_ease-out]">
      
      {/* Top Floating Glass Header (Clean and responsive) */}
      <div className="absolute top-2 sm:top-3 left-2 right-2 sm:left-4 sm:right-4 z-40 flex items-center justify-between pointer-events-none gap-1 sm:gap-2">
        <div className="flex items-center gap-1 sm:gap-2 pointer-events-auto shrink-0">
          {/* Back button */}
          <button
            onClick={() => setActiveTab('home')}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center backdrop-blur-2xl dark:bg-[#070B19]/80 bg-white/80 dark:text-white text-slate-800 border dark:border-white/15 border-slate-200 shadow-lg active:scale-95 transition-all shrink-0"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          </button>

          {/* Title Glass Capsule */}
          <div className="px-2 sm:px-4 py-1 sm:py-2 rounded-xl sm:rounded-2xl backdrop-blur-2xl dark:bg-[#070B19]/80 bg-white/80 dark:text-white text-slate-800 border dark:border-white/15 border-slate-200 shadow-lg flex items-center gap-1.5 shrink-0">
            <span className="font-extrabold text-[11px] sm:text-base tracking-tight font-sans">
              Live
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            <span className="text-[11px] sm:text-xs font-mono font-bold text-cyan-500 dark:text-cyan-400">
              {selectedBus.busNumber}
            </span>
          </div>
        </div>

        {/* Action Controls: GPS Alert + Bus Switcher */}
        <div className="flex items-center gap-1 sm:gap-2 pointer-events-auto shrink-0">
          {/* Enable GPS Button (Shows if not granted) */}
          {locationPermissionState !== 'granted' && (
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="px-2 sm:px-3 py-1 sm:py-2 rounded-xl sm:rounded-2xl backdrop-blur-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 hover:bg-cyan-500/30 flex items-center gap-1 active:scale-95 transition-all text-[10px] sm:text-xs font-bold shadow-lg animate-pulse shrink-0"
              title="Allow GPS access to track bus relative to your position"
            >
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400" />
              <span>GPS</span>
            </button>
          )}

          {/* Audio Mute/Unmute Button (Desktop only - mobile has central bottom nav toggle) */}
          <button
            onClick={toggleSound}
            className={`hidden sm:flex px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-2xl backdrop-blur-2xl border shadow-lg items-center gap-1.5 active:scale-95 transition-all text-xs font-bold ${
              isSoundMuted
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                : 'bg-cyan-500/20 text-cyan-400 border-cyan-400/40 hover:bg-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.35)]'
            }`}
            title={isSoundMuted ? 'Unmute Audio & Voice' : 'Mute Audio & Voice'}
            aria-label={isSoundMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isSoundMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
                <span className="text-[10px] sm:text-xs">Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 animate-pulse" />
                <span className="text-[10px] sm:text-xs">Sound</span>
              </>
            )}
          </button>

          {/* Bus Quick Switcher Dropdown */}
          <select
            value={selectedBus.id}
            onChange={(e) => selectBus(e.target.value)}
            className="text-[10px] sm:text-xs font-bold py-1 sm:py-2 px-1.5 sm:px-3 rounded-xl sm:rounded-2xl backdrop-blur-2xl dark:bg-[#070B19]/85 bg-white/90 dark:text-white text-slate-800 border dark:border-white/15 border-slate-200 shadow-lg outline-none cursor-pointer max-w-[105px] xs:max-w-[130px] sm:max-w-none truncate shrink-0"
          >
            {allBuses.map((b) => (
              <option key={b.id} value={b.id} className="dark:bg-[#070B19] bg-white text-slate-900 dark:text-white">
                {b.busNumber} ({b.plateNumber})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Full-Bleed Map (Takes up full screen on mobile) */}
      <div className="flex-1 w-full h-full rounded-[24px] overflow-hidden border dark:border-white/10 border-slate-200 shadow-2xl relative">
        <InteractiveMap
          className="w-full h-full"
          showControls={true}
          showPlacesSearch={false}
          topOffset={true}
        />
      </div>

      {/* BOTTOM COMPACT GLASS PANEL (Uber / Apple Maps style drawer) */}
      <div className="absolute bottom-20 lg:bottom-4 left-3 right-3 sm:left-6 sm:right-6 max-w-lg mx-auto z-30 pointer-events-auto">
        <div
          className={`
            relative overflow-hidden rounded-[24px] p-3.5 sm:p-5
            backdrop-blur-[24px] -webkit-backdrop-blur-[24px]
            dark:bg-[rgba(10,18,36,0.92)] bg-[rgba(255,255,255,0.95)]
            dark:border-[rgba(255,255,255,0.18)] border-[rgba(255,255,255,0.6)]
            border shadow-[0_20px_50px_rgba(0,0,0,0.4)]
            transition-all duration-300 ease-out
          `}
        >
          {/* Top specular glow line */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

          {/* Expand/Collapse Drag Handle */}
          <div
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex justify-center -mt-1.5 mb-2 cursor-pointer"
          >
            <div className="w-10 h-1 rounded-full bg-slate-400/40 dark:bg-white/20" />
          </div>

          {/* Top Row: Bus Thumbnail + LIVE badge + Bus Number + Quick Toggle */}
          <div
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-between mb-2 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden border border-cyan-400/40 shrink-0 shadow-md">
                <img
                  key={selectedBus.id}
                  src={selectedBus.busImage}
                  alt={selectedBus.busNumber}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    LIVE
                  </span>
                  <h3 className="text-base sm:text-xl font-black dark:text-white text-slate-900 tracking-tight font-sans">
                    {selectedBus.busNumber}
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-cyan-500 dark:text-cyan-400 font-bold block">
                  {selectedBus.plateNumber}
                </span>
              </div>
            </div>

            {/* Controls: Audio Mute/Unmute + Expand / Collapse */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSound();
                }}
                className={`px-2 py-1 rounded-xl border flex items-center gap-1 text-[10px] font-bold transition-all active:scale-90 ${
                  isSoundMuted
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    : 'bg-cyan-500/15 text-cyan-400 border-cyan-400/30'
                }`}
                title={isSoundMuted ? 'Unmute Audio & Voice' : 'Mute Audio & Voice'}
                aria-label={isSoundMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isSoundMuted ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                )}
                <span>{isSoundMuted ? 'Muted' : 'Sound'}</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="p-1.5 rounded-xl dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-700 hover:bg-white/10 active:scale-95 transition-all"
                title={isExpanded ? 'Collapse Drawer' : 'Expand Drawer'}
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 3-Metric Streamlined Row: Speed, Distance, ETA */}
          <div className="grid grid-cols-3 gap-2 py-2 border-t dark:border-white/10 border-slate-200/80">
            {/* Speed */}
            <div className="p-2 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/5 border-slate-200">
              <span className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-0.5">
                <Gauge className="w-3 h-3 text-cyan-400" />
                Speed
              </span>
              <span className="text-sm sm:text-xl font-bold font-mono dark:text-white text-slate-900">
                {telemetry.speedKmh} <small className="text-[9px] font-normal text-slate-400">km/h</small>
              </span>
            </div>

            {/* Distance */}
            <div className="p-2 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/5 border-slate-200">
              <span className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-0.5">
                <MapPin className="w-3 h-3 text-blue-400" />
                Distance
              </span>
              <span className="text-sm sm:text-xl font-bold font-mono dark:text-white text-slate-900">
                {formatDistance(telemetry.distanceToStudentStopMeters)}
              </span>
            </div>

            {/* ETA */}
            <div className="p-2 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/5 border-slate-200">
              <span className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-0.5">
                <Clock className="w-3 h-3 text-emerald-400" />
                ETA
              </span>
              <EtaDisplay minutes={telemetry.etaMinutes} size="sm" className="text-emerald-500 dark:text-emerald-400 font-bold" />
            </div>
          </div>

          {/* Next Stop subtitle */}
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-400 pt-1">
            <span className="truncate">Next: <strong className="text-slate-200">{telemetry.nextStop.name}</strong></span>
            <span className="text-cyan-400 font-medium shrink-0">Via {selectedRoute.destination}</span>
          </div>

          {/* EXPANDABLE SECTION (Opens when tapped or dragged up) */}
          {isExpanded && (
            <div className="pt-3 mt-3 border-t dark:border-white/10 border-slate-200 space-y-3 animate-[fadeIn_0.2s_ease-out]">
              {/* Full Live Bus Image Feed Banner */}
              <div className="relative rounded-2xl overflow-hidden border border-cyan-400/30 h-28 w-full shadow-inner">
                <img
                  key={selectedBus.id}
                  src={selectedBus.busImage}
                  alt={selectedBus.busNumber}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <span className="absolute bottom-2 left-3 text-white text-xs font-mono font-bold">
                  {selectedBus.busNumber} • {selectedRoute.name}
                </span>
              </div>

              {/* Driver Contact & Amenities */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-cyan-400/40 shadow-sm shrink-0">
                    {selectedBus.driverPhoto ? (
                      <img
                        src={selectedBus.driverPhoto}
                        alt={selectedBus.driverName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center font-bold text-sm">
                        {selectedBus.driverName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold dark:text-white text-slate-900">
                      {selectedBus.driverName}
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      Driver ★ {selectedBus.driverRating} • 8 yrs exp
                    </span>
                  </div>
                </div>

                <a
                  href={`tel:${selectedBus.driverPhone}`}
                  className="p-2 rounded-xl bg-cyan-500 text-black hover:bg-cyan-400 active:scale-95 transition-all shadow-md"
                  title="Call Driver"
                >
                  <Phone className="w-4 h-4 fill-current" />
                </a>
              </div>

              {/* Vehicle Specifications */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/5 border-slate-200">
                  <Wind className="w-3.5 h-3.5 text-cyan-400 mx-auto mb-0.5" />
                  <span className="text-[9px] text-slate-400 block">Climate</span>
                  <span className="font-bold text-[10px] sm:text-xs dark:text-white text-slate-800">
                    {selectedBus.hasAC ? 'AC Active' : 'Non-AC'}
                  </span>
                </div>
                <div className="p-2 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/5 border-slate-200">
                  <Video className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-0.5" />
                  <span className="text-[9px] text-slate-400 block">Safety</span>
                  <span className="font-bold text-[10px] sm:text-xs dark:text-white text-slate-800">CCTV Live</span>
                </div>
                <div className="p-2 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/5 border-slate-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400 mx-auto mb-0.5" />
                  <span className="text-[9px] text-slate-400 block">Limiter</span>
                  <span className="font-bold text-[10px] sm:text-xs dark:text-white text-slate-800">Max 50 km/h</span>
                </div>
              </div>

              {/* Emergency SOS Button */}
              <button
                onClick={() => setIsSosModalOpen(true)}
                className="w-full py-2 rounded-xl font-bold text-xs bg-rose-500/15 text-rose-500 border border-rose-500/30 hover:bg-rose-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Transport Emergency SOS Desk</span>
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
