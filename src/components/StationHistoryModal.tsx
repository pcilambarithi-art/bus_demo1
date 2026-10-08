import React from 'react';
import { X, RefreshCw, Radio, ArrowRight } from 'lucide-react';
import type { StationNotificationRecord } from '../types/bus';

interface StationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  busNumber: string;
  records: StationNotificationRecord[];
  onRefresh: () => void;
}

export const StationHistoryModal: React.FC<StationHistoryModalProps> = ({
  isOpen,
  onClose,
  busNumber,
  records,
  onRefresh,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl dark:bg-[#070B19] bg-white border dark:border-white/15 border-slate-200 shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b dark:border-white/10 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-400 flex items-center justify-center text-lg font-bold">
              📜
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black dark:text-white text-slate-900 tracking-tight">
                  Station Event & Notification History
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-400/30">
                  {busNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Audited station-by-station arrival and departure events generated from live GPS geofences
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="p-2 rounded-xl dark:bg-white/5 bg-slate-100 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
              title="Refresh Event Log"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl dark:bg-white/5 bg-slate-100 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
              title="Close Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {records.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Radio className="w-10 h-10 text-cyan-400 mx-auto animate-pulse opacity-60" />
              <p className="text-sm font-semibold">No station events recorded yet for {busNumber}</p>
              <p className="text-xs max-w-md mx-auto text-slate-500">
                As the bus enters and departs configured station geofences along its route, arrival times, departure times, and next station ETAs will be logged here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border dark:border-white/10 border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="dark:bg-white/5 bg-slate-100 text-slate-400 uppercase text-[10px] font-black tracking-wider border-b dark:border-white/10 border-slate-200">
                    <th className="py-3 px-4">Bus ID</th>
                    <th className="py-3 px-4">Station</th>
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Speed</th>
                    <th className="py-3 px-4">Next Station & ETA</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-white/5 divide-slate-200 font-medium">
                  {records.map((rec) => {
                    const isArrived = rec.event === 'ARRIVED';
                    const isDeparted = rec.event === 'DEPARTED';
                    const isDestination = rec.event === 'DESTINATION';

                    return (
                      <tr
                        key={rec.id}
                        className="dark:hover:bg-white/5 hover:bg-slate-50 transition-colors"
                      >
                        {/* Bus ID */}
                        <td className="py-3 px-4 font-mono font-bold text-cyan-400 whitespace-nowrap">
                          {rec.busNumber}
                        </td>

                        {/* Station */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-slate-400">
                              #{rec.sequence}
                            </span>
                            <span className="font-extrabold dark:text-white text-slate-900">
                              {rec.stationName}
                            </span>
                          </div>
                        </td>

                        {/* Event */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              isArrived
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-400/30'
                                : isDeparted
                                ? 'bg-rose-500/15 text-rose-400 border-rose-400/30'
                                : isDestination
                                ? 'bg-amber-400/15 text-amber-400 border-amber-400/30'
                                : 'bg-cyan-500/15 text-cyan-400 border-cyan-400/30'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isArrived
                                  ? 'bg-emerald-400'
                                  : isDeparted
                                  ? 'bg-rose-400'
                                  : isDestination
                                  ? 'bg-amber-400'
                                  : 'bg-cyan-400'
                              }`}
                            />
                            <span>{rec.eventLabel}</span>
                          </span>
                        </td>

                        {/* Time */}
                        <td className="py-3 px-4 font-mono font-bold text-slate-300 whitespace-nowrap">
                          {rec.timeFormatted}
                        </td>

                        {/* Speed */}
                        <td className="py-3 px-4 font-mono text-cyan-400 whitespace-nowrap">
                          {rec.speedKmh} km/h
                        </td>

                        {/* Next Station & ETA */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {rec.nextStationName ? (
                            <div className="flex items-center gap-1 text-[11px] text-slate-300">
                              <ArrowRight className="w-3 h-3 text-cyan-400" />
                              <span>{rec.nextStationName}</span>
                              {rec.nextStationEtaMinutes !== undefined && (
                                <span className="font-mono text-emerald-400 font-bold">
                                  (~{rec.nextStationEtaMinutes}m)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 font-mono text-[10px]">—</span>
                          )}
                        </td>

                        {/* Details */}
                        <td className="py-3 px-4 text-slate-400 max-w-xs truncate text-[11px]">
                          {rec.message}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-white/10 border-slate-200 flex items-center justify-between text-xs text-slate-400 bg-slate-900/40">
          <span>
            Total Logged Events: <strong className="text-white">{records.length}</strong>
          </span>
          <span className="text-[11px]">
            Real-Time Station Geofence Engine v2.4
          </span>
        </div>
      </div>
    </div>
  );
};
