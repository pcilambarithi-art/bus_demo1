import React, { useState, useEffect, useRef } from 'react';
import { Compass, ShieldAlert, ChevronDown, Sparkles, Terminal } from 'lucide-react';
import { sound } from '../utils/audio';
import { gsap } from '../utils/gsapSetup';

interface HeroProps {
  onExploreEvents: () => void;
  onOpenRegister: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExploreEvents, onOpenRegister }) => {
  const heroRef = useRef<HTMLElement>(null);
  const titleContainerRef = useRef<HTMLDivElement>(null);
  const titleMainRef = useRef<HTMLHeadingElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const countdownRef = useRef<HTMLDivElement>(null);

  const [timeLeft, setTimeLeft] = useState({
    days: 42,
    hours: 14,
    minutes: 36,
    seconds: 18,
  });

  // Countdown timer calculation
  useEffect(() => {
    const targetDate = new Date('2027-03-15T09:00:00').getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // GSAP ScrollTrigger Scrub Timeline for Hero
  useEffect(() => {
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) return;

    const ctx = gsap.context(() => {
      // Pinned/Scrubbed master timeline for Hero
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: '+=130%',
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      // 0% -> 20%: Badge & Countdown fade out slightly, Title begins scale down
      tl.to([badgeRef.current, countdownRef.current], {
        opacity: 0,
        y: -30,
        duration: 0.2,
        ease: 'power2.inOut',
      }, 0);

      // 0% -> 40%: Typography scales and moves upward
      tl.to(titleMainRef.current, {
        scale: 0.85,
        yPercent: -18,
        duration: 0.4,
        ease: 'power1.inOut',
      }, 0);

      // 40% -> 60%: Letters separate and distort with perspective
      tl.to(titleMainRef.current, {
        letterSpacing: '0.12em',
        rotateX: 18,
        scale: 0.72,
        yPercent: -35,
        duration: 0.3,
        ease: 'power2.inOut',
      }, 0.3);

      // 60% -> 100%: Entire hero moves into background depth with blur and fade
      tl.to(heroContentRef.current, {
        opacity: 0,
        scale: 0.55,
        yPercent: -50,
        filter: 'blur(10px)',
        duration: 0.4,
        ease: 'power2.in',
      }, 0.6);

    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="home"
      ref={heroRef}
      className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-transparent pt-28 pb-12 perspective-1000"
    >
      {/* Background Ambient Glow Accents */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-cyber-blue/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-cyber-violet/12 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-cyber-cyan/12 rounded-full blur-[150px] pointer-events-none" />

      {/* Main Hero Stage */}
      <div
        ref={heroContentRef}
        className="max-w-6xl mx-auto w-full px-4 sm:px-6 my-auto z-10 py-6 sm:py-10 transform-style-3d will-change-transform"
      >
        <div className="flex flex-col items-center text-center">
          
          {/* Holographic Badge */}
          <div
            ref={badgeRef}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan font-mono text-xs tracking-widest mb-6 shadow-[0_0_20px_rgba(0,240,255,0.2)] hud-bracket"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-cyber-cyan animate-pulse" />
            <span>NATIONAL LEVEL CYBERSECURITY SYMPOSIUM</span>
          </div>

          {/* Dominant Typographic Title: CYSTECH 2K27 */}
          <div ref={titleContainerRef} className="transform-style-3d">
            <h1
              ref={titleMainRef}
              className="font-orbitron font-black text-6xl sm:text-7xl md:text-9xl lg:text-[11rem] tracking-tight leading-none mb-4 text-white select-none transition-none will-change-transform"
            >
              CYSTECH
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyber-cyan via-blue-400 to-cyber-violet drop-shadow-[0_0_50px_rgba(0,240,255,0.6)]">
                2K27
              </span>
            </h1>
          </div>

          {/* Suggested Tagline */}
          <p className="font-rajdhani font-bold text-xl sm:text-2xl md:text-4xl text-cyber-cyan tracking-wider uppercase mb-6 flex items-center justify-center gap-3">
            <span className="w-8 sm:w-16 h-0.5 bg-gradient-to-r from-transparent to-cyber-cyan hidden sm:inline-block" />
            “ENTER THE GRID. BREAK THE LIMITS.”
            <span className="w-8 sm:w-16 h-0.5 bg-gradient-to-l from-transparent to-cyber-cyan hidden sm:inline-block" />
          </p>

          <p className="max-w-2xl text-slate-300 font-sans text-sm sm:text-base md:text-lg leading-relaxed mb-10">
            A high-stakes operational proving ground for ethical hackers, cryptographic analysts, and digital defense architects. 
            Engage across live CTF sieges, 0-day audits, deep-tech research defenses, and algorithmic debates.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-10">
            <button
              onClick={() => {
                sound.playClick();
                onOpenRegister();
              }}
              onMouseEnter={() => sound.playTerminalBlip()}
              className="w-full sm:w-auto px-9 py-4 rounded-xl bg-gradient-to-r from-cyber-cyan via-blue-500 to-cyber-violet text-black font-mono font-bold text-sm tracking-widest shadow-neon-cyan hover:shadow-[0_0_35px_rgba(0,240,255,0.85)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2.5 group cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-black group-hover:rotate-12 transition-transform" />
              <span>REGISTER NOW</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                onExploreEvents();
              }}
              onMouseEnter={() => sound.playTerminalBlip()}
              className="w-full sm:w-auto px-9 py-4 rounded-xl bg-cyber-900/90 border border-cyber-cyan/30 text-white hover:text-cyber-cyan hover:border-cyber-cyan hover:bg-cyber-850 font-mono font-bold text-sm tracking-widest transition-all duration-300 flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer shadow-lg hover:shadow-neon-cyan"
            >
              <Compass className="w-4 h-4 text-cyber-cyan" />
              <span>EXPLORE EVENTS</span>
            </button>
          </div>

          {/* Live Symposium Countdown Display */}
          <div
            ref={countdownRef}
            className="pt-6 border-t border-cyber-cyan/15 w-full max-w-lg"
          >
            <div className="flex items-center justify-center gap-2 mb-3 text-[11px] font-mono text-slate-400 tracking-widest uppercase">
              <Terminal className="w-3.5 h-3.5 text-cyber-cyan" />
              <span>GRID INFILTRATION COUNTDOWN:</span>
            </div>
            <div className="grid grid-cols-4 gap-3 sm:gap-4 max-w-md mx-auto">
              {[
                { label: 'DAYS', value: timeLeft.days },
                { label: 'HOURS', value: timeLeft.hours },
                { label: 'MINUTES', value: timeLeft.minutes },
                { label: 'SECONDS', value: timeLeft.seconds },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center justify-center p-2.5 sm:p-3.5 rounded-xl bg-cyber-900/80 border border-cyber-cyan/20 backdrop-blur-md shadow-inner hud-bracket"
                >
                  <span className="font-orbitron font-bold text-xl sm:text-2xl md:text-3xl text-cyber-cyan">
                    {String(item.value).padStart(2, '0')}
                  </span>
                  <span className="font-mono text-[9px] sm:text-[10px] text-slate-400 tracking-wider mt-0.5">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Scroll Indicator */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 z-10 pt-2 flex flex-col items-center justify-center">
        <button
          onClick={() => {
            sound.playClick();
            onExploreEvents();
          }}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-cyber-cyan transition-colors duration-300 font-mono text-[10px] tracking-widest cursor-pointer"
        >
          <span>SCROLL TO ENGAGE DEFENSE PROTOCOLS</span>
          <ChevronDown className="w-4 h-4 animate-bounce text-cyber-cyan" />
        </button>
      </div>
    </section>
  );
};

export default Hero;
