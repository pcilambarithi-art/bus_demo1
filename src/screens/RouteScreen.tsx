import React, { useState } from 'react';
import { useBus } from '../context/BusContext';
import { GlassCard } from '../components/GlassCard';
import { InteractiveMap } from '../components/InteractiveMap';
import { BusStatusCardPill } from '../components/BusStatusCardPill';
import { BusStatusIndicator, determineBusStatus } from '../components/BusStatusIndicator';
import { EtaDisplay } from '../components/EtaDisplay';
import {
  Check,
  Clock,
  Users,
  Search,
  Navigation,
  Eye,
  Phone,
  User,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { StreetViewModal } from '../components/StreetViewModal';
import { StationHistoryModal } from '../components/StationHistoryModal';
import { BusStatusModal } from '../components/BusStatusModal';
import type { BusStop } from '../types/bus';
import { Radio } from 'lucide-react';

export const RouteScreen: React.FC = () => {
  const {
    selectedRoute,
    allRoutes,
    selectRoute,
    studentStop,
    updateStudentStop,
    telemetry,
    selectedBus,
    allBuses,
    stationNotificationHistory,
    stationStates,
    refreshStationHistory,
  } = useBus();

  const [searchQuery, setSearchQuery] = useState('');
  const [streetViewStop, setStreetViewStop] = useState<BusStop | null>(null);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isStatusGuideOpen, setIsStatusGuideOpen] = useState(false);
  const [mobileActiveView, setMobileActiveView] = useState<'both' | 'map' | 'stops'>('both');

  const filteredStops = selectedRoute.stops.filter((stop) =>
    stop.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusInfo = determineBusStatus(telemetry);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-28 lg:pb-8 animate-[fadeIn_0.35s_cubic-bezier(0.16,1,0.3,1)]">
      
      {/* Route Switcher Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
        {allRoutes.map((r) => {
          const isSelected = r.id === selectedRoute.id;
          const assignedBus = allBuses.find((b) => b.routeId === r.id);
          return (
            <button
              key={r.id}
              onClick={() => selectRoute(r.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
                isSelected
                  ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.3)] scale-[1.02]'
                  : 'dark:bg-white/5 bg-slate-100 text-slate-600 dark:text-slate-300 border-transparent hover:border-slate-300 dark:hover:border-white/10'
              }`}
            >
              {assignedBus?.busImage ? (
                <img
                  src={assignedBus.busImage}
                  alt={`DCE College Bus ${assignedBus.busNumber} route icon`}
                  className="w-5 h-5 rounded-full object-cover border border-cyan-400/40"
                />
              ) : (
                <span>🚌</span>
              )}
              <span>{r.code}</span>
              <span className="text-[10px] opacity-75 font-normal truncate max-w-[120px]">
                {r.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Route Overview Header Card */}
      <GlassCard className="p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/15 text-cyan-400 border border-cyan-400/30">
                {selectedRoute.code}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {selectedRoute.totalDistanceKm} km • ~{selectedRoute.estimatedTotalMinutes} mins
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>LIVE RADAR SYNCED</span>
              </span>

              {/* Station Notification & Audit History Button */}
              <button
                onClick={() => {
                  refreshStationHistory();
                  setIsHistoryModalOpen(true);
                }}
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold dark:bg-cyan-500/15 bg-cyan-100 text-cyan-600 dark:text-cyan-400 border border-cyan-400/30 flex items-center gap-1 hover:bg-cyan-500/25 transition-all shadow-sm active:scale-95 cursor-pointer"
                title="View Station Event History & Notifications Audit"
              >
                <span>📜 Station Audit</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-cyan-400/20 text-cyan-300">
                  {stationNotificationHistory.length}
                </span>
              </button>
            </div>

            <h2 className="text-xl sm:text-2xl font-black dark:text-white text-slate-900 tracking-tight">
              {selectedRoute.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              From <strong className="text-slate-700 dark:text-slate-200">{selectedRoute.origin}</strong> to{' '}
              <strong className="text-slate-700 dark:text-slate-200">{selectedRoute.destination}</strong>
            </p>
          </div>

          {/* Quick Bus Status Card Pill & Route Switcher */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
            <BusStatusCardPill
              bus={selectedBus}
              telemetry={telemetry}
              className="w-full sm:w-auto"
              showSubtitle={true}
              onOpenStationHistory={() => setIsHistoryModalOpen(true)}
            />

            <select
              value={selectedRoute.id}
              onChange={(e) => selectRoute(e.target.value)}
              className="text-xs font-bold py-2 px-3 rounded-2xl backdrop-blur-xl dark:bg-white/5 bg-slate-100 dark:text-white text-slate-800 border dark:border-white/10 border-slate-200 outline-none cursor-pointer hidden md:block"
            >
              {allRoutes.map((r) => (
                <option key={r.id} value={r.id} className="dark:bg-[#070B19] bg-white text-slate-900 dark:text-white">
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Mobile Segmented Toggle (Radar Map vs Stops vs Both) */}
      <div className="flex lg:hidden items-center justify-center p-1 rounded-2xl dark:bg-white/5 bg-slate-200/80 max-w-sm mx-auto">
        <button
          onClick={() => setMobileActiveView('both')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
            mobileActiveView === 'both'
              ? 'dark:bg-cyan-500/20 bg-white text-cyan-500 dark:text-cyan-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          Unified View
        </button>
        <button
          onClick={() => setMobileActiveView('map')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
            mobileActiveView === 'map'
              ? 'dark:bg-cyan-500/20 bg-white text-cyan-500 dark:text-cyan-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          Live Radar Map
        </button>
        <button
          onClick={() => setMobileActiveView('stops')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
            mobileActiveView === 'stops'
              ? 'dark:bg-cyan-500/20 bg-white text-cyan-500 dark:text-cyan-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          Stops ({selectedRoute.stops.length})
        </button>
      </div>

      {/* MAIN UNIFIED GRID: Live Radar Data + Stop Progression side-by-side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMN 1: LIVE RADAR DATA (Map + Telemetry Feed + Driver Details) */}
        <div
          className={`lg:col-span-7 xl:col-span-7 space-y-4 ${
            mobileActiveView === 'stops' ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* LIVE RADAR MAP CONTAINER */}
          <div
            className={`relative rounded-3xl overflow-hidden border dark:border-white/10 border-slate-200 shadow-2xl bg-slate-950 transition-all ${
              isMapFullscreen
                ? 'fixed inset-0 z-[80] w-screen h-[100dvh] rounded-none'
                : 'h-[440px] sm:h-[500px] xl:h-[540px]'
            }`}
          >
            {/* Top Floating Radar Bar */}
            <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none gap-2">
              <div className="flex items-center gap-2 pointer-events-auto">
                {/* Live Radar Pill Indicator */}
                <div className="px-3 py-1.5 rounded-2xl backdrop-blur-2xl bg-slate-950/85 border border-white/15 text-white shadow-lg flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-[11px] font-black uppercase tracking-wider font-mono">
                    LIVE RADAR
                  </span>
                  <span className="text-slate-400">|</span>
                  <BusStatusIndicator
                    telemetry={telemetry}
                    size="xs"
                    onClick={() => setIsStatusGuideOpen(true)}
                    interactive={true}
                  />
                  <button
                    type="button"
                    onClick={() => setIsStatusGuideOpen(true)}
                    className={`text-[10px] font-bold hover:underline cursor-pointer ${statusInfo.badgeText}`}
                    title="Click to view status guide"
                  >
                    {statusInfo.label}
                  </button>
                  <span className="text-slate-400 hidden sm:inline">|</span>
                  <span className={`text-[10px] font-mono font-bold hidden sm:inline ${
                    telemetry.gpsHealth === 'active'
                      ? 'text-emerald-400'
                      : telemetry.gpsHealth === 'weak'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}>
                    {telemetry.gpsHealthLabel || telemetry.lastUpdated}
                  </span>
                </div>
              </div>

              {/* Action Controls: Full Screen Toggle */}
              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  onClick={() => setIsMapFullscreen(!isMapFullscreen)}
                  className="p-2 sm:px-3 sm:py-1.5 rounded-2xl backdrop-blur-2xl bg-slate-950/85 hover:bg-slate-900 border border-cyan-400/40 text-cyan-300 shadow-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                  title={isMapFullscreen ? 'Exit Full Screen' : 'Expand Radar Full Screen'}
                  aria-label="Toggle Full Screen Radar"
                >
                  {isMapFullscreen ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span className="hidden sm:inline">Exit Full</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span className="hidden sm:inline">Full Radar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Bottom Floating Telemetry Overlay (Next Stop & Speed) */}
            <div className="absolute bottom-3 left-3 right-3 z-30 pointer-events-none">
              <div className="p-3 rounded-2xl backdrop-blur-2xl bg-slate-950/85 border border-white/15 shadow-xl flex items-center justify-between gap-3 text-white pointer-events-auto">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center shrink-0">
                    <Navigation className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                      Approaching Next Stop
                    </p>
                    <p className="text-xs sm:text-sm font-extrabold text-white truncate">
                      {telemetry.nextStop.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 uppercase block font-mono">Speed</span>
                    <span className="text-sm sm:text-base font-black font-mono text-cyan-300">
                      {telemetry.speedKmh} km/h
                    </span>
                  </div>

                  <div className="text-right pl-2 border-l border-white/10">
                    <span className="text-[9px] text-slate-400 uppercase block font-mono">ETA</span>
                    <EtaDisplay minutes={telemetry.etaMinutes} size="sm" className="text-emerald-400 font-bold" />
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive GPS Map Radar */}
            <InteractiveMap
              className="w-full h-full"
              showControls={true}
              showPlacesSearch={false}
              isFullscreen={isMapFullscreen}
              onToggleFullscreen={() => setIsMapFullscreen(!isMapFullscreen)}
            />
          </div>

          {/* VEHICLE TELEMETRY & DRIVER CARD */}
          <GlassCard className="p-4 sm:p-5 border-cyan-400/25 overflow-hidden relative">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
              {/* Live Bus Photo Thumbnail */}
              <div className="relative w-full sm:w-44 h-32 sm:h-28 rounded-2xl overflow-hidden shrink-0 border border-white/10 group shadow-md bg-slate-900">
                {selectedBus.busImage ? (
                  <img
                    src={selectedBus.busImage}
                    alt={`DCE College Bus ${selectedBus.busNumber} (${selectedBus.plateNumber})`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">🚌</div>
                )}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-cyan-400/40 text-[9px] font-black text-cyan-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  <span>GPS RADAR</span>
                </div>
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2 py-1 rounded-xl bg-black/75 backdrop-blur-md text-[10px] font-mono text-white">
                  <span>{selectedBus.busNumber}</span>
                  <span className="text-cyan-300">{telemetry.speedKmh} km/h</span>
                </div>
              </div>

              {/* Bus Details & Driver Contacts */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base sm:text-lg font-black dark:text-white text-slate-900 tracking-tight">
                        {selectedBus.busNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-400/20">
                        {selectedBus.plateNumber}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      Assigned vehicle for {selectedRoute.name}
                    </p>
                  </div>

                  {/* 3-State Status Badge */}
                  <button
                    type="button"
                    onClick={() => setIsStatusGuideOpen(true)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${statusInfo.badgeBg} ${statusInfo.badgeBorder} ${statusInfo.badgeText} text-xs font-bold hover:scale-[1.02] transition-transform cursor-pointer`}
                    title="Click to view indicator purpose & details"
                  >
                    <BusStatusIndicator telemetry={telemetry} size="xs" />
                    <span className="uppercase text-[10px] tracking-wider">{statusInfo.label}</span>
                  </button>
                </div>

                {/* Driver Specs & Quick Call */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t dark:border-white/5 border-slate-200/60 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-400 flex items-center justify-center shrink-0 shadow-sm">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 truncate">
                      <p className="text-[10px] text-slate-400 leading-tight">Driver</p>
                      <p className="text-xs font-bold dark:text-white text-slate-800 truncate">
                        {selectedBus.driverName}
                      </p>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 leading-tight">Occupancy</p>
                    <p className="text-xs font-bold dark:text-white text-slate-800 truncate">
                      {selectedBus.currentOccupancy} / {selectedBus.capacity} seats
                    </p>
                  </div>

                  <div className="col-span-2 sm:col-span-1 flex items-center justify-end sm:justify-start">
                    <a
                      href={`tel:${selectedBus.driverPhone}`}
                      className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-300 flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:scale-95"
                    >
                      <Phone className="w-3 h-3 text-cyan-400" />
                      <span>Call Driver</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Real-Time Status Indicator Purpose Guide & 3 States Showcase */}
          <GlassCard className="p-4 sm:p-5 border dark:border-cyan-500/20 border-cyan-400/30">
            <div className="flex items-center justify-between pb-3 mb-3 border-b dark:border-white/10 border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm dark:text-white text-slate-900 tracking-tight">
                    Status Indicator Purpose &amp; Live States
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Circular button replaces legacy bus icon to communicate real-time station cycle
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsStatusGuideOpen(true)}
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-cyan-400 hover:text-cyan-300 dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 transition-colors"
              >
                Detailed Guide
              </button>
            </div>

            {/* 3 UI Variants Side-by-Side (Green At Station, Red Next Station, Yellow Destination) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Variant 1: 🟢 Green - At Station */}
              <div
                onClick={() => setIsStatusGuideOpen(true)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                  statusInfo.type === 'at_station'
                    ? 'bg-emerald-500/15 border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.25)] ring-1 ring-emerald-400'
                    : 'dark:bg-slate-950/40 bg-slate-50 border-slate-200 dark:border-white/5 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 border border-emerald-300 flex items-center justify-center text-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.7)] shrink-0">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <span className="text-xs font-black text-emerald-400">🟢 At Station</span>
                  </div>
                  {statusInfo.type === 'at_station' && (
                    <span className="text-[9px] font-mono font-bold bg-emerald-400 text-slate-950 px-1.5 py-0.2 rounded-full">
                      ACTIVE NOW
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300 leading-tight">
                  Bus has reached station and is halted for boarding. Speed &le; 2 km/h.
                </p>
              </div>

              {/* Variant 2: 🔴 Red - Moving to Next Station */}
              <div
                onClick={() => setIsStatusGuideOpen(true)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                  statusInfo.type === 'moving'
                    ? 'bg-rose-500/15 border-rose-400/50 shadow-[0_0_15px_rgba(244,63,94,0.25)] ring-1 ring-rose-400'
                    : 'dark:bg-slate-950/40 bg-slate-50 border-slate-200 dark:border-white/5 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-rose-500 border border-rose-300 flex items-center justify-center text-white shadow-[0_0_8px_rgba(244,63,94,0.7)] shrink-0">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </div>
                    <span className="text-xs font-black text-rose-400">🔴 Next Station</span>
                  </div>
                  {statusInfo.type === 'moving' && (
                    <span className="text-[9px] font-mono font-bold bg-rose-400 text-slate-950 px-1.5 py-0.2 rounded-full">
                      ACTIVE NOW
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300 leading-tight">
                  Bus departed station and is travelling en route. Speed &gt; 2 km/h.
                </p>
              </div>

              {/* Variant 3: 🟡 Yellow - Destination */}
              <div
                onClick={() => setIsStatusGuideOpen(true)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                  statusInfo.type === 'destination'
                    ? 'bg-amber-400/15 border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-1 ring-amber-400'
                    : 'dark:bg-slate-950/40 bg-slate-50 border-slate-200 dark:border-white/5 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-amber-400 border border-amber-300 flex items-center justify-center text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.7)] shrink-0">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm-1.25 10.5l-3-3 1.41-1.41L10.75 9.68l4.84-4.84 1.41 1.41-6.25 6.25z" />
                      </svg>
                    </div>
                    <span className="text-xs font-black text-amber-400">🟡 Destination</span>
                  </div>
                  {statusInfo.type === 'destination' && (
                    <span className="text-[9px] font-mono font-bold bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full">
                      ACTIVE NOW
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300 leading-tight">
                  Bus has reached or is very close (&le; 120m) to the final terminus.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* COLUMN 2: ROUTE STOP PROGRESSION TIMELINE */}
        <div
          className={`lg:col-span-5 xl:col-span-5 space-y-4 ${
            mobileActiveView === 'map' ? 'hidden lg:block' : 'block'
          }`}
        >
          <GlassCard className="p-4 sm:p-6">
            
            {/* Header: Title + Search Filter */}
            <div className="space-y-3 mb-6 pb-4 border-b dark:border-white/10 border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-bold text-sm dark:text-white text-slate-900 tracking-tight">
                    Route Stop Progression
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {selectedRoute.stops.length} Stops Total
                </span>
              </div>

              {/* Stop Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter stops along this route..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 dark:text-white text-slate-800 placeholder-slate-400 outline-none focus:border-cyan-400 transition-colors"
                />
              </div>
            </div>

            {/* Vertical Timeline Container */}
            <div className="relative pl-6 sm:pl-8 space-y-6 max-h-[700px] overflow-y-auto pr-1">
              
              {/* Continuous Vertical Route Spine Line */}
              <div className="absolute left-[20px] sm:left-[27px] top-4 bottom-6 w-[3px] bg-slate-300 dark:bg-slate-800 rounded-full" />

              {filteredStops.map((stop) => {
                const isNextStop = stop.id === telemetry.nextStop.id;
                const isStudentAssignedStop = stop.id === studentStop.id;
                const isPast = stop.sequence < telemetry.nextStop.sequence;

                return (
                  <div key={stop.id} className="relative flex items-start gap-3 sm:gap-4 group">
                    
                    {/* Node Icon on Spine */}
                    <div
                      className={`
                        absolute -left-[20px] sm:-left-[27px] z-10
                        w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs
                        border-2 transition-all duration-300
                        ${
                          isPast
                            ? 'bg-emerald-500 border-white text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                            : isNextStop
                            ? 'bg-cyan-500 border-cyan-300 text-black shadow-[0_0_20px_rgba(6,182,212,0.7)] scale-110 animate-bounce'
                            : 'dark:bg-slate-900 bg-white dark:border-slate-700 border-slate-300 text-slate-400'
                        }
                      `}
                    >
                      {isPast ? (
                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                      ) : isNextStop ? (
                        <span className="text-xs sm:text-sm">🚌</span>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-400/40 dark:bg-slate-600" />
                      )}
                    </div>

                    {/* Stop Card Details */}
                    <div
                      className={`
                        flex-1 p-3.5 rounded-2xl transition-all duration-200 border
                        ${
                          isNextStop
                            ? 'dark:bg-cyan-500/10 bg-cyan-50/80 border-cyan-400/50 shadow-md ring-1 ring-cyan-400/30'
                            : isStudentAssignedStop
                            ? 'dark:bg-blue-500/10 bg-blue-50/80 border-blue-400/40 shadow-sm'
                            : 'dark:bg-white/5 bg-slate-50/80 dark:border-white/5 border-slate-200/60 hover:bg-white/10'
                        }
                      `}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                              <span className="text-[10px] font-mono font-bold text-slate-400">
                                #{stop.sequence}
                              </span>

                              <h4 className="text-sm font-extrabold dark:text-white text-slate-900 tracking-tight truncate">
                                {stop.name}
                              </h4>

                              {/* NEXT STOP BADGE */}
                              {isNextStop && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-cyan-500 text-black shadow-sm animate-pulse">
                                  NEXT STOP
                                </span>
                              )}

                              {/* STUDENT STOP BADGE */}
                              {isStudentAssignedStop && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-400/30">
                                  YOUR STOP
                                </span>
                              )}
                            </div>

                            {/* Live Station Operational Status (Requirements 2, 3) */}
                            {(() => {
                              const st = (telemetry.stationStates && telemetry.stationStates[stop.id]) || (stationStates && stationStates[stop.id]);
                              if (!st || st.state === 'IDLE') return null;

                              return (
                                <div className="flex items-center gap-1.5 flex-wrap my-1">
                                  {st.state === 'ARRIVED' && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                      <span>ARRIVED {st.arrivalTime ? `• ${st.arrivalTime}` : ''} (Waiting at Station)</span>
                                    </span>
                                  )}
                                  {st.state === 'DEPARTED' && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-400/30 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                      <span>DEPARTED {st.departureTime ? `• ${st.departureTime}` : ''}</span>
                                    </span>
                                  )}
                                  {st.state === 'APPROACHING' && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/20 text-amber-400 border border-amber-400/30 animate-pulse flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                      <span>APPROACHING • ETA: ~{st.etaMinutes || 2}m ({st.distanceMeters}m away)</span>
                                    </span>
                                  )}
                                </div>
                              );
                            })()}

                            <p className="text-[10px] text-slate-400 truncate">
                              {stop.shortName} • GPS: {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
                            </p>
                          </div>
                        </div>

                        {/* Stop Metrics */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t dark:border-white/5 border-slate-200/50">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-cyan-400" />
                            {stop.scheduledTime}
                          </span>

                          <span className="flex items-center gap-1 text-[10px]">
                            <Users className="w-3 h-3 text-purple-400" />
                            {stop.studentsWaiting} waiting
                          </span>

                          {/* Actions: Street View & Set as My Stop */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setStreetViewStop(stop)}
                              className="p-1 sm:px-2 sm:py-1 rounded-lg text-[10px] font-semibold dark:bg-cyan-500/10 bg-cyan-50 border dark:border-cyan-400/30 border-cyan-300 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 active:scale-95 transition-all flex items-center gap-1"
                              title="View Google Street View 360°"
                            >
                              <Eye className="w-3 h-3" />
                              <span className="hidden sm:inline">360°</span>
                            </button>

                            {!isStudentAssignedStop && (
                              <button
                                onClick={() => updateStudentStop(stop.id)}
                                className="px-2 py-1 rounded-lg text-[10px] font-semibold dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 hover:border-cyan-400 dark:text-slate-300 text-slate-700 hover:text-cyan-400 active:scale-95 transition-all"
                              >
                                Set
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}

            </div>
          </GlassCard>
        </div>

      </div>

      {/* Street View 360° Modal */}
      <StreetViewModal
        stop={streetViewStop}
        onClose={() => setStreetViewStop(null)}
      />

      {/* Station Event & Notification History Audit Modal (Requirement 9) */}
      <StationHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        busNumber={selectedBus.busNumber}
        records={stationNotificationHistory}
        onRefresh={refreshStationHistory}
      />

      {/* Bus Status & Movement Indicator Purpose Guide Modal */}
      <BusStatusModal
        isOpen={isStatusGuideOpen}
        onClose={() => setIsStatusGuideOpen(false)}
        bus={selectedBus}
        telemetry={telemetry}
        onOpenStationHistory={() => setIsHistoryModalOpen(true)}
      />

    </div>
  );
};
