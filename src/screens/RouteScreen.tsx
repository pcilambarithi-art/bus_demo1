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
  } = useBus();

  const [searchQuery, setSearchQuery] = useState('');
  const [streetViewStop, setStreetViewStop] = useState<BusStop | null>(null);

  const filteredStops = selectedRoute.stops.filter((stop) =>
    stop.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 pb-24 lg:pb-8 animate-[fadeIn_0.35s_cubic-bezier(0.16,1,0.3,1)]">
      
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
