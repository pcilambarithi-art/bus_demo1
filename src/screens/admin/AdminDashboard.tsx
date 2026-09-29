import React, { useState, useEffect, useCallback } from 'react';
import { busApiService } from '../../services/busApiService';
import { sound } from '../../utils/sound';
import type { SyncPayload, StaffUser, ActivityLog, StaffIssueReport } from '../../types/bus';

// Import Tabs
import { OverviewTab } from './tabs/OverviewTab';
import { BusesTab } from './tabs/BusesTab';
import { RoutesTab } from './tabs/RoutesTab';
import { MapStopsTab } from './tabs/MapStopsTab';
import { AnnouncementsTab } from './tabs/AnnouncementsTab';
import { StaffTab } from './tabs/StaffTab';
import { IssuesTab } from './tabs/IssuesTab';
import { LogsTab } from './tabs/LogsTab';
import { SyncStatusTab } from './tabs/SyncStatusTab';

import {
  LayoutDashboard,
  Bus,
  Route,
  MapPin,
  Volume2,
  Users,
  AlertTriangle,
  FileText,
  Radio,
  LogOut,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';

interface AdminDashboardProps {
  onLogout: () => void;
  onNavigateHome: () => void;
}

export type AdminTab =
  | 'overview'
  | 'buses'
  | 'routes'
  | 'map'
  | 'announcements'
  | 'staff'
  | 'issues'
  | 'logs'
  | 'sync';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onNavigateHome }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [syncData, setSyncData] = useState<SyncPayload>(() => busApiService.getCachedSync());
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [issuesList, setIssuesList] = useState<StaffIssueReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load live data from central API
  const refreshAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const sync = await busApiService.fetchSync(true);
      setSyncData(sync);

      const [staff, logs, issues] = await Promise.all([
        busApiService.getStaffList().catch(() => []),
        busApiService.getActivityLogs().catch(() => []),
        busApiService.getAdminIssues().catch(() => []),
      ]);

      setStaffList(staff);
      setActivityLogs(logs);
      setIssuesList(issues);
    } catch (e) {
      console.warn('[Admin Dashboard] Refresh error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAllData();

    // Listen for live fleet updates from other tabs
    const unsubscribe = busApiService.subscribeSync((payload) => {
      setSyncData(payload);
    });

    return () => {
      unsubscribe();
    };
  }, [refreshAllData]);

  const handleTabChange = (tab: AdminTab) => {
    sound.playClick();
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    sound.playClick();
    busApiService.clearAdminSession();
    onLogout();
  };

  // Nav Items Definition
  const NAV_ITEMS: { id: AdminTab; label: string; icon: React.FC<{ className?: string }>; badge?: number | string; badgeColor?: string }[] = [
    { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'buses', label: 'Bus Fleet Management', icon: Bus, badge: syncData.buses.length },
    { id: 'routes', label: 'Route Corridors', icon: Route, badge: syncData.routes.length },
    { id: 'map', label: 'Map & Stop Locations', icon: MapPin, badge: syncData.stops.length },
    { id: 'announcements', label: 'Voice Announcements', icon: Volume2, badge: syncData.announcements.length },
    { id: 'staff', label: 'Bus Staff & Drivers', icon: Users, badge: staffList.length },
    {
      id: 'issues',
      label: 'Staff Incident Reports',
      icon: AlertTriangle,
      badge: issuesList.filter(i => i.status !== 'Resolved' && i.status !== 'Closed').length,
      badgeColor: 'bg-rose-500 text-white',
    },
    { id: 'logs', label: 'Security Activity Logs', icon: FileText, badge: activityLogs.length },
    { id: 'sync', label: 'API & APK Sync Status', icon: Radio, badge: 'LIVE', badgeColor: 'bg-emerald-500/20 text-emerald-400' },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col dark:bg-[#070B19] bg-[#0A1224] text-white selection:bg-cyan-500 selection:text-black">
      
      {/* Top Admin Header Bar */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#070B19]/90 border-b border-white/10 px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Mobile Menu Toggle & Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 lg:hidden cursor-pointer"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-400 flex items-center justify-center font-black text-sm shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white leading-tight">
                  DCE ADMIN COMMAND
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-cyan-500/15 text-cyan-400 border border-cyan-400/30">
                  WEB CONSOLE
                </span>
              </div>
              <span className="text-[10px] text-slate-400 hidden sm:block">
                Dhanalakshmi College of Engineering, Chennai
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions, Refresh, Student View & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Refresh Data Button */}
          <button
            onClick={refreshAllData}
            disabled={isLoading}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white text-xs font-bold border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh database records from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          {/* Student View Link */}
          <button
            onClick={onNavigateHome}
            className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-cyan-400 hover:text-cyan-300 text-xs font-bold border border-cyan-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Switch to Student Live Tracking Map"
          >
            <span className="hidden sm:inline">Student View</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 text-xs font-bold border border-rose-500/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Logout from Admin Console"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>

      </header>

      {/* Main Content Layout */}
      <div className="flex-1 flex w-full max-w-[1700px] mx-auto min-h-[calc(100vh-4rem)]">
        
        {/* Left Admin Navigation Sidebar (Desktop) */}
        <aside className="hidden lg:flex flex-col w-72 shrink-0 border-r border-white/10 p-5 bg-[#070B19]/60 backdrop-blur-xl sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          
          <div className="space-y-1 mb-6">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Management Modules
            </span>

            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-white'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                      item.badgeColor || (isActive ? 'bg-cyan-500/30 text-cyan-200' : 'bg-white/10 text-slate-400')
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Sidebar Info Card */}
          <div className="mt-auto p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold text-white">Central Transit API Online</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Serving real-time telemetry to both Web and native APK clients.
            </p>
          </div>

        </aside>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="relative w-72 bg-[#0B132B] border-r border-white/10 p-5 flex flex-col h-full overflow-y-auto z-10">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <span className="font-extrabold text-sm text-cyan-400">ADMIN MODULES</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabChange(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Main Panel Content Area */}
        <main className="flex-1 w-full min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'overview' && (
            <OverviewTab
              syncData={syncData}
              activityLogs={activityLogs}
              onNavigateTab={(tab) => handleTabChange(tab as AdminTab)}
            />
          )}

          {activeTab === 'buses' && (
            <BusesTab
              buses={syncData.buses}
              routes={syncData.routes}
              staffList={staffList}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'routes' && (
            <RoutesTab
              routes={syncData.routes}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'map' && (
            <MapStopsTab
              routes={syncData.routes}
              stops={syncData.stops}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'announcements' && (
            <AnnouncementsTab
              announcements={syncData.announcements}
              routes={syncData.routes}
              stops={syncData.stops}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'staff' && (
            <StaffTab
              staffList={staffList}
              buses={syncData.buses}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'issues' && (
            <IssuesTab
              issues={issuesList}
              buses={syncData.buses}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'logs' && (
            <LogsTab logs={activityLogs} />
          )}

          {activeTab === 'sync' && (
            <SyncStatusTab
              syncData={syncData}
              onRefresh={refreshAllData}
            />
          )}
        </main>

      </div>

    </div>
  );
};
