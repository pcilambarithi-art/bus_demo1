import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [fadeState, setFadeState] = useState<'visible' | 'fading' | 'hidden'>('visible');

  useEffect(() => {
    // Elegant quick splash duration
    const fadeTimer = setTimeout(() => {
      setFadeState('fading');
    }, 1300);

    const completeTimer = setTimeout(() => {
      setFadeState('hidden');
      onComplete();
    }, 1750);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  if (fadeState === 'hidden') return null;

  return (
    <div
      onClick={() => {
        setFadeState('hidden');
        onComplete();
      }}
      className={`
        fixed inset-0 z-[999] flex flex-col items-center justify-center
        bg-[#070B19] select-none cursor-pointer
        transition-opacity duration-500 ease-out
        ${fadeState === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100'}
      `}
    >
      {/* Background Soft Atmospheric Glows */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none -top-20 -left-20" />
      <div className="absolute w-[450px] h-[450px] rounded-full bg-blue-600/10 blur-[130px] pointer-events-none -bottom-20 -right-20" />

      {/* Main Glass Icon Container */}
      <div className="relative mb-6">
        {/* Pulsing ring */}
        <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-cyan-500/30 to-blue-600/30 blur-xl animate-pulse" />

        <div className="relative w-24 h-24 rounded-3xl overflow-hidden bg-slate-900/90 border border-cyan-400/40 shadow-[0_0_35px_rgba(6,182,212,0.4)] backdrop-blur-2xl flex items-center justify-center p-1">
          <img
            src="./app-logo.jpg"
            alt="DCE College Bus Logo"
            className="w-full h-full object-cover rounded-2xl"
          />
          {/* Live indicator dot */}
          <span className="absolute top-2 right-2 w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_#10B981] animate-ping" />
        </div>
      </div>

      {/* Typography */}
      <div className="text-center px-4">
        <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white uppercase font-sans">
          DHANALAKSHMI COLLEGE OF ENGINEERING
        </h1>
        <h2 className="text-sm sm:text-base font-semibold tracking-[0.25em] text-cyan-400 uppercase mt-0.5 font-mono">
          DCE BUS TRACKER
        </h2>
        <p className="text-xs text-slate-400 mt-2 font-medium">
          Official Real-Time Campus Transit OS • Chennai, Tamil Nadu
        </p>
      </div>

      {/* Subtle Loading Bar */}
      <div className="w-48 h-1 bg-white/10 rounded-full mt-8 overflow-hidden relative">
        <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full w-1/2 animate-[shimmer_1.4s_infinite_ease-in-out]" />
      </div>
    </div>
  );
};
