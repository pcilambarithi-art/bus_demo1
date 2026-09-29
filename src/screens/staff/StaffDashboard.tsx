import React, { useState, useEffect, useRef } from 'react';
import { busApiService } from '../../services/busApiService';
import { publishDriverGps, isFirebaseConfigured, type DriverGpsPayload } from '../../services/firebase';
import { sound } from '../../utils/sound';
import type { StaffUser, BusVehicle, BusRoute, StaffIssueReport, StaffIssueType, IssuePriority } from '../../types/bus';
import {
  Play,
  Square,
  AlertTriangle,
  MapPin,
  CheckCircle,
  LogOut,
  X,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

interface StaffDashboardProps {
  onLogout: () => void;
  onNavigateHome: () => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ onLogout, onNavigateHome }) => {
  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [assignedBus, setAssignedBus] = useState<BusVehicle | null>(null);
  const [assignedRoute, setAssignedRoute] = useState<BusRoute | null>(null);
  const [myIssues, setMyIssues] = useState<StaffIssueReport[]>([]);

  // Trip state
  const [tripActive, setTripActive] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>('On Route');

  // GPS Broadcast state
  const [isBroadcastingGps, setIsBroadcastingGps] = useState(false);
  const [gpsData, setGpsData] = useState<{ lat: number; lng: number; speed: number; heading: number; accuracy: number } | null>(null);
  const [packetsSent, setPacketsSent] = useState(0);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Issue reporting modal
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [issueType, setIssueType] = useState<StaffIssueType>('Traffic Delay');
  const [issueDescription, setIssueDescription] = useState('');
  const [issuePriority, setIssuePriority] = useState<IssuePriority>('Medium');
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load staff profile & initial data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await busApiService.getStaffProfile();
        setStaff(data.staff);
        setAssignedBus(data.bus);
        setAssignedRoute(data.route);
        setCurrentStatus(data.bus.operationalStatus || 'On Route');

        const issues = await busApiService.getStaffIssues();
        setMyIssues(issues);
      } catch (e: any) {
        console.warn('Profile load fallback:', e);
        // Fallback from cache
        const cachedSync = busApiService.getCachedSync();
        const defaultStaff = {
          id: 'staff-01',
          name: 'Muruganandam K.',
          email: 'murugan@dce.edu',
          phone: '+91 94440 12894',
          role: 'driver' as const,
          assignedBusId: 'bus-07',
          status: 'active' as const,
        };
        setStaff(defaultStaff);
        setAssignedBus(cachedSync.buses[0]);
        setAssignedRoute(cachedSync.routes[0]);
        setCurrentStatus(cachedSync.buses[0]?.operationalStatus || 'On Route');
      }
    };

    loadProfile();
  }, []);

  // GPS Telemetry Watcher
  useEffect(() => {
    if (!isBroadcastingGps) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported on this device/browser.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        setGpsError(null);
        const speedKmh = pos.coords.speed !== null && pos.coords.speed !== undefined
          ? Math.max(0, Math.round(pos.coords.speed * 3.6))
          : 0;

        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speed: speedKmh,
          heading: pos.coords.heading || 0,
          accuracy: Math.round(pos.coords.accuracy || 5),
        };

        setGpsData(coords);
        setPacketsSent(prev => prev + 1);

        const busId = assignedBus?.id || 'bus-07';
        const busNumber = assignedBus?.busNumber || 'DCE-BUS-07';

        // 1. Send to Centralized Backend API
        busApiService.updateStaffGps(busId, {
          latitude: coords.lat,
          longitude: coords.lng,
          speed: coords.speed,
          heading: coords.heading,
        }).catch(() => {});

        // 2. Dual-publish to Firebase RTDB if configured
        if (isFirebaseConfigured()) {
          const payload: DriverGpsPayload = {
            busNumber,
            latitude: coords.lat,
            longitude: coords.lng,
            speed: coords.speed,
            heading: coords.heading,
            accuracy: coords.accuracy,
            timestamp: Date.now(),
            status: 'LIVE' as const,
            driverName: staff?.name || 'Bus Driver',
            routeId: assignedRoute?.id || 'route-07',
          };
          publishDriverGps(busNumber, payload).catch(() => {});
        }
      },
      (err) => {
        console.warn('Staff GPS watch error:', err);
        setGpsError('Unable to acquire high-accuracy GPS fix. Please ensure location permissions are enabled.');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1500,
        timeout: 10000,
      }
    );

    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isBroadcastingGps, assignedBus, assignedRoute, staff, currentStatus]);

  // Trip Start / End Controls
  const handleStartTrip = async () => {
    sound.playSuccess();
    setTripActive(true);
    setIsBroadcastingGps(true);
    await handleStatusUpdate('Trip Started');
    showToast('Trip started! Live phone GPS broadcast is now active.');
  };

  const handleEndTrip = async () => {
    sound.playClick();
    setTripActive(false);
    setIsBroadcastingGps(false);
    await handleStatusUpdate('Trip Completed');
    showToast('Trip completed. Vehicle returned to station.');
  };

  // Change Bus Status
  const handleStatusUpdate = async (status: string) => {
    sound.playClick();
    setCurrentStatus(status);

    if (assignedBus) {
      try {
        await busApiService.updateBusStatus(assignedBus.id, status);
        showToast(`Bus status updated to "${status}". Synced to Web & APK.`);
      } catch (err: any) {
        console.error('Error updating bus status:', err);
      }
    }
  };

  // Submit Issue Report
  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueDescription.trim()) return;

    setIsSubmittingIssue(true);
    sound.playClick();

    try {
      const locationStr = gpsData
        ? `GPS [${gpsData.lat.toFixed(4)}, ${gpsData.lng.toFixed(4)}]`
        : assignedRoute?.stops?.[0]?.name || 'On Route';

      const newIssue = await busApiService.reportIssue({
        busId: assignedBus?.id || 'bus-07',
        busNumber: assignedBus?.busNumber || 'DCE-BUS-07',
        routeId: assignedRoute?.id || 'route-07',
        issueType,
        description: issueDescription.trim(),
        location: locationStr,
        latitude: gpsData?.lat,
        longitude: gpsData?.lng,
        priority: issuePriority,
      });

      sound.playSuccess();
      setMyIssues(prev => [newIssue, ...prev]);
      setIsIssueModalOpen(false);
      setIssueDescription('');
      showToast('Incident report sent to DCE Transport Control Desk.');
    } catch (err: any) {
      alert(`Error submitting report: ${err.message}`);
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleLogout = () => {
    sound.playClick();
    busApiService.clearStaffSession();
    onLogout();
  };

  const STATUS_OPTIONS = [
    { label: 'Trip Started', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40' },
    { label: 'On Route', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
    { label: 'Delayed', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
    { label: 'Heavy Traffic', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
    { label: 'Stopped', color: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
    { label: 'Breakdown', color: 'bg-rose-500/20 text-rose-400 border-rose-500/40' },
    { label: 'Emergency', color: 'bg-rose-600/30 text-rose-300 border-rose-500/50' },
    { label: 'Trip Completed', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
  ];

  return (
    <div className="min-h-screen w-full dark:bg-[#070B19] bg-[#0A1224] text-white flex flex-col p-4 sm:p-6 lg:p-8 animate-[fadeIn_0.2s_ease-out]">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md p-3.5 rounded-2xl bg-cyan-500 text-black font-extrabold text-xs flex items-center justify-between shadow-[0_10px_30px_rgba(6,182,212,0.4)] animate-[slideDown_0.2s_ease-out]">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:opacity-70">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mobile-Friendly Header */}
      <header className="max-w-2xl mx-auto w-full flex items-center justify-between gap-3 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-xl shadow-[0_4px_20px_rgba(245,158,11,0.4)]">
            🚌
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white">Staff Cockpit</h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-400/30 uppercase">
                {staff?.role || 'DRIVER'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {staff?.name || 'Muruganandam K.'} • {assignedBus?.busNumber || 'DCE-BUS-07'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateHome}
            className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 text-xs font-bold"
            title="Student Tracker"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs font-bold border border-rose-500/30 flex items-center gap-1.5"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Mobile Cockpit Content */}
      <main className="max-w-2xl mx-auto w-full flex-1 flex flex-col gap-4 py-5">
        
        {/* Assigned Vehicle & Route Card */}
        <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/10 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Assigned Fleet Vehicle
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              AUTHORIZED
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-black text-amber-400 tracking-tight">
                {assignedBus?.busNumber || 'DCE-BUS-07'}
              </span>
              <span className="text-xs font-mono text-slate-400 ml-2">
                ({assignedBus?.plateNumber || 'TN-11-AA-4521'})
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-white block">
                {assignedRoute?.name || 'Guindy ➔ DCE Express'}
              </span>
              <span className="text-[10px] text-slate-400">
                Line #{assignedRoute?.routeNumber || '21'}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Trip Control Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleStartTrip}
            disabled={tripActive}
            className={`py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
              tripActive
                ? 'bg-white/[0.05] text-slate-500 cursor-not-allowed border border-white/5'
                : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_25px_rgba(16,185,129,0.35)] active:scale-95'
            }`}
          >
            <Play className="w-5 h-5 fill-current" />
            <span>START TRIP</span>
          </button>

          <button
            onClick={handleEndTrip}
            disabled={!tripActive}
            className={`py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
              !tripActive
                ? 'bg-white/[0.05] text-slate-500 cursor-not-allowed border border-white/5'
                : 'bg-rose-500 hover:bg-rose-400 text-white shadow-[0_0_25px_rgba(244,63,94,0.35)] active:scale-95'
            }`}
          >
            <Square className="w-5 h-5 fill-current" />
            <span>END TRIP</span>
          </button>
        </div>

        {/* Live Status Selector Chips */}
        <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Current Bus Status
            </span>
            <span className="text-xs font-black text-cyan-400">
              Current: {currentStatus}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => handleStatusUpdate(opt.label)}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                  currentStatus === opt.label
                    ? `${opt.color} ring-2 ring-cyan-400 shadow-md`
                    : 'bg-white/[0.03] text-slate-300 border-white/10 hover:bg-white/[0.07]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Device GPS Live Broadcasting Card */}
        <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center">
                <span className={`w-3.5 h-3.5 rounded-full ${
                  isBroadcastingGps && gpsData ? 'bg-emerald-400 animate-ping absolute' : ''
                }`} />
                <span className={`w-3 h-3 rounded-full ${
                  isBroadcastingGps ? 'bg-emerald-400 shadow-[0_0_10px_#10B981]' : 'bg-slate-600'
                }`} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Live Phone GPS Transmitter</h3>
                <p className="text-[10px] text-slate-400">
                  {isBroadcastingGps ? 'Transmitting vehicle coordinates' : 'Broadcasting inactive'}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                setIsBroadcastingGps(!isBroadcastingGps);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                isBroadcastingGps
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-cyan-500 text-black border-cyan-400 font-extrabold shadow-[0_0_15px_rgba(6,182,212,0.3)]'
              }`}
            >
              {isBroadcastingGps ? 'Pause GPS' : 'Transmit GPS'}
            </button>
          </div>

          {gpsError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              {gpsError}
            </div>
          )}

          {/* Telemetry Metrics */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="p-3 rounded-2xl bg-black/30 border border-white/5 text-center">
              <span className="text-[9px] text-slate-400 uppercase block mb-0.5">Speed</span>
              <span className="text-xl font-black text-cyan-400 font-mono">
                {gpsData?.speed || 0}
              </span>
              <span className="text-[9px] text-slate-500 block">km/h</span>
            </div>

            <div className="p-3 rounded-2xl bg-black/30 border border-white/5 text-center">
              <span className="text-[9px] text-slate-400 uppercase block mb-0.5">Packets Sent</span>
              <span className="text-xl font-black text-emerald-400 font-mono">
                {packetsSent}
              </span>
              <span className="text-[9px] text-slate-500 block">updates</span>
            </div>

            <div className="p-3 rounded-2xl bg-black/30 border border-white/5 text-center">
              <span className="text-[9px] text-slate-400 uppercase block mb-0.5">Accuracy</span>
              <span className="text-xl font-black text-white font-mono">
                ±{gpsData?.accuracy || 5}m
              </span>
              <span className="text-[9px] text-slate-500 block">GPS fix</span>
            </div>
          </div>
        </div>

        {/* Report an Incident Action Button */}
        <button
          onClick={() => {
            sound.playClick();
            setIsIssueModalOpen(true);
          }}
          className="w-full py-3.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>REPORT INCIDENT / BREAKDOWN</span>
        </button>

        {/* Previous Reports History */}
        {myIssues.length > 0 && (
          <div className="p-5 rounded-3xl bg-white/[0.04] border border-white/10 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              My Previous Reports ({myIssues.length})
            </h3>

            <div className="space-y-2">
              {myIssues.map((issue) => (
                <div key={issue.id} className="p-3.5 rounded-2xl bg-black/30 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">{issue.issueType}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                      issue.status === 'Resolved' || issue.status === 'Closed'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}>
                      {issue.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{issue.description}</p>
                  {issue.adminRemarks && (
                    <div className="p-2 rounded-xl bg-white/[0.04] text-[11px] text-cyan-300 border border-cyan-500/20 mt-1">
                      <strong>Admin Note:</strong> {issue.adminRemarks}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* REPORT ISSUE MODAL */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-lg my-6 bg-[#0B132B] border border-rose-500/30 rounded-3xl p-6 shadow-[0_0_60px_rgba(244,63,94,0.3)] text-white">
            
            <div className="flex items-center justify-between pb-3.5 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-base text-white">Report Transit Problem</h3>
              </div>
              <button
                onClick={() => setIsIssueModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitIssue} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                  Issue Type *
                </label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value as StaffIssueType)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white focus:border-rose-400 focus:outline-none cursor-pointer"
                >
                  <option value="Bus Breakdown">Bus Breakdown</option>
                  <option value="Mechanical Problem">Mechanical Problem</option>
                  <option value="Engine Problem">Engine Problem</option>
                  <option value="Tyre Problem">Tyre Problem</option>
                  <option value="Accident">Accident</option>
                  <option value="Traffic Delay">Traffic Delay</option>
                  <option value="Route Problem">Route Problem</option>
                  <option value="GPS Problem">GPS Problem</option>
                  <option value="Other">Other Problem</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                  Priority
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Low', 'Medium', 'High', 'Critical'] as IssuePriority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setIssuePriority(p)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        issuePriority === p
                          ? 'bg-rose-500/25 text-rose-300 border-rose-400 shadow-sm'
                          : 'bg-white/[0.04] text-slate-400 border-white/10'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                  Description of Situation *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Mechanical problem near Tambaram. Bus has stopped on side of road."
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-white focus:border-rose-400 focus:outline-none font-sans"
                />
              </div>

              {gpsData && (
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2 text-[11px] text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>GPS Position auto-attached: [{gpsData.lat.toFixed(4)}, {gpsData.lng.toFixed(4)}]</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingIssue}
                  className="px-6 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-black font-black shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingIssue ? 'Submitting...' : 'Dispatch Report'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
