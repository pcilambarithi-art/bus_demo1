import React from 'react';
import type { SyncPayload, ActivityLog } from '../../../types/bus';
import { Bus, MapPin, Route, AlertTriangle, Radio, CheckCircle, ArrowUpRight, Volume2, ShieldCheck } from 'lucide-react';

interface OverviewTabProps {
  syncData: SyncPayload;
  activityLogs: ActivityLog[];
  onNavigateTab: (tab: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ syncData, activityLogs, onNavigateTab }) => {
  const activeBuses = syncData.buses.filter(b => b.isActive).length;
  const delayedOrIssueBuses = syncData.buses.filter(b => 
    b.operationalStatus === 'Delayed' || b.operationalStatus === 'Breakdown' || b.operationalStatus === 'Emergency'
  ).length;
  const openIssues = syncData.activeIssues.filter(i => i.status !== 'Resolved' && i.status !== 'Closed').length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner Alert if any bus has an issue */}
      {delayedOrIssueBuses > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-3 text-amber-300">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-white">
                {delayedOrIssueBuses} Bus{delayedOrIssueBuses > 1 ? 'es' : ''} Reporting Delayed or Breakdown Status
              </p>
              <p className="text-xs text-amber-300/80">
                Staff telemetry alerts received. Review active transit updates.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('issues')}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors shrink-0"
          >
            Review Issues
          </button>
        </div>
      )}

      {/* Primary KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Active Buses */}
        <div 
          onClick={() => onNavigateTab('buses')}
          className="p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Fleet Buses</span>
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 group-hover:scale-110 transition-transform">
              <Bus className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{syncData.buses.length}</span>
            <span className="text-xs font-bold text-emerald-400">{activeBuses} In Service</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span>Synchronized with APK</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Card 2: Transit Routes */}
        <div 
          onClick={() => onNavigateTab('routes')}
          className="p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Operational Routes</span>
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 group-hover:scale-110 transition-transform">
              <Route className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{syncData.routes.length}</span>
            <span className="text-xs font-bold text-indigo-400">Active Corridors</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span>Guindy, Tambaram, CMBT</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Card 3: Bus Stops */}
        <div 
          onClick={() => onNavigateTab('map')}
          className="p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Mapped Stops</span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 group-hover:scale-110 transition-transform">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{syncData.stops.length}</span>
            <span className="text-xs font-bold text-emerald-400">GPS Calibrated</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span>Draggable Map Pins</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Card 4: Open Issue Reports */}
        <div 
          onClick={() => onNavigateTab('issues')}
          className="p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Staff Issue Reports</span>
            <div className={`p-2 rounded-xl ${openIssues > 0 ? 'bg-rose-500/15 text-rose-400' : 'bg-slate-500/15 text-slate-400'} group-hover:scale-110 transition-transform`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{syncData.activeIssues.length}</span>
            <span className={`text-xs font-bold ${openIssues > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {openIssues} Pending
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span>Breakdowns & Delays</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

      </div>

      {/* Architecture System Health Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/30 to-blue-950/30 border border-cyan-500/25 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-400/30">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">Central Single Source of Truth</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                LIVE CLOUD API
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Updates made here instantly sync to the student Web app & mobile APK without requiring app recompilation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigateTab('announcements')}
            className="px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-bold border border-white/10 flex items-center gap-1.5 transition-all"
          >
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Voice ({syncData.announcements.length})</span>
          </button>
          <button
            onClick={() => onNavigateTab('sync')}
            className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Sync Status</span>
          </button>
        </div>
      </div>

      {/* Fleet Live Table Preview & Activity Log Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Live Fleet Snapshot */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bus className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-sm text-white">Live Fleet Snapshot</h3>
            </div>
            <button
              onClick={() => onNavigateTab('buses')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-bold"
            >
              Manage All Buses →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-2.5">Bus No.</th>
                  <th className="pb-2.5">Route</th>
                  <th className="pb-2.5">Staff Driver</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5">Speed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {syncData.buses.slice(0, 5).map(bus => (
                  <tr key={bus.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 font-bold text-white">
                      <div>{bus.busNumber}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{bus.plateNumber}</div>
                    </td>
                    <td className="py-3 text-slate-300">
                      <div className="truncate max-w-[160px]">{bus.routeName || 'Assigned Route'}</div>
                    </td>
                    <td className="py-3 text-slate-300">
                      <div>{bus.driverName}</div>
                      <div className="text-[10px] text-slate-500">{bus.driverPhone}</div>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        bus.operationalStatus === 'Delayed'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : bus.operationalStatus === 'Breakdown'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {bus.operationalStatus || 'In Service'}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-cyan-400 font-bold">
                      {bus.currentSpeed || 0} km/h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Recent Admin Audit Trail */}
        <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-sm text-white">Recent Activity Log</h3>
            </div>
            <button
              onClick={() => onNavigateTab('logs')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
            >
              All Logs →
            </button>
          </div>

          <div className="space-y-3">
            {activityLogs.slice(0, 5).map(log => (
              <div key={log.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-cyan-400">{log.action}</span>
                  <span className="text-[9px] text-slate-500">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-200 line-clamp-2">{log.details}</p>
                <div className="text-[10px] text-slate-400">Target: {log.target}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
