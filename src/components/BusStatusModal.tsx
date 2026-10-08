import React from 'react';
import { X, Radio, ShieldCheck, MapPin, Gauge, Clock, ChevronRight } from 'lucide-react';
import type { BusTelemetry, BusVehicle } from '../types/bus';
import { determineBusStatus } from './BusStatusIndicator';

interface BusStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  bus: BusVehicle;
  telemetry: BusTelemetry;
  onOpenStationHistory?: () => void;
}

export const BusStatusModal: React.FC<BusStatusModalProps> = ({
  isOpen,
  onClose,
  bus,
  telemetry,
  onOpenStationHistory,
}) => {
  if (!isOpen) return null;

  const currentStatus = determineBusStatus(telemetry);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Bus Status & Movement Indicator
              </h2>
              <p className="text-xs text-slate-400">
                Purpose of the 3-state circular button & live station telemetry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close status guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Active Status Highlight Banner */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Current Live Status for {bus.busNumber}
              </span>
              <span className={`text-[11px] font-mono font-bold ${
                telemetry.gpsHealth === 'active'
                  ? 'text-emerald-400'
                  : telemetry.gpsHealth === 'weak'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}>
                {telemetry.gpsHealthLabel || telemetry.lastUpdated}
              </span>
            </div>

            <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
              {/* Big Status Circle */}
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border shadow-lg ${
                  currentStatus.type === 'destination'
                    ? 'bg-amber-400 border-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.6)] text-slate-950'
                    : currentStatus.type === 'at_station'
                    ? 'bg-emerald-500 border-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.6)] text-slate-950'
                    : 'bg-rose-500 border-rose-300 shadow-[0_0_16px_rgba(244,63,94,0.6)] text-white'
                }`}
              >
                {currentStatus.type === 'destination' ? (
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm-1.25 10.5l-3-3 1.41-1.41L10.75 9.68l4.84-4.84 1.41 1.41-6.25 6.25z" />
                  </svg>
                ) : currentStatus.type === 'at_station' ? (
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm sm:text-base font-extrabold uppercase tracking-wide ${currentStatus.badgeText}`}>
                    {currentStatus.label}
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/20">
                    {bus.plateNumber}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  {telemetry.statusLabel || currentStatus.description}
                </p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium flex items-center justify-center gap-1">
                  <Gauge className="w-3 h-3 text-cyan-400" /> Speed
                </span>
                <span className="text-sm font-mono font-bold text-white">
                  {telemetry.speedKmh} km/h
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium flex items-center justify-center gap-1">
                  <MapPin className="w-3 h-3 text-cyan-400" /> Next Stop
                </span>
                <span className="text-xs font-bold text-cyan-300 truncate block">
                  {telemetry.nextStop.shortName || telemetry.nextStop.name}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" /> ETA
                </span>
                <span className="text-sm font-mono font-bold text-emerald-400">
                  {telemetry.etaMinutes} min
                </span>
              </div>
            </div>
          </div>

          {/* Explanation: Purpose of the Indicator Button */}
          <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-200/90 leading-relaxed">
            <h4 className="font-bold text-cyan-300 text-sm mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Purpose of the Status Button
            </h4>
            <p>
              The circular indicator button replaces the legacy static bus icon. It acts as an
              <strong> automated real-time station lifecycle monitor</strong> powered by the driver&apos;s live GPS coordinates.
              Instead of guessing where the bus is, this button instantly tells you whether students can board, if the bus is en route, or if it has reached its terminal.
            </p>
          </div>

          {/* The 3 States Breakdown / Legend */}
          <div>
            <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider mb-3">
              The 3 Indicator States Explained
            </h4>

            <div className="space-y-3">
              {/* 🟢 Green State */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-emerald-500/30 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500 border border-emerald-300 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.5)] text-slate-950 mt-0.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400">
                      🟢 Green — At Station (Waiting / Boarding)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-300/70 bg-emerald-950/50 px-1.5 py-0.2 rounded border border-emerald-500/20">
                      Speed ≤ 2 km/h
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    The bus has reached a scheduled station stop and is currently halted. Students may safely board or deboard the bus.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    <strong>Trigger:</strong> Bus enters the station geofence radius (&le; 60m) and comes to a stop.
                  </p>
                </div>
              </div>

              {/* 🔴 Red State */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-rose-500/30 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-rose-500 border border-rose-300 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(244,63,94,0.5)] text-white mt-0.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-rose-400">
                      🔴 Red — Moving to Next Station (En Route)
                    </span>
                    <span className="text-[10px] font-mono text-rose-300/70 bg-rose-950/50 px-1.5 py-0.2 rounded border border-rose-500/20">
                      Speed &gt; 2 km/h
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    The bus has departed from the previous station and is actively in motion traveling along the road toward the next station.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    <strong>Trigger:</strong> Bus moves away (&gt; 90m) from station with driving speed (&ge; 4 km/h).
                  </p>
                </div>
              </div>

              {/* 🟡 Yellow State */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-amber-500/30 flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-amber-400 border border-amber-300 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.5)] text-slate-950 mt-0.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm-1.25 10.5l-3-3 1.41-1.41L10.75 9.68l4.84-4.84 1.41 1.41-6.25 6.25z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-400">
                      🟡 Yellow — Destination / Very Close (Terminus)
                    </span>
                    <span className="text-[10px] font-mono text-amber-300/70 bg-amber-950/50 px-1.5 py-0.2 rounded border border-amber-500/20">
                      Terminus Proximity
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    The bus has arrived or is within proximity (&le; 120m) of the final terminal stop. The trip is concluding.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    <strong>Trigger:</strong> Reached terminal station or within arrival zone of final terminus.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60">
          {onOpenStationHistory ? (
            <button
              onClick={() => {
                onClose();
                onOpenStationHistory();
              }}
              className="flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <span>View Station Notification Audit Log</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-colors shadow-lg shadow-cyan-500/20"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
