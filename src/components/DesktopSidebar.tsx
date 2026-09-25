import React from 'react';
import { useBus } from '../context/BusContext';
import type { ActiveTab } from '../types/bus';
import {
  Home,
  Navigation,
  Map,
  User,
  ChevronRight,
  Smartphone,
  AlertTriangle,
  Sparkles,
  Radio,
} from 'lucide-react';
import { formatDistance } from '../utils/geo';
import { EtaDisplay } from './EtaDisplay';

interface SidebarNavTab {
  id: ActiveTab;
  label: string;
  icon: React.FC<{ className?: string }>;
  badge?: string;
}

const TABS: SidebarNavTab[] = [
  { id: 'home', label: 'Home Dashboard', icon: Home },
  { id: 'live', label: 'Live Bus Radar', icon: Navigation, badge: 'LIVE' },
  { id: 'route', label: 'Route & Stops', icon: Map },
  { id: 'profile', label: 'Student Profile', icon: User },
];

export const DesktopSidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    selectedBus,
    selectedRoute,
    studentStop,
    telemetry,
    allBuses,
    selectBus,
    setIsAiModalOpen,
    setIsApkModalOpen,
    setIsSosModalOpen,
    setMode,
  } = useBus();

  return (
    <aside className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 h-[calc(100vh-4.5rem)] sticky top-[4.5rem] border-r dark:border-white/10 border-slate-200/80 p-5 dark:bg-[#070B19]/50 bg-white/40 backdrop-blur-xl overflow-y-auto">
      
      {/* Navigation Menu */}
      <div className="space-y-1.5 mb-6">
        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Navigation
        </div>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold
                transition-all duration-200 select-none
                ${
                  isActive
                    ? 'dark:bg-cyan-500/15 bg-cyan-100/70 text-cyan-600 dark:text-cyan-400 border dark:border-cyan-400/30 border-cyan-300 shadow-[0_4px_20px_rgba(6,182,212,0.15)]'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/10 dark:hover:bg-white/5'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? 'text-cyan-500 dark:text-cyan-400 stroke-[2.5]' : 'text-slate-400 stroke-[1.8]'
                  }`}
                />
                <span>{tab.label}</span>
              </div>

              {tab.badge && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Bus Active Glass Card */}
      <div className="mb-6 p-4 rounded-3xl dark:bg-slate-900/60 bg-white/70 border dark:border-white/10 border-slate-200 shadow-lg relative overflow-hidden backdrop-blur-lg">
        {/* Specular line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xl">🚌</span>
            <span className="font-extrabold text-base dark:text-white text-slate-900 tracking-tight">
              {selectedBus.busNumber}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            LIVE
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 truncate">
          {selectedRoute.name}
        </p>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t dark:border-white/10 border-slate-200/60">
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Speed</span>
            <span className="text-sm font-mono font-bold text-cyan-500 dark:text-cyan-400">
              {telemetry.speedKmh} km/h
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">ETA</span>
            <EtaDisplay minutes={telemetry.etaMinutes} size="sm" className="text-emerald-500 dark:text-emerald-400" />
          </div>
          <div className="col-span-2 pt-1">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Distance to your stop</span>
            <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-200">
              {formatDistance(telemetry.distanceToStudentStopMeters)} ({studentStop.shortName})
            </span>
          </div>
        </div>
      </div>

      {/* Switch Bus Dropdown / Pill Selector */}
      <div className="mb-6">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2 px-1">
          Switch Bus Route
        </label>
        <div className="space-y-1.5">
          {allBuses.map((bus) => (
            <button
              key={bus.id}
              onClick={() => selectBus(bus.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedBus.id === bus.id
                  ? 'dark:bg-white/10 bg-slate-200/80 text-cyan-600 dark:text-cyan-400 border border-cyan-400/40'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-white/5'
              }`}
            >
              <span>{bus.busNumber}</span>
              <span className="font-mono text-[10px] text-slate-400">{bus.plateNumber}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom PC Quick Shortcuts */}
      <div className="mt-auto pt-4 border-t dark:border-white/10 border-slate-200 space-y-2">
        <button
          onClick={() => setMode('driver')}
          className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold dark:bg-amber-500/10 bg-amber-50 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-all shadow-sm"
        >
          <span className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-amber-500 dark:text-amber-400 animate-pulse" />
            <span>Driver GPS Cockpit</span>
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
        </button>
        <button
          onClick={() => setIsAiModalOpen(true)}
          className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold dark:bg-cyan-500/10 bg-cyan-50 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-400/30 transition-all shadow-sm"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Ask Campus Transit AI</span>
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
        </button>

        <button
          onClick={() => setIsApkModalOpen(true)}
          className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium dark:bg-white/5 bg-slate-100 hover:bg-white/10 transition-all text-slate-600 dark:text-slate-300"
        >
          <span className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <span>Android APK & Install</span>
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </button>

        <button
          onClick={() => setIsSosModalOpen(true)}
          className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 transition-all"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Emergency SOS Desk</span>
          </span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
