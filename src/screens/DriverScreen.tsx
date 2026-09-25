import React, { useEffect, useState, useRef } from 'react';
import { useBus } from '../context/BusContext';
import { publishDriverGps, isFirebaseConfigured, type DriverGpsPayload } from '../services/firebase';
import { GlassCard } from '../components/GlassCard';
import { InteractiveMap } from '../components/InteractiveMap';
import {
  Navigation,
  Gauge,
  Compass,
  Radio,
  CheckCircle,
  Copy,
  ExternalLink,
  AlertTriangle,
  Play,
  Square,
  Shield,
  MapPin,
  Volume2,
  VolumeX,
} from 'lucide-react';

export const DriverScreen: React.FC = () => {
  const { allBuses, selectedBus, selectBus, setIsSosModalOpen, isSoundMuted, toggleSound } = useBus();

  const [gpsData, setGpsData] = useState<DriverGpsPayload | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(true);
  const [gpsPermissionError, setGpsPermissionError] = useState<string | null>(null);
  const [packetsSent, setPacketsSent] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const firebaseReady = isFirebaseConfigured();

  // Watch Driver GPS and publish to Firebase RTDB
  useEffect(() => {
    if (!isBroadcasting) {
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
        const speedKmh = pos.coords.speed !== null && pos.coords.speed !== undefined
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

        setGpsData(payload);
        setPacketsSent((prev) => prev + 1);

        // Push to Firebase Realtime Database
        await publishDriverGps(selectedBus.busNumber, payload);
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
  }, [isBroadcasting, selectedBus.busNumber, selectedBus.driverName, selectedBus.routeId]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?mode=driver`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="min-h-screen w-full dark:bg-[#070B19] bg-[#0A1224] text-white flex flex-col p-4 sm:p-6 lg:p-8 animate-[fadeIn_0.3s_ease-out]">
      
      {/* Driver Cockpit Header */}
      <header className="max-w-2xl mx-auto w-full flex items-center justify-between gap-3 pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-2xl shadow-[0_4px_20px_rgba(6,182,212,0.5)]">
            🚌
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">DCE Driver Cockpit</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/20 text-cyan-400 border border-cyan-400/30">
                DRIVER GPS
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Broadcasting real-time vehicle telemetry to students
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
      <main className="max-w-2xl mx-auto w-full flex-1 flex flex-col gap-5 py-6">
        
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center">
                <span
                  className={`w-3.5 h-3.5 rounded-full ${
                    isBroadcasting && gpsData ? 'bg-emerald-400 animate-ping absolute' : ''
                  }`}
                />
                <span
                  className={`w-3 h-3 rounded-full relative z-10 ${
                    isBroadcasting && gpsData
                      ? 'bg-emerald-400'
                      : isBroadcasting
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-slate-500'
                  }`}
                />
              </div>

              <span className="text-xs font-black tracking-wider uppercase">
                {isBroadcasting && gpsData
                  ? 'LIVE BROADCASTING'
                  : isBroadcasting
                  ? 'ACQUIRING GPS SIGNAL...'
                  : 'BROADCAST PAUSED'}
              </span>
            </div>

            {/* Cloud Backend Pill */}
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                firebaseReady
                  ? 'bg-orange-500/20 text-orange-400 border-orange-400/30'
                  : 'bg-cyan-500/20 text-cyan-400 border-cyan-400/30'
              }`}
            >
              {firebaseReady ? '🔥 Firebase RTDB Active' : '⚡ Local Multi-Tab Sync'}
            </span>
          </div>

          {/* Permission Error Banner */}
          {gpsPermissionError && (
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

          {/* Packet Counter Footer */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-mono">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              Packets Broadcast: <strong className="text-white">{packetsSent}</strong>
            </span>
            <span className="text-[11px]">
              Target: <code className="text-cyan-400 font-mono">buses/{selectedBus.busNumber}</code>
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
            Route {selectedBus.routeId.toUpperCase()} • Live Map
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Pause / Resume Button */}
          <button
            onClick={() => setIsBroadcasting(!isBroadcasting)}
            className={`flex-1 w-full py-3.5 px-5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${
              isBroadcasting
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
            }`}
          >
            {isBroadcasting ? (
              <>
                <Square className="w-4 h-4" />
                <span>Pause GPS Transmission</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Resume GPS Transmission</span>
              </>
            )}
          </button>

          {/* Copy Driver Mobile Link */}
          <button
            onClick={handleCopyLink}
            className="w-full sm:w-auto py-3.5 px-5 rounded-2xl font-bold text-xs bg-white/10 hover:bg-white/15 border border-white/15 text-white flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md"
          >
            {copiedLink ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Copied Link!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Driver URL</span>
              </>
            )}
          </button>

          {/* Driver SOS Desk */}
          <button
            onClick={() => setIsSosModalOpen(true)}
            className="w-full sm:w-auto py-3.5 px-5 rounded-2xl font-bold text-xs bg-rose-600/30 text-rose-300 hover:bg-rose-600/40 border border-rose-500/50 flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md"
          >
            <Shield className="w-4 h-4" />
            <span>Emergency SOS</span>
          </button>
        </div>

        {/* Driver Guide & Mobile Setup Note */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 space-y-2">
          <h4 className="font-bold text-white flex items-center gap-1.5">
            <span>📱</span> Driver Mobile Setup
          </h4>
          <p>
            Open this page on the driver's phone with <strong>?mode=driver</strong>. As the college bus travels along the route, the phone's GPS automatically sends real coordinates, speed, and heading to all student maps in real time.
          </p>
        </div>

      </main>

    </div>
  );
};
