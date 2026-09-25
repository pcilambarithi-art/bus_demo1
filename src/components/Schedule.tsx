import React, { useState, useEffect, useRef } from 'react';
import { SCHEDULE_DATA } from '../data/eventsData';
import { Clock, MapPin, Terminal } from 'lucide-react';
import { sound } from '../utils/audio';
import { gsap } from '../utils/gsapSetup';

export const Schedule: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<'All' | 'Briefing' | 'Round 1' | 'Finals' | 'Valedictory'>('All');

  const sectionRef = useRef<HTMLElement>(null);
  const lineProgressRef = useRef<HTMLDivElement>(null);
  const itemsContainerRef = useRef<HTMLDivElement>(null);

  const filteredSchedule = activeFilter === 'All'
    ? SCHEDULE_DATA
    : SCHEDULE_DATA.filter(item => item.category === activeFilter);

  // Progressive Scroll Activation with GSAP ScrollTrigger
  useEffect(() => {
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) return;

    const ctx = gsap.context(() => {
      // Timeline center neon line fills as user scrolls down
      if (lineProgressRef.current && sectionRef.current) {
        gsap.fromTo(
          lineProgressRef.current,
          { height: '0%' },
          {
            height: '100%',
            ease: 'none',
            scrollTrigger: {
              trigger: itemsContainerRef.current,
              start: 'top 70%',
              end: 'bottom 80%',
              scrub: 1,
            },
          }
        );
      }

      // Schedule cards entrance from alternating sides
      const items = itemsContainerRef.current?.querySelectorAll('.timeline-item-card');
      items?.forEach((card, idx) => {
        const fromX = idx % 2 === 0 ? -70 : 70;
        gsap.fromTo(
          card,
          {
            x: fromX,
            opacity: 0,
            scale: 0.9,
          },
          {
            x: 0,
            opacity: 1,
            scale: 1,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [filteredSchedule]);

  return (
    <section
      id="schedule"
      ref={sectionRef}
      className="relative py-28 sm:py-36 bg-[#02040a] overflow-hidden border-t border-cyber-cyan/15 perspective-1000"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/3 w-[650px] h-[650px] bg-cyber-cyan/6 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col items-center text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/25 text-cyber-cyan font-mono text-xs tracking-widest mb-4 hud-bracket">
            <Clock className="w-3.5 h-3.5" />
            <span>CHRONOLOGICAL MATRIX // TIMELINE</span>
          </div>

          <h2 className="font-orbitron font-extrabold text-3xl sm:text-4xl md:text-5xl text-white tracking-tight mb-4">
            TACTICAL <span className="text-cyber-cyan text-glow-cyan">ITINERARY</span>
          </h2>

          <p className="max-w-2xl text-slate-400 text-sm sm:text-base font-sans">
            Strict synchronization protocols apply. All operations commence promptly at designated UTC+05:30 time codes.
          </p>

          {/* Schedule Category Filters */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8 p-1.5 rounded-2xl bg-[#040915]/90 border border-cyber-cyan/25 backdrop-blur-md">
            {(['All', 'Briefing', 'Round 1', 'Finals', 'Valedictory'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  sound.playClick();
                  setActiveFilter(cat);
                }}
                className={`px-4 py-1.5 rounded-xl font-mono text-xs tracking-wider transition-all duration-300 cursor-pointer ${
                  activeFilter === cat
                    ? 'bg-cyber-cyan text-black font-bold shadow-neon-cyan'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Futuristic Timeline Spine */}
        <div ref={itemsContainerRef} className="relative">
          
          {/* Base Inactive Conduit Spine */}
          <div className="absolute left-4 md:left-1/2 top-4 bottom-4 -translate-x-1/2 w-1 bg-cyber-900 border-x border-white/5 hidden sm:block" />

          {/* Glowing Active Power Conduit Drawing on Scroll */}
          <div
            ref={lineProgressRef}
            className="absolute left-4 md:left-1/2 top-4 -translate-x-1/2 w-1 bg-gradient-to-b from-cyber-cyan via-blue-500 to-cyber-violet shadow-[0_0_15px_rgba(0,240,255,0.8)] hidden sm:block will-change-[height]"
          />

          {/* Timeline Items */}
          <div className="space-y-8 sm:space-y-12">
            {filteredSchedule.map((item, idx) => {
              const isEven = idx % 2 === 0;
              return (
                <div
                  key={idx}
                  onMouseEnter={() => sound.playTerminalBlip()}
                  className={`relative flex flex-col sm:flex-row items-center gap-6 sm:gap-12 ${
                    isEven ? 'sm:flex-row-reverse' : ''
                  }`}
                >
                  {/* Content Glass Card */}
                  <div className="w-full sm:w-1/2">
                    <div className={`timeline-item-card p-6 sm:p-7 rounded-3xl bg-[#040915]/90 border border-cyber-cyan/20 hover:border-cyber-cyan/55 backdrop-blur-xl transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,240,255,0.18)] group hud-bracket ${
                      isEven ? 'sm:text-right' : 'sm:text-left'
                    }`}>
                      {/* Top Phase Header */}
                      <div className={`flex flex-wrap items-center gap-2 mb-2 ${
                        isEven ? 'sm:justify-end' : 'sm:justify-start'
                      }`}>
                        <span className="px-2.5 py-0.5 rounded bg-cyber-cyan/15 text-cyber-cyan font-mono text-[11px] font-bold border border-cyber-cyan/30">
                          {item.phase}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/5 text-slate-400 font-mono text-[10px] uppercase">
                          {item.category}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-orbitron font-bold text-lg sm:text-xl text-white group-hover:text-cyber-cyan transition-colors mb-2">
                        {item.title}
                      </h3>

                      {/* Description */}
                      <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-4">
                        {item.description}
                      </p>

                      {/* Time & Venue meta tags */}
                      <div className={`flex flex-wrap items-center gap-4 text-xs font-mono text-slate-300 ${
                        isEven ? 'sm:justify-end' : 'sm:justify-start'
                      }`}>
                        <div className="flex items-center gap-1.5 text-cyber-cyan">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{item.time}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-rose-400" />
                          <span className="truncate max-w-[200px]">{item.venue}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Center Timeline Node Marker */}
                  <div className="hidden sm:flex absolute left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-cyber-950 border-2 border-cyber-cyan items-center justify-center shadow-neon-cyan z-10">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyber-cyan animate-pulse" />
                  </div>

                  {/* Empty side for balanced spacing */}
                  <div className="hidden sm:block w-1/2" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Sync Prompt */}
        <div className="mt-14 flex items-center justify-center gap-2 font-mono text-xs text-slate-500">
          <Terminal className="w-3.5 h-3.5 text-cyber-cyan" />
          <span>ALL UTC+05:30 TIME NODES SYNCHRONIZED ACROSS LOCAL ENCLAVES</span>
        </div>

      </div>
    </section>
  );
};

export default Schedule;
