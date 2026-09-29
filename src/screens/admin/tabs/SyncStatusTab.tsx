import React, { useState } from 'react';
import type { SyncPayload } from '../../../types/bus';
import { busApiService } from '../../../services/busApiService';
import { sound } from '../../../utils/sound';
import { CheckCircle, RefreshCw, Smartphone, Globe, Database, Radio, ShieldCheck } from 'lucide-react';

interface SyncStatusTabProps {
  syncData: SyncPayload;
  onRefresh: () => void;
}

export const SyncStatusTab: React.FC<SyncStatusTabProps> = ({ syncData, onRefresh }) => {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [lastBroadcastTime, setLastBroadcastTime] = useState<string | null>(null);

  const handleForceBroadcast = async () => {
    sound.playClick();
    setIsBroadcasting(true);

    try {
      await busApiService.fetchSync(true);
      sound.playSuccess();
      setLastBroadcastTime(new Date().toLocaleTimeString());
      onRefresh();
    } catch (e: any) {
      alert(`Broadcast error: ${e.message}`);
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span>Single Source of Truth & Synchronization Architecture</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Centralized data distribution pipeline powering the Web tracking application and native Mobile APK.
          </p>
        </div>

        <button
          onClick={handleForceBroadcast}
          disabled={isBroadcasting}
          className="px-4 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95 transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isBroadcasting ? 'animate-spin' : ''}`} />
          <span>{isBroadcasting ? 'Broadcasting...' : 'FORCE FLEET SYNC'}</span>
        </button>
      </div>

      {lastBroadcastTime && (
        <div className="p-3.5 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-cyan-400" />
          <span>Fleet sync message broadcast at {lastBroadcastTime}. All connected user tabs & mobile devices updated.</span>
        </div>
      )}

      {/* Architecture Flow Diagram Card */}
      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Data Pipeline Topology
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          
          {/* Admin Web Panel */}
          <div className="p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto border border-cyan-400/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-white">ADMIN WEB PANEL</h4>
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300">
              Web Only (/admin)
            </span>
            <p className="text-[11px] text-slate-400">
              Mutates buses, stops, coordinates & voice announcements
            </p>
          </div>

          {/* Central Backend API & Database */}
          <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-center space-y-2 relative">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-400/30">
              <Database className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-white">CENTRAL BACKEND API</h4>
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 font-mono">
              GET /api/sync
            </span>
            <p className="text-[11px] text-slate-400">
              Single persistent source of truth with instant BroadcastChannel sync
            </p>
          </div>

          {/* User Clients: Web + APK */}
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-400/30">
              <div className="flex items-center gap-1">
                <Globe className="w-4 h-4" />
                <Smartphone className="w-4 h-4" />
              </div>
            </div>
            <h4 className="font-bold text-sm text-white">USER WEB + MOBILE APK</h4>
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
              Auto Sync Without Rebuild
            </span>
            <p className="text-[11px] text-slate-400">
              Consumes identical updated bus & stop data dynamically
            </p>
          </div>

        </div>
      </div>

      {/* Sync Metrics Table */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Synchronized Buses</span>
          <div className="text-2xl font-black text-white mt-1">{syncData.buses.length} Vehicles</div>
          <span className="text-[10px] text-emerald-400 mt-1 block">Full fleet loaded</span>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Synchronized Routes</span>
          <div className="text-2xl font-black text-white mt-1">{syncData.routes.length} Corridors</div>
          <span className="text-[10px] text-indigo-400 mt-1 block">Waypoints active</span>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Synchronized Stops</span>
          <div className="text-2xl font-black text-white mt-1">{syncData.stops.length} GPS Points</div>
          <span className="text-[10px] text-cyan-400 mt-1 block">Draggable calibrated</span>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Voice Alerts</span>
          <div className="text-2xl font-black text-white mt-1">{syncData.announcements.length} Triggered</div>
          <span className="text-[10px] text-amber-400 mt-1 block">Web Speech & Audio</span>
        </div>
      </div>

    </div>
  );
};
