import React, { useState } from 'react';
import { useBus } from '../context/BusContext';
import { GlassCard } from '../components/GlassCard';
import {
  Check,
  Clock,
  Users,
  Search,
  Navigation,
  Eye,
  Phone,
  User,
} from 'lucide-react';
import { StreetViewModal } from '../components/StreetViewModal';
import type { BusStop } from '../types/bus';

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
  } = useBus();

  const [searchQuery, setSearchQuery] = useState('');
  const [streetViewStop, setStreetViewStop] = useState<BusStop | null>(null);

  const filteredStops = selectedRoute.stops.filter((stop) =>
    stop.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 pb-24 lg:pb-8 animate-[fadeIn_0.35s_cubic-bezier(0.16,1,0.3,1)]">
      
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
                  alt={assignedBus.busNumber}
                  className="w-5 h-5 rounded-full object-cover border border-cyan-400/40"
                />
              ) : (
                <span>🚌</span>
              )}
              <span>{r.code}</span>
              <span className="text-[10px] opacity-75 font-normal truncate max-w-[100px]">{r.name}</span>
            </button>
          );
        })}
      </div>

      {/* Route Header Overview Card */}
      <GlassCard className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/15 text-cyan-400 border border-cyan-400/30">
                {selectedRoute.code}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {selectedRoute.totalDistanceKm} km • ~{selectedRoute.estimatedTotalMinutes} mins
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black dark:text-white text-slate-900 tracking-tight">
              {selectedRoute.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              From <strong>{selectedRoute.origin}</strong> to <strong>{selectedRoute.destination}</strong>
            </p>
          </div>

          {/* Route Switcher Selector */}
          <div className="shrink-0">
            <select
              value={selectedRoute.id}
              onChange={(e) => selectRoute(e.target.value)}
              className="text-xs font-bold py-2 px-3 rounded-2xl backdrop-blur-xl dark:bg-white/5 bg-slate-100 dark:text-white text-slate-800 border dark:border-white/10 border-slate-200 outline-none cursor-pointer"
            >
              {allRoutes.map((r) => (
                <option key={r.id} value={r.id} className="dark:bg-[#070B19] bg-white text-slate-900 dark:text-white">
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Filter */}
        <div className="relative mt-4">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search stops along this route..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 dark:text-white text-slate-800 placeholder-slate-400 outline-none focus:border-cyan-400 transition-colors"
          />
        </div>
      </GlassCard>

      {/* Live Vehicle Feed for Selected Bus */}
      <GlassCard className="p-4 sm:p-5 border-cyan-400/30 overflow-hidden relative" key={selectedBus.id}>
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
          {/* Live Bus Image */}
          <div className="relative w-full sm:w-44 h-32 sm:h-28 rounded-2xl overflow-hidden shrink-0 border border-white/10 group shadow-md">
            {selectedBus.busImage ? (
              <img
                src={selectedBus.busImage}
                alt={selectedBus.busNumber}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-3xl">🚌</div>
            )}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-cyan-400/40 text-[9px] font-black text-cyan-300">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>LIVE FEED</span>
            </div>
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2 py-1 rounded-xl bg-black/70 backdrop-blur-md text-[10px] font-mono text-white">
              <span>{selectedBus.busNumber}</span>
              <span className="text-cyan-300">{telemetry.speedKmh} km/h</span>
            </div>
          </div>

          {/* Bus Details & Driver */}
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
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-400/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span>{telemetry.speedKmh} km/h</span>
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  Assigned vehicle for {selectedRoute.name}
                </p>
              </div>

              {/* Live Status Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="uppercase text-[10px] tracking-wider">{telemetry.status}</span>
              </div>
            </div>

            {/* Driver & Telemetry Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t dark:border-white/5 border-slate-200/60 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-400 flex items-center justify-center shrink-0 shadow-sm">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0 truncate">
                  <p className="text-[10px] text-slate-400 leading-tight">Driver</p>
                  <p className="text-xs font-bold dark:text-white text-slate-800 truncate">{selectedBus.driverName}</p>
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

      {/* VERTICAL TIMELINE SECTION (Exact Requirement 13) */}
      <GlassCard className="p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6 pb-3 border-b dark:border-white/10 border-slate-200">
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

        {/* Timeline Container */}
        <div className="relative pl-6 sm:pl-10 space-y-8">
          
          {/* Continuous Vertical Route Spine Line */}
          <div className="absolute left-[23px] sm:left-[39px] top-4 bottom-6 w-[3px] bg-slate-300 dark:bg-slate-800 rounded-full" />

          {filteredStops.map((stop) => {
            // Determine stop status relative to telemetry next stop
            const isNextStop = stop.id === telemetry.nextStop.id;
            const isStudentAssignedStop = stop.id === studentStop.id;
            const isPast = stop.sequence < telemetry.nextStop.sequence;

            return (
              <div key={stop.id} className="relative flex items-start gap-4 sm:gap-6 group">
                
                {/* Node Icon on Spine (Requirement 13) */}
                {/* Completed: ✓, Current: 🚌, Upcoming: ○ */}
                <div
                  className={`
                    absolute -left-[23px] sm:-left-[39px] z-10
                    w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs
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
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : isNextStop ? (
                    <span className="text-sm">🚌</span>
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400/40 dark:bg-slate-600"></span>
                  )}
                </div>

                {/* Stop Card Details */}
                <div
                  className={`
                    flex-1 p-4 rounded-2xl transition-all duration-200 border
                    ${
                      isNextStop
                        ? 'dark:bg-cyan-500/10 bg-cyan-50/80 border-cyan-400/40 shadow-md'
                        : isStudentAssignedStop
                        ? 'dark:bg-blue-500/10 bg-blue-50/80 border-blue-400/40 shadow-sm'
                        : 'dark:bg-white/5 bg-slate-50/80 dark:border-white/5 border-slate-200/60 hover:bg-white/10'
                    }
                  `}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold text-slate-400">
                          #{stop.sequence}
                        </span>

                        <h4 className="text-base font-extrabold dark:text-white text-slate-900 tracking-tight">
                          {stop.name}
                        </h4>

                        {/* NEXT STOP BADGE (Requirement 13: ← NEXT STOP) */}
                        {isNextStop && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-cyan-500 text-black shadow-sm animate-pulse">
                            ← NEXT STOP
                          </span>
                        )}

                        {/* STUDENT STOP BADGE */}
                        {isStudentAssignedStop && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-400/30">
                            YOUR STOP
                          </span>
                        )}
                      </div>

                      {/* Stop Metrics */}
                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          Sched: {stop.scheduledTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-purple-400" />
                          {stop.studentsWaiting} waiting
                        </span>
                      </div>
                    </div>

                    {/* Actions: Street View & Set as My Stop */}
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <button
                        onClick={() => setStreetViewStop(stop)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-md dark:bg-cyan-500/10 bg-cyan-50 border dark:border-cyan-400/30 border-cyan-300 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                        title="View Google Street View 360°"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>360° View</span>
                      </button>

                      {!isStudentAssignedStop && (
                        <button
                          onClick={() => updateStudentStop(stop.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 hover:border-cyan-400 dark:text-slate-300 text-slate-700 hover:text-cyan-400 active:scale-95 transition-all"
                        >
                          Set as My Stop
                        </button>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            );
          })}

        </div>
      </GlassCard>

      {/* Street View 360° Modal */}
      <StreetViewModal
        stop={streetViewStop}
        onClose={() => setStreetViewStop(null)}
      />

    </div>
  );
};
