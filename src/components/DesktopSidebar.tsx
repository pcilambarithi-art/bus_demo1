import React from 'react';
import { useBus } from '../context/BusContext';
import type { ActiveTab } from '../types/bus';
import {
  Home,
  Navigation,
  User,
  Smartphone,
  AlertTriangle,
  Sparkles,
  Shield,
  ChevronDown,
} from 'lucide-react';
import { formatDistance } from '../utils/geo';
import { EtaDisplay } from './EtaDisplay';
import { BusStatusCardPill } from './BusStatusCardPill';
import { BusStatusIndicator, determineBusStatus } from './BusStatusIndicator';

interface SidebarNavTab {
  id: ActiveTab;
  label: string;
  icon: React.FC<{ className?: string }>;
  badge?: string;
}

// Streamlined 3 primary navigation tabs: Live Radar is unified directly into Route & Stops
const TABS: SidebarNavTab[] = [
  { id: 'home', label: 'Home Dashboard', icon: Home },
  { id: 'route', label: 'Route & Live Radar', icon: Navigation, badge: 'LIVE' },
  { id: 'profile', label: 'Student Profile', icon: User },
];

export const DesktopSidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    selectedBus,
    studentStop,
    telemetry,
    allBuses,
    selectBus,
    setIsAiModalOpen,
    setIsApkModalOpen,
    setIsSosModalOpen,
    openLegalModal,
  } = useBus();

  const statusInfo = determineBusStatus(telemetry);

  return (
    <aside className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 h-[calc(100vh-4.5rem)] sticky top-[4.5rem] border-r dark:border-white/10 border-slate-200/80 p-4 xl:p-5 dark:bg-[#070B19]/75 bg-white/70 backdrop-blur-2xl overflow-y-auto no-scrollbar justify-between">
      
      {/* Top Section: Navigation + Live Bus Telemetry */}
      <div className="space-y-4">
        {/* Navigation Section */}
        <div>
          <div className="px-2 pb-2 text-[10px] xl:text-[11px] font-black uppercase tracking-wider text-slate-400">
            Navigation
          </div>
          <div className="space-y-1">
            {TABS.map((tab) => {
              // Highlight 'route' if activeTab is either 'route' or 'live'
              const isActive =
                tab.id === 'route'
                  ? activeTab === 'route' || activeTab === 'live'
                  : activeTab === tab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs xl:text-sm font-bold
                    transition-all duration-200 select-none group
                    ${
                      isActive
                        ? 'dark:bg-cyan-500/15 bg-cyan-100/80 text-cyan-500 dark:text-cyan-400 border dark:border-cyan-400/40 border-cyan-300 shadow-[0_4px_16px_rgba(6,182,212,0.18)]'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-white/10 dark:hover:bg-white/5'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 xl:w-5 xl:h-5 ${
                        isActive
                          ? 'text-cyan-500 dark:text-cyan-400 stroke-[2.5]'
                          : 'text-slate-400 group-hover:text-cyan-400 stroke-[2]'
                      }`}
                    />
                    <span>{tab.label}</span>
                  </div>

                  {tab.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] xl:text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{tab.badge}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Active Bus Telemetry Card (Refined & Compact, Fits Perfectly) */}
        <div className="p-3.5 rounded-3xl dark:bg-slate-900/70 bg-white/80 border dark:border-white/10 border-slate-200 shadow-md relative overflow-hidden backdrop-blur-xl space-y-2.5">
          {/* Top ambient highlight */}
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

          {/* Header Row: Status Label & Switch Bus Dropdown */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                Active Bus Radar
              </span>
            </div>

            {/* Quick Bus Selector Dropdown */}
            <div className="relative">
              <select
                value={selectedBus.id}
                onChange={(e) => selectBus(e.target.value)}
                className="appearance-none text-[10px] font-bold py-1 pl-2 pr-5 rounded-lg dark:bg-white/5 bg-slate-100 dark:text-cyan-400 text-cyan-600 border dark:border-white/10 border-slate-200 outline-none cursor-pointer focus:border-cyan-400 transition-colors"
                aria-label="Switch tracked college bus"
              >
                {allBuses.map((b) => (
                  <option
                    key={b.id}
                    value={b.id}
                    className="dark:bg-[#070B19] bg-white text-slate-900 dark:text-white"
                  >
                    {b.busNumber}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-2.5 h-2.5 absolute right-1.5 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none" />
            </div>
          </div>

          {/* Redesigned 3-State Bus Status Card Pill */}
          <BusStatusCardPill
            bus={selectedBus}
            telemetry={telemetry}
            onClick={() => setActiveTab('route')}
            showSubtitle={false}
          />

          {/* Telemetry Metrics Row: Status Type + Speed + ETA */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t dark:border-white/5 border-slate-200/60 text-xs">
            <div className="p-2 rounded-xl dark:bg-white/5 bg-slate-50/70 border dark:border-white/5 border-slate-200/50">
              <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">
                Current State
              </span>
              <div className="flex items-center gap-1.5">
                <BusStatusIndicator telemetry={telemetry} size="xs" />
                <span className={`text-[10px] font-bold truncate ${statusInfo.badgeText}`}>
                  {statusInfo.type === 'destination'
                    ? 'Destination'
                    : statusInfo.type === 'at_station'
                    ? 'At Station'
                    : 'Moving'}
                </span>
              </div>
            </div>

            <div className="p-2 rounded-xl dark:bg-white/5 bg-slate-50/70 border dark:border-white/5 border-slate-200/50">
              <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">
                ETA to Stop
              </span>
              <EtaDisplay
                minutes={telemetry.etaMinutes}
                size="sm"
                className="text-emerald-500 dark:text-emerald-400 font-bold"
              />
            </div>

            <div className="col-span-2 px-1 flex items-center justify-between text-[10px] text-slate-400 font-medium">
              <span className="truncate">Stop: {studentStop.shortName}</span>
              <span className="font-mono text-cyan-500 dark:text-cyan-400 font-bold shrink-0">
                {formatDistance(telemetry.distanceToStudentStopMeters)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Compact Action Utilities Grid */}
      <div className="pt-3 border-t dark:border-white/10 border-slate-200/80 space-y-1.5 shrink-0">
        <div className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
          Transit Utilities
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {/* Ask AI Assistant */}
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="flex items-center gap-2 p-2 rounded-xl text-[11px] font-bold dark:bg-cyan-500/10 bg-cyan-50 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-400/30 transition-all text-left"
            title="Ask Campus Transit AI"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">Transit AI</span>
          </button>

          {/* Android APK */}
          <button
            onClick={() => setIsApkModalOpen(true)}
            className="flex items-center gap-2 p-2 rounded-xl text-[11px] font-medium dark:bg-white/5 bg-slate-100 hover:bg-white/10 transition-all text-slate-600 dark:text-slate-300 border dark:border-white/5 border-slate-200 text-left"
            title="Android APK & Installation"
          >
            <Smartphone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">APK App</span>
          </button>

          {/* Emergency SOS */}
          <button
            onClick={() => setIsSosModalOpen(true)}
            className="flex items-center gap-2 p-2 rounded-xl text-[11px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/25 transition-all text-left"
            title="Emergency SOS Desk"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="truncate">SOS Desk</span>
          </button>

          {/* Privacy & Legal Hub */}
          <button
            onClick={() => openLegalModal('privacy')}
            className="flex items-center gap-2 p-2 rounded-xl text-[11px] font-medium dark:bg-white/5 bg-slate-100 hover:bg-white/10 transition-all text-slate-600 dark:text-slate-300 border dark:border-white/5 border-slate-200 text-left"
            title="Privacy, Terms & Legal Hub"
          >
            <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">Legal Hub</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
