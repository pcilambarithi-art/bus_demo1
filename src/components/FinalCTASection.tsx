import React, { useEffect, useRef } from 'react';
import { Sparkles, Terminal, Shield, Lock, ChevronRight } from 'lucide-react';
import { sound } from '../utils/audio';
import { gsap } from '../utils/gsapSetup';

interface FinalCTAProps {
  onOpenRegister: () => void;
}

export const FinalCTASection: React.FC<FinalCTAProps> = ({ onOpenRegister }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const leftBracketRef = useRef<HTMLDivElement>(null);
  const rightBracketRef = useRef<HTMLDivElement>(null);
  const centerContentRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) return;

    const ctx = gsap.context(() => {
      // Brackets converge from sides as user scrolls into this section
      if (leftBracketRef.current && rightBracketRef.current) {
        gsap.fromTo(
          leftBracketRef.current,
          { x: -140, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 80%',
              end: 'top 30%',
              scrub: 1,
            },
          }
        );

        gsap.fromTo(
          rightBracketRef.current,
          { x: 140, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 80%',
              end: 'top 30%',
              scrub: 1,
            },
          }
        );
      }

      // Center scale entrance
      if (centerContentRef.current) {
        gsap.fromTo(
          centerContentRef.current,
          { scale: 0.85, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 75%',
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-32 sm:py-44 bg-[#02040a] overflow-hidden border-t border-cyber-cyan/20 perspective-1000"
    >
      {/* Background Converging Radar Rings */}
      <div
        ref={ringRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] sm:w-[900px] sm:h-[900px] rounded-full border border-cyber-cyan/15 pointer-events-none animate-spin"
        style={{ animationDuration: '40s' }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] sm:w-[650px] sm:h-[650px] rounded-full border border-cyber-violet/20 pointer-events-none animate-spin"
        style={{ animationDuration: '25s', animationDirection: 'reverse' }}
      />

      {/* Background Central Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyber-cyan/10 rounded-full blur-[180px] pointer-events-none" />

      {/* Converging Outer Decorative Bracket Graphics */}
      <div
        ref={leftBracketRef}
        className="hidden lg:flex flex-col items-center justify-center absolute left-12 top-1/2 -translate-y-1/2 font-mono text-cyber-cyan/30 text-8xl font-thin select-none pointer-events-none will-change-transform"
      >
        <span>[</span>
        <span className="text-[10px] tracking-widest uppercase text-slate-500 mt-2">GRID_BOUND_L</span>
      </div>

      <div
        ref={rightBracketRef}
        className="hidden lg:flex flex-col items-center justify-center absolute right-12 top-1/2 -translate-y-1/2 font-mono text-cyber-cyan/30 text-8xl font-thin select-none pointer-events-none will-change-transform"
      >
        <span>]</span>
        <span className="text-[10px] tracking-widest uppercase text-slate-500 mt-2">GRID_BOUND_R</span>
      </div>

      {/* Main Content */}
      <div
        ref={centerContentRef}
        className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 text-center will-change-transform"
      >
        {/* Top Terminal Status Tag */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan font-mono text-xs tracking-widest mb-6 hud-bracket shadow-neon-cyan">
          <Terminal className="w-3.5 h-3.5 animate-pulse" />
          <span>ACCESS TERMINAL // FINAL PROTOCOL</span>
        </div>

        {/* Big Climax Typography */}
        <h2 className="font-orbitron font-black text-5xl sm:text-7xl md:text-8xl tracking-tight text-white mb-4 select-none leading-none">
          ENTER THE
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyber-cyan via-blue-400 to-cyber-violet drop-shadow-[0_0_50px_rgba(0,240,255,0.7)]">
            GRID.
          </span>
        </h2>

        <p className="font-rajdhani font-bold text-xl sm:text-2xl text-cyber-cyan tracking-wider uppercase mb-6">
          REGISTER FOR SYSTECH 2K27
        </p>

        <p className="max-w-2xl mx-auto text-slate-300 font-sans text-sm sm:text-base leading-relaxed mb-10">
          Limited operative allocations available. Claim your digital credentials, assemble your squadron, 
          and prepare for the premier national cybersecurity tournament of the year.
        </p>

        {/* Big Interactive Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => {
              sound.playClick();
              onOpenRegister();
            }}
            onMouseEnter={() => sound.playTerminalBlip()}
            className="group relative px-12 py-5 rounded-2xl bg-gradient-to-r from-cyber-cyan via-blue-500 to-cyber-violet text-black font-mono font-black text-base tracking-widest shadow-[0_0_35px_rgba(0,240,255,0.6)] hover:shadow-[0_0_60px_rgba(0,240,255,0.95)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer hud-bracket"
          >
            <Sparkles className="w-5 h-5 text-black group-hover:rotate-12 transition-transform" />
            <span>REGISTER NOW</span>
            <ChevronRight className="w-5 h-5 text-black group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Bottom Security Seals */}
        <div className="mt-14 pt-8 border-t border-white/10 flex flex-wrap items-center justify-center gap-8 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-cyber-cyan" />
            <span>AIR-GAPPED COMPLIANT</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>END-TO-END ENCRYPTED PASSES</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>FREE ADMISSION • SPONSORED CLEARANCE</span>
          </div>
        </div>

      </div>
    </section>
  );
};

export default FinalCTASection;
