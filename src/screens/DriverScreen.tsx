import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useBus } from '../context/BusContext';
import { publishDriverGps, isFirebaseConfigured, type DriverGpsPayload } from '../services/firebase';
import { busApiService } from '../services/busApiService';
import { GlassCard } from '../components/GlassCard';
import { InteractiveMap } from '../components/InteractiveMap';
import {
  Navigation,
  Gauge,
  Compass,
  Radio,
  Copy,
  ExternalLink,
  AlertTriangle,
  Play,
  Square,
  Shield,
  MapPin,
  Volume2,
  VolumeX,
  Sparkles,
} from 'lucide-react';

export const DriverScreen: React.FC = () => {
  const { allBuses, selectedBus, selectBus, setIsSosModalOpen, isSoundMuted, toggleSound, selectedRoute } = useBus();

  const [gpsData, setGpsData] = useState<DriverGpsPayload | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(true);
  const [isSimulatingDrive, setIsSimulatingDrive] = useState(false);
  const [, setSimIndex] = useState(0);
  const [gpsPermissionError, setGpsPermissionError] = useState<string | null>(null);
  const [packetsSent, setPacketsSent] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [lastServerEvent, setLastServerEvent] = useState<string | null>(null);
  const [currentStationName, setCurrentStationName] = useState<string>('Detecting...');
  const [nextStationName, setNextStationName] = useState<string>('Detecting...');
  const watchIdRef = useRef<number | null>(null);

  const firebaseReady = isFirebaseConfigured();

  // Function to transmit GPS payload to both Backend & Realtime Database
  const transmitGps = useCallback(
    async (payload: DriverGpsPayload) => {
      setGpsData(payload);
      setPacketsSent((prev) => prev + 1);

      // 1. Post to Central DCE Backend API (triggers Station Geofence State Machine)
      try {
        const res = await busApiService.postDriverGps({
          busId: selectedBus.id,
          busNumber: selectedBus.busNumber,
          latitude: payload.latitude,
          longitude: payload.longitude,
          speed: payload.speed,
          heading: payload.heading,
          accuracy: payload.accuracy,
          timestamp: payload.timestamp,
        });

        if (res.bus) {
          if (res.bus.currentStation) {
            setCurrentStationName(res.bus.currentStation.name || res.bus.currentStation.shortName);
          }
          if (res.bus.nextStation) {
            setNextStationName(res.bus.nextStation.name || res.bus.nextStation.shortName);
          }
        }

        if (res.events && res.events.length > 0) {
          const latest = res.events[res.events.length - 1];
          setLastServerEvent(`${latest.title} (${latest.timeFormatted})`);
        }
      } catch (err) {
        console.warn('[Driver Telemetry Error]', err);
      }

      // 2. Push to Firebase Realtime Database & local channel
      await publishDriverGps(selectedBus.busNumber, payload);
    },
    [selectedBus.id, selectedBus.busNumber]
  );

  // Watch Driver GPS (Physical Device Tracking)
  useEffect(() => {
    if (!isBroadcasting || isSimulatingDrive) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!('geolocation' in navigator)) {
      setGpsPermissionError('Geolocation is not supported by your browser.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        setGpsPermissionError(null);
        const speedKmh =
          pos.coords.speed !== null && pos.coords.speed !== undefined
            ? Math.max(0, Math.round(pos.coords.speed * 3.6))
            : 0;

        const payload: DriverGpsPayload = {
          busNumber: selectedBus.busNumber,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          speed: speedKmh,
          heading: pos.coords.heading || 0,
          accuracy: Math.round(pos.coords.accuracy || 5),
          timestamp: Date.now(),
          status: 'LIVE',
          driverName: selectedBus.driverName,
          routeId: selectedBus.routeId,
        };

        await transmitGps(payload);
      },
      (err) => {
        console.warn('[Driver GPS Error]', err);
        setGpsPermissionError(
          err.code === 1
            ? 'GPS location permission denied. Please allow location access in your browser.'
            : 'Unable to acquire accurate GPS position.'
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
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
  }, [isBroadcasting, isSimulatingDrive, selectedBus.busNumber, selectedBus.driverName, selectedBus.routeId, transmitGps]);

  // Simulation Drive Runner for Live Demonstration / Desk Testing
  useEffect(() => {
    if (!isSimulatingDrive) return;

    const waypoints = selectedRoute.waypoints.length ? selectedRoute.waypoints : [[12.9249, 80.1165]];
    const interval = setInterval(async () => {
      setSimIndex((prev) => {
        const next = (prev + 1) % waypoints.length;
        const coord = waypoints[next] || waypoints[0];
        const nextCoord = waypoints[(next + 1) % waypoints.length] || coord;

        // Calculate heading
        const heading = Math.round(
          (Math.atan2(nextCoord[1] - coord[1], nextCoord[0] - coord[0]) * 180) / Math.PI + 360
        ) % 360;

        const payload: DriverGpsPayload = {
          busNumber: selectedBus.busNumber,
          latitude: coord[0],
          longitude: coord[1],
          speed: Math.round(22 + Math.sin(next) * 5),
          heading,
          accuracy: 4,
          timestamp: Date.now(),
          status: 'LIVE',
          driverName: selectedBus.driverName,
          routeId: selectedBus.routeId,
        };

        transmitGps(payload);
        return next;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [isSimulatingDrive, selectedBus, selectedRoute, transmitGps]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?mode=driver`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="min-h-screen w-full dark:bg-[#070B19] bg-[#0A1224] text-white flex flex-col p-4 sm:p-6 lg:p-8 animate-[fadeIn_0.3s_ease-out]">
      
      {/* Driver Cockpit Header */}
      <header className="max-w-3xl mx-auto w-full flex items-center justify-between gap-3 pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-2xl shadow-[0_4px_20px_rgba(6,182,212,0.5)]">
            🚌
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">DCE Driver Cockpit</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/20 text-cyan-400 border border-cyan-400/30">
                LIVE GPS ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Broadcasting real-time vehicle GPS & station notifications to students
            </p>
          </div>
        </div>

        {/* Audio Mute/Unmute & Student View Link */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm border ${
              isSoundMuted
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/35 hover:bg-rose-500/30'
                : 'bg-cyan-500/20 text-cyan-400 border-cyan-400/40 hover:bg-cyan-500/30'
            }`}
            title={isSoundMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isSoundMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />}
            <span className="hidden sm:inline">{isSoundMuted ? 'Muted' : 'Sound On'}</span>
          </button>

          <a
            href="/"
            className="px-3 py-1.5 rounded-xl text-xs font-bold dark:bg-white/10 bg-white/20 hover:bg-white/30 text-white flex items-center gap-1.5 transition-all shadow-sm"
          >
            <span>Student View</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Main Cockpit Body */}
      <main className="max-w-3xl mx-auto w-full flex-1 flex flex-col gap-5 py-6">
        
        {/* Bus Selector Card */}
        <GlassCard className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                Active Assigned Bus
              </label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-cyan-400">{selectedBus.busNumber}</span>
                <span className="text-xs font-mono text-slate-400">({selectedBus.plateNumber})</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Driver: <strong>{selectedBus.driverName}</strong> • {selectedBus.driverPhone}
              </p>
            </div>

            {/* Selector Dropdown */}
            <div className="shrink-0">
              <select
                value={selectedBus.id}
                onChange={(e) => selectBus(e.target.value)}
                className="text-xs font-bold py-2 px-3 rounded-xl bg-slate-900 text-white border border-white/20 outline-none cursor-pointer focus:border-cyan-400"
              >
                {allBuses.map((b) => (
                  <option key={b.id} value={b.id} className="bg-[#070B19] text-white">
                    {b.busNumber} — {b.plateNumber}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </GlassCard>

        {/* GPS Live Transmission Status Card */}
        <GlassCard className="p-6 relative overflow-hidden">
          {/* Status Bar */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center">
                <span
                  className={`w-3.5 h-3.5 rounded-full ${
                    isBroadcasting && (gpsData || isSimulatingDrive) ? 'bg-emerald-400 animate-ping absolute' : ''
                  }`}
                />
                <span
                  className={`w-3 h-3 rounded-full relative z-10 ${
                    isBroadcasting && (gpsData || isSimulatingDrive)
                      ? 'bg-emerald-400'
                      : isBroadcasting
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-slate-500'
                  }`}
                />
              </div>

              <span className="text-xs font-black tracking-wider uppercase">
                {isSimulatingDrive
                  ? 'SIMULATION DRIVE ACTIVE'
                  : isBroadcasting && gpsData
                  ? 'LIVE BROADCASTING'
                  : isBroadcasting
                  ? 'ACQUIRING GPS SIGNAL...'
                  : 'BROADCAST PAUSED'}
              </span>
            </div>

            {/* Cloud Backend Pill */}
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  firebaseReady
                    ? 'bg-orange-500/20 text-orange-400 border-orange-400/30'
                    : 'bg-cyan-500/20 text-cyan-400 border-cyan-400/30'
                }`}
              >
                {firebaseReady ? '🔥 Firebase RTDB Active' : '📡 DCE Telemetry Engine Active'}
              </span>
            </div>
          </div>

          {/* Permission Error Banner */}
          {gpsPermissionError && !isSimulatingDrive && (
            <div className="p-3 mb-4 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{gpsPermissionError}</span>
            </div>
          )}

          {/* Telemetry Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Latitude */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                Latitude
              </span>
              <span className="text-base font-bold font-mono text-white">
                {gpsData ? gpsData.latitude.toFixed(6) : '—'}
              </span>
            </div>

            {/* Longitude */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                <Navigation className="w-3.5 h-3.5 text-blue-400" />
                Longitude
              </span>
              <span className="text-base font-bold font-mono text-white">
                {gpsData ? gpsData.longitude.toFixed(6) : '—'}
              </span>
            </div>

            {/* Live Speed */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                Speed
              </span>
              <span className="text-base font-bold font-mono text-emerald-400">
                {gpsData ? `${gpsData.speed} km/h` : '0 km/h'}
              </span>
            </div>

            {/* Accuracy */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                <Compass className="w-3.5 h-3.5 text-purple-400" />
                Accuracy
              </span>
              <span className="text-base font-bold font-mono text-purple-300">
                {gpsData ? `±${gpsData.accuracy} m` : '—'}
              </span>
            </div>
          </div>

          {/* Station Geofence Detection Preview Bar */}
          <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-white/5 flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Current Station:</span>
              <span className="font-bold text-white truncate max-w-[180px]">{currentStationName}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Next Station:</span>
              <span className="font-bold text-cyan-300 truncate max-w-[180px]">{nextStationName}</span>
            </div>

            {lastServerEvent && (
              <div className="sm:col-span-2 p-2 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-[11px] font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
                <span className="truncate">Last Station Event: <strong>{lastServerEvent}</strong></span>
              </div>
            )}
          </div>

          {/* Packet Counter Footer */}
          <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-mono">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              Packets Sent: <strong className="text-white">{packetsSent}</strong>
            </span>
            <span className="text-[11px]">
              Engine: <code className="text-cyan-400 font-mono">/api/driver/telemetry</code>
            </span>
          </div>
        </GlassCard>

        {/* Live Route Navigation Preview Map */}
        <div className="h-64 sm:h-72 w-full rounded-2xl overflow-hidden border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] relative">
          <InteractiveMap
            showControls={false}
            showPlacesSearch={false}
            className="w-full h-full"
          />
          <div className="absolute top-2.5 left-2.5 z-10 px-2.5 py-1 rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/10 text-[10px] font-bold text-cyan-300">
            Route {selectedBus.routeId.toUpperCase()} • Driver Navigation
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Pause / Resume Button */}
          <button
            onClick={() => {
              setIsBroadcasting(!isBroadcasting);
              if (isSimulatingDrive) setIsSimulatingDrive(false);
            }}
            className={`flex-1 w-full py-3.5 px-5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${
              isBroadcasting
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
          >
            {isBroadcasting ? (
              <>
                <Square className="w-4 h-4" />
                <span>Pause GPS Broadcast</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Resume GPS Broadcast</span>
              </>
            )}
          </button>

          {/* Test Drive Simulation Button (for desk testing) */}
          <button
            onClick={() => {
              setIsSimulatingDrive(!isSimulatingDrive);
              if (!isBroadcasting) setIsBroadcasting(true);
            }}
            className={`py-3.5 px-5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 border ${
              isSimulatingDrive
                ? 'bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 hover:bg-cyan-500/30'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>{isSimulatingDrive ? 'Stop Test Run' : 'Start Simulation Drive'}</span>
          </button>

          {/* Copy Driver Link Button */}
          <button
            onClick={handleCopyLink}
            className="py-3.5 px-5 rounded-2xl font-bold text-sm bg-white/10 hover:bg-white/15 text-white flex items-center justify-center gap-2 transition-all active:scale-95 border border-white/10 shrink-0"
          >
            <Copy className="w-4 h-4" />
            <span>{copiedLink ? 'Copied Link!' : 'Driver Link'}</span>
          </button>

          {/* Emergency SOS Button */}
          <button
            onClick={() => setIsSosModalOpen(true)}
            className="py-3.5 px-5 rounded-2xl font-bold text-sm bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_4px_20px_rgba(225,29,72,0.4)] shrink-0"
          >
            <Shield className="w-4 h-4" />
            <span>SOS</span>
          </button>
        </div>
      </main>
    </div>
  );
};
