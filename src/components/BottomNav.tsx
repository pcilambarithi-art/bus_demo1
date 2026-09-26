import React from 'react';
import { useBus } from '../context/BusContext';
import { Home, Navigation, Map, User, Volume2, VolumeX } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, isSoundMuted, toggleSound } = useBus();

  return (
    <div className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-md lg:hidden pointer-events-auto">
      <nav
        className={`
          relative flex items-center justify-around px-1 sm:px-2 py-1 sm:py-1.5 rounded-full
          backdrop-blur-[24px] -webkit-backdrop-blur-[24px]
          dark:bg-[rgba(10,18,36,0.92)] bg-[rgba(255,255,255,0.92)]
          dark:border-[rgba(255,255,255,0.16)] border-[rgba(255,255,255,0.7)]
          border shadow-[0_16px_40px_rgba(0,0,0,0.4)]
        `}
      >
        {/* Specular highlight border on top */}
        <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />

        {/* Tab 1: Home */}
        <button
          onClick={() => setActiveTab('home')}
          className={`
            relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl sm:rounded-2xl
            transition-all duration-300 ease-out select-none
            ${activeTab === 'home' ? 'text-cyan-400 font-bold' : 'text-slate-400 dark:text-slate-400 hover:text-slate-200'}
          `}
        >
          {activeTab === 'home' && (
            <div className="absolute inset-0 rounded-full dark:bg-cyan-500/15 bg-cyan-100 border border-cyan-400/30 shadow-[0_0_20px_rgba(6,182,212,0.35)] -z-10 animate-[scaleIn_0.2s_ease-out]" />
          )}
          <Home className={`w-4 h-4 sm:w-5 sm:h-5 ${activeTab === 'home' ? 'stroke-[2.5] text-cyan-500 dark:text-cyan-400' : 'stroke-[1.8]'}`} />
          <span className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 ${activeTab === 'home' ? 'opacity-100 font-semibold' : 'opacity-70 font-normal'}`}>
            Home
          </span>
        </button>

        {/* Tab 2: Live */}
        <button
          onClick={() => setActiveTab('live')}
          className={`
            relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl sm:rounded-2xl
            transition-all duration-300 ease-out select-none
            ${activeTab === 'live' ? 'text-cyan-400 font-bold' : 'text-slate-400 dark:text-slate-400 hover:text-slate-200'}
          `}
        >
          {activeTab === 'live' && (
            <div className="absolute inset-0 rounded-full dark:bg-cyan-500/15 bg-cyan-100 border border-cyan-400/30 shadow-[0_0_20px_rgba(6,182,212,0.35)] -z-10 animate-[scaleIn_0.2s_ease-out]" />
          )}
          <Navigation className={`w-4 h-4 sm:w-5 sm:h-5 ${activeTab === 'live' ? 'stroke-[2.5] text-cyan-500 dark:text-cyan-400' : 'stroke-[1.8]'}`} />
          <span className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 ${activeTab === 'live' ? 'opacity-100 font-semibold' : 'opacity-70 font-normal'}`}>
            Live
          </span>
        </button>

        {/* Central Audio Mute/Unmute Quick Toggle (Mobile thumb-reachable) */}
        <button
          onClick={toggleSound}
          className={`
            relative flex flex-col items-center justify-center py-1 px-2 sm:px-2.5 rounded-xl sm:rounded-2xl mx-0.5
            transition-all duration-200 ease-out select-none active:scale-90 border shrink-0
            ${
              isSoundMuted
                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
                : 'bg-cyan-500/15 text-cyan-400 border-cyan-400/35 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
            }
          `}
          title={isSoundMuted ? 'Unmute Audio & Voice' : 'Mute Audio & Voice'}
          aria-label={isSoundMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          <div className="transition-transform duration-200">
            {isSoundMuted ? (
              <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2] text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2] text-cyan-400 animate-pulse" />
            )}
          </div>
          <span className="text-[8px] sm:text-[9px] font-bold tracking-tight mt-0.5 whitespace-nowrap">
            {isSoundMuted ? 'Muted' : 'Sound'}
          </span>
        </button>

        {/* Tab 3: Route */}
        <button
          onClick={() => setActiveTab('route')}
          className={`
            relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl sm:rounded-2xl
            transition-all duration-300 ease-out select-none
            ${activeTab === 'route' ? 'text-cyan-400 font-bold' : 'text-slate-400 dark:text-slate-400 hover:text-slate-200'}
          `}
        >
          {activeTab === 'route' && (
            <div className="absolute inset-0 rounded-full dark:bg-cyan-500/15 bg-cyan-100 border border-cyan-400/30 shadow-[0_0_20px_rgba(6,182,212,0.35)] -z-10 animate-[scaleIn_0.2s_ease-out]" />
          )}
          <Map className={`w-4 h-4 sm:w-5 sm:h-5 ${activeTab === 'route' ? 'stroke-[2.5] text-cyan-500 dark:text-cyan-400' : 'stroke-[1.8]'}`} />
          <span className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 ${activeTab === 'route' ? 'opacity-100 font-semibold' : 'opacity-70 font-normal'}`}>
            Route
          </span>
        </button>

        {/* Tab 4: Profile */}
        <button
          onClick={() => setActiveTab('profile')}
          className={`
            relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl sm:rounded-2xl
            transition-all duration-300 ease-out select-none
            ${activeTab === 'profile' ? 'text-cyan-400 font-bold' : 'text-slate-400 dark:text-slate-400 hover:text-slate-200'}
          `}
        >
          {activeTab === 'profile' && (
            <div className="absolute inset-0 rounded-full dark:bg-cyan-500/15 bg-cyan-100 border border-cyan-400/30 shadow-[0_0_20px_rgba(6,182,212,0.35)] -z-10 animate-[scaleIn_0.2s_ease-out]" />
          )}
          <User className={`w-4 h-4 sm:w-5 sm:h-5 ${activeTab === 'profile' ? 'stroke-[2.5] text-cyan-500 dark:text-cyan-400' : 'stroke-[1.8]'}`} />
          <span className={`text-[9px] sm:text-[10px] tracking-tight mt-0.5 ${activeTab === 'profile' ? 'opacity-100 font-semibold' : 'opacity-70 font-normal'}`}>
            Profile
          </span>
        </button>
      </nav>
    </div>
  );
};

