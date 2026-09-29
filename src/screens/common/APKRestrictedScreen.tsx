import React from 'react';
import { ShieldAlert, ArrowLeft, Globe } from 'lucide-react';

interface APKRestrictedScreenProps {
  onReturnToTracking: () => void;
}

export const APKRestrictedScreen: React.FC<APKRestrictedScreenProps> = ({ onReturnToTracking }) => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 text-center dark:bg-[#070B19] bg-[#0A1224] text-white">
      <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(244,63,94,0.3)]">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
        Access Restricted: Web Only
      </h1>

      <p className="text-xs sm:text-sm text-slate-300 max-w-md leading-relaxed mb-6 font-medium">
        The DCE Administration Panel and Bus Staff Management portals are accessible 
        <strong> ONLY</strong> through the authorized web application on desktop/browser. 
        The mobile APK is reserved strictly for passenger bus tracking.
      </p>

      <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 max-w-sm mb-6 text-left flex items-start gap-3">
        <Globe className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-[11px] text-slate-300">
          <span className="font-bold text-white block">Authorized Access Point:</span>
          Please visit the DCE Campus Bus Tracking Web Portal on your computer browser to log into the Admin Console.
        </div>
      </div>

      <button
        onClick={onReturnToTracking}
        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-extrabold text-xs tracking-wide shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center gap-2 transition-all cursor-pointer active:scale-95"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Live Bus Tracking</span>
      </button>
    </div>
  );
};
