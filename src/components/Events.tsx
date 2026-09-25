import React, { useState, useEffect, useRef } from 'react';
import { getStoredEvents } from '../data/eventsData';
import type { EventItem } from '../types';
import { 
  Flag, ShieldAlert, Bug, HelpCircle, MessageSquare, FileText, 
  ArrowRight, Sparkles, Terminal, Cpu, Layers, Lock, ShieldCheck 
} from 'lucide-react';
import { sound } from '../utils/audio';
import { gsap } from '../utils/gsapSetup';

interface EventsProps {
  onSelectEvent: (event: EventItem) => void;
  onRegisterEvent: (eventId: string) => void;
}

export const Events: React.FC<EventsProps> = ({ onSelectEvent, onRegisterEvent }) => {
  const [eventsList, setEventsList] = useState<EventItem[]>(() => getStoredEvents());
  const [trackFilter, setTrackFilter] = useState<'All' | 'Technical' | 'Non-Technical'>('All');

  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEventsUpdate = () => {
      setEventsList(getStoredEvents());
    };
    window.addEventListener('systech_events_updated', handleEventsUpdate);
    return () => window.removeEventListener('systech_events_updated', handleEventsUpdate);
  }, []);

  // Multi-directional entrance animations with GSAP ScrollTrigger
  useEffect(() => {
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) return;

    const ctx = gsap.context(() => {
      const cards = gridRef.current?.querySelectorAll('.hud-event-card');
      if (cards && cards.length) {
        cards.forEach((card, idx) => {
          // Multi-directional directions:
          // Card 0: from left
          // Card 1: from right
          // Card 2: from bottom
          // Card 3: from top
          // Card 4: from bottom-left
          // Card 5: from bottom-right
          let initialX = 0;
          let initialY = 0;
          const mod = idx % 4;
          if (mod === 0) initialX = -120;
          else if (mod === 1) initialX = 120;
          else if (mod === 2) initialY = 120;
          else if (mod === 3) initialY = -120;

          gsap.fromTo(
            card,
            {
              x: initialX,
              y: initialY,
              opacity: 0,
              scale: 0.85,
            },
            {
              x: 0,
              y: 0,
              opacity: 1,
              scale: 1,
              duration: 0.9,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: card,
                start: 'top 88%',
                toggleActions: 'play none none reverse',
              },
            }
          );
        });
      }
    }, gridRef);

    return () => ctx.revert();
  }, [eventsList, trackFilter]);

  const renderIcon = (iconName: string, className: string = 'w-6 h-6') => {
    switch (iconName) {
      case 'Flag':
        return <Flag className={className} />;
      case 'ShieldAlert':
        return <ShieldAlert className={className} />;
      case 'Bug':
        return <Bug className={className} />;
      case 'HelpCircle':
        return <HelpCircle className={className} />;
      case 'MessageSquare':
        return <MessageSquare className={className} />;
      case 'FileText':
        return <FileText className={className} />;
      case 'Lock':
        return <Lock className={className} />;
      case 'ShieldCheck':
        return <ShieldCheck className={className} />;
      default:
        return <Terminal className={className} />;
    }
  };

  const filteredEvents = trackFilter === 'All' 
    ? eventsList 
    : eventsList.filter(evt => evt.track === trackFilter);

  return (
    <section
      id="events"
      ref={sectionRef}
      className="relative py-28 sm:py-36 overflow-hidden bg-[#02040a] border-t border-cyber-cyan/15 perspective-1000"
    >
      {/* Background Cyan Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[550px] bg-cyber-cyan/8 rounded-full blur-[170px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col items-center text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan font-mono text-xs tracking-widest mb-4 hud-bracket">
            <Sparkles className="w-3.5 h-3.5" />
            <span>EVENT SECTORS // COMPETITIONS</span>
          </div>

          <h2 className="font-orbitron font-extrabold text-3xl sm:text-4xl md:text-5xl text-white tracking-tight mb-4">
            CHALLENGE THE <span className="text-cyber-cyan text-glow-cyan">CYBER MATRIX</span>
          </h2>

          <p className="max-w-2xl text-slate-400 text-sm sm:text-base font-sans">
            Choose your proving ground between high-stakes technical exploit war-games, 
            cryptographic cryptanalysis, and strategic cyber defense.
          </p>

          {/* Filter Track Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8 p-1.5 rounded-2xl bg-[#040915]/90 border border-cyber-cyan/30 backdrop-blur-xl shadow-lg">
            <button
              onClick={() => {
                sound.playClick();
                setTrackFilter('All');
              }}
              className={`px-5 py-2 rounded-xl font-mono text-xs tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                trackFilter === 'All'
                  ? 'bg-gradient-to-r from-cyber-cyan to-blue-500 text-black font-bold shadow-neon-cyan'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>ALL EVENTS</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                trackFilter === 'All' ? 'bg-black/20 text-black' : 'bg-white/10 text-slate-400'
              }`}>
                {eventsList.length}
              </span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setTrackFilter('Technical');
              }}
              className={`px-5 py-2 rounded-xl font-mono text-xs tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                trackFilter === 'Technical'
                  ? 'bg-gradient-to-r from-cyber-cyan to-blue-500 text-black font-bold shadow-neon-cyan'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>TECHNICAL</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setTrackFilter('Non-Technical');
              }}
              className={`px-5 py-2 rounded-xl font-mono text-xs tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                trackFilter === 'Non-Technical'
                  ? 'bg-gradient-to-r from-cyber-cyan to-blue-500 text-black font-bold shadow-neon-cyan'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>NON-TECHNICAL</span>
            </button>
          </div>
        </div>

        {/* Events Grid or Empty State */}
        {filteredEvents.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center p-8 sm:p-12 rounded-3xl bg-[#040915]/70 border border-cyber-cyan/20 max-w-xl mx-auto hud-bracket">
            <ShieldAlert className="w-12 h-12 text-cyber-cyan/50 mb-4 animate-pulse" />
            <h3 className="font-orbitron font-bold text-xl text-white mb-2">NO EVENTS CONFIGURED</h3>
            <p className="text-slate-400 text-xs sm:text-sm font-sans max-w-md mb-6">
              No active symposium sectors have been deployed in the grid yet. Administrators can configure operations via the Command Center.
            </p>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan font-mono text-xs">
              <Terminal className="w-3.5 h-3.5" />
              <span>AWAITING ADMIN EVENT INGESTION</span>
            </div>
          </div>
        ) : (
          <div
            ref={gridRef}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 transform-style-3d"
          >
            {filteredEvents.map((evt, idx) => (
              <div
                key={evt.id || idx}
                onClick={() => {
                  sound.playClick();
                  onSelectEvent(evt);
                }}
                onMouseEnter={() => sound.playTerminalBlip()}
                className="hud-event-card group relative p-6 sm:p-7 rounded-3xl bg-[#040915]/90 border border-cyber-cyan/20 hover:border-cyber-cyan/60 backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_12px_36px_rgba(0,240,255,0.25)] flex flex-col justify-between cursor-pointer hud-bracket will-change-transform"
              >
                <div>
                  {/* Header: Event Number & Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="font-orbitron font-black text-2xl sm:text-3xl text-cyber-cyan/40 group-hover:text-cyber-cyan transition-colors">
                      {evt.number || `0${idx + 1}`}
                    </span>

                    <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border border-emerald-400/30 bg-emerald-400/10 text-emerald-400">
                      STATUS: ACTIVE
                    </span>
                  </div>

                  {/* Event Icon & Title */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-cyber-900 border border-cyber-cyan/30 flex items-center justify-center text-cyber-cyan group-hover:scale-110 group-hover:border-cyber-cyan group-hover:shadow-neon-cyan transition-all duration-300">
                      {renderIcon(evt.iconName, 'w-5 h-5')}
                    </div>
                    <h3 className="font-orbitron font-bold text-lg sm:text-xl text-white group-hover:text-cyber-cyan transition-colors">
                      {evt.name}
                    </h3>
                  </div>

                  {/* Short Description */}
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6 line-clamp-3">
                    {evt.description}
                  </p>

                  {/* Prize Pool Tag */}
                  {evt.prizePool && (
                    <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyber-900 border border-cyber-cyan/20 text-cyber-cyan text-xs font-mono font-bold">
                      <span>BOUNTY:</span>
                      <span className="text-white">{evt.prizePool}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Actions: Explore & Register */}
                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="font-mono text-xs text-cyber-cyan font-bold flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
                    <span>EXPLORE INTEL</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      sound.playClick();
                      onRegisterEvent(evt.id);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-cyber-cyan/15 hover:bg-cyber-cyan hover:text-black text-cyber-cyan border border-cyber-cyan/30 font-mono text-xs font-bold transition-colors cursor-pointer"
                  >
                    REGISTER
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
};

export default Events;
