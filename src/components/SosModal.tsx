import React, { useState } from 'react';
import { useBus } from '../context/BusContext';
import { AlertTriangle, Phone, ShieldAlert, X, CheckCircle2 } from 'lucide-react';
import { sound } from '../utils/sound';

export const SosModal: React.FC = () => {
  const { isSosModalOpen, setIsSosModalOpen, selectedBus, student } = useBus();
  const [beaconSent, setBeaconSent] = useState(false);

  if (!isSosModalOpen) return null;

  const handleSendBeacon = () => {
    sound.triggerHaptic([50, 100, 50, 100]);
    setBeaconSent(true);
    setTimeout(() => {
      setBeaconSent(false);
      setIsSosModalOpen(false);
    }, 2800);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
      <div className="relative w-full max-w-md rounded-3xl dark:bg-[#0E060A]/95 bg-white/95 dark:border-rose-500/30 border-rose-300 border p-6 shadow-[0_20px_60px_rgba(239,68,68,0.25)] backdrop-blur-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b dark:border-white/10 border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse">
              <ShieldAlert className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-rose-500 leading-tight">
                Emergency SOS & Helpline
              </h3>
              <p className="text-xs text-slate-400">
                24/7 College Transport Safety Desk
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSosModalOpen(false)}
            className="p-1.5 rounded-full dark:text-slate-400 hover:text-white dark:hover:bg-white/10 text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-5 space-y-4">
          {/* Quick Call Contacts */}
          <div className="space-y-2.5">
            {/* Campus Security */}
            <a
              href="tel:+918023456700"
              className="flex items-center justify-between p-3.5 rounded-2xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 hover:border-rose-500/40 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold dark:text-white text-slate-900 group-hover:text-rose-500 transition-colors">
                    DCE Campus Security Desk (Manimangalam)
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">+91 44 7147 9000</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400">
                Call Now
              </span>
            </a>

            {/* Bus Driver */}
            <a
              href={`tel:${selectedBus.driverPhone}`}
              className="flex items-center justify-between p-3.5 rounded-2xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 hover:border-cyan-500/40 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold dark:text-white text-slate-900 group-hover:text-cyan-400 transition-colors">
                    Driver: {selectedBus.driverName} ({selectedBus.busNumber})
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">{selectedBus.driverPhone}</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400">
                Call Driver
              </span>
            </a>
          </div>

          {/* Instant SOS Distress Beacon */}
          <div className="pt-2">
            {beaconSent ? (
              <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-center animate-[scaleIn_0.2s_ease-out]">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-1.5" />
                <h5 className="font-bold text-sm text-emerald-300">Emergency Alert Broadcasted</h5>
                <p className="text-xs text-slate-300 mt-1">
                  GPS coordinates and student ID ({student.id}) sent to Security Desk. Stay calm.
                </p>
              </div>
            ) : (
              <button
                onClick={handleSendBeacon}
                className="w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider bg-gradient-to-r from-rose-600 to-red-700 text-white shadow-[0_0_30px_rgba(239,68,68,0.5)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-5 h-5 fill-current" />
                <span>Broadcast Emergency Beacon</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <button
          onClick={() => setIsSosModalOpen(false)}
          className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white hover:bg-slate-300 dark:hover:bg-white/20 transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
