import React, { useEffect, useRef } from 'react';
import { Shield, Target, Award, Users, Cpu, Lock, Terminal, Zap } from 'lucide-react';
import { sound } from '../utils/audio';
import { gsap } from '../utils/gsapSetup';

export const About: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const wordDefendRef = useRef<HTMLHeadingElement>(null);
  const wordDiscoverRef = useRef<HTMLHeadingElement>(null);
  const wordDisruptRef = useRef<HTMLHeadingElement>(null);
  const quoteRef = useRef<HTMLDivElement>(null);

  const stats = [
    { label: 'PARTICIPANTS', value: '500+', desc: 'Cyber operatives from across the country', icon: Users },
    { label: 'EVENTS', value: '10+', desc: 'Challenging tracks across offense & defense', icon: Target },
    { label: 'COLLEGES', value: 'Multiple Colleges', desc: 'Premier institutions & universities', icon: Cpu },
    { label: 'EXPERIENCE', value: '1 Epic', desc: 'Futuristic cybersecurity convergence', icon: Award },
  ];

  const pillars = [
    {
      icon: Terminal,
      title: 'Live Cyber Range',
      desc: 'Engage on realistic air-gapped simulated networks, exploiting hardened multi-cloud nodes, zero-days, and active defense perimeters.',
    },
    {
      icon: Lock,
      title: 'Post-Quantum & Cryptography',
      desc: 'Decode next-generation lattice cryptography, reverse engineer custom binary ciphers, and defend high-value infrastructure targets.',
    },
    {
      icon: Zap,
      title: 'High-Stakes Bounties',
      desc: 'Compete for substantial cash prize bounties, specialized hardware gadgets, certified badges of honor, and industry talent recruitment.',
    },
    {
      icon: Shield,
      title: 'Elite Threat Intelligence',
      desc: 'Connect with seasoned Red Team operatives, security researchers, forensics investigators, and renowned academic leaders.',
    },
  ];

  // Differential Kinetic Parallax on DEFEND. DISCOVER. DISRUPT.
  useEffect(() => {
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) return;

    const ctx = gsap.context(() => {
      // Word 1: DEFEND moves left-to-right
      if (wordDefendRef.current) {
        gsap.fromTo(
          wordDefendRef.current,
          { x: -120 },
          {
            x: 80,
            ease: 'none',
            scrollTrigger: {
              trigger: wordDefendRef.current,
              start: 'top 90%',
              end: 'bottom 20%',
              scrub: 1.5,
            },
          }
        );
      }

      // Word 2: DISCOVER moves right-to-left
      if (wordDiscoverRef.current) {
        gsap.fromTo(
          wordDiscoverRef.current,
          { x: 120 },
          {
            x: -80,
            ease: 'none',
            scrollTrigger: {
              trigger: wordDiscoverRef.current,
              start: 'top 90%',
              end: 'bottom 20%',
              scrub: 1.8,
            },
          }
        );
      }

      // Word 3: DISRUPT moves left-to-right faster
      if (wordDisruptRef.current) {
        gsap.fromTo(
          wordDisruptRef.current,
          { x: -150 },
          {
            x: 100,
            ease: 'none',
            scrollTrigger: {
              trigger: wordDisruptRef.current,
              start: 'top 90%',
              end: 'bottom 20%',
              scrub: 2,
            },
          }
        );
      }

      // Quote parallax scale
      if (quoteRef.current) {
        gsap.from(quoteRef.current, {
          scale: 0.9,
          opacity: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: quoteRef.current,
            start: 'top 85%',
          },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="about"
      ref={sectionRef}
      className="relative py-28 sm:py-36 bg-[#02040a] overflow-hidden border-t border-cyber-cyan/15 perspective-1000"
    >
      {/* Background glow */}
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-cyber-violet/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[550px] h-[550px] bg-cyber-cyan/8 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        
        {/* KINETIC TYPOGRAPHY PARALLAX HERO BLOCK */}
        <div className="py-12 sm:py-20 flex flex-col items-center justify-center text-center overflow-hidden select-none">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyber-violet/15 border border-cyber-violet/35 text-cyber-violet font-mono text-xs tracking-widest mb-8 hud-bracket">
            <Shield className="w-3.5 h-3.5" />
            <span>OPERATIONAL DOCTRINE // MANIFESTO</span>
          </div>

          <div className="space-y-1 sm:space-y-3 font-orbitron font-black text-6xl sm:text-7xl md:text-8xl lg:text-9xl tracking-tight leading-none">
            <h2
              ref={wordDefendRef}
              className="text-white text-glow-cyan will-change-transform"
            >
              DEFEND.
            </h2>
            <h2
              ref={wordDiscoverRef}
              className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-cyan via-blue-400 to-cyber-violet will-change-transform"
            >
              DISCOVER.
            </h2>
            <h2
              ref={wordDisruptRef}
              className="text-white drop-shadow-[0_0_40px_rgba(139,92,246,0.6)] will-change-transform"
            >
              DISRUPT.
            </h2>
          </div>

          {/* Core Creed Quote */}
          <div
            ref={quoteRef}
            className="mt-12 p-6 sm:p-8 rounded-2xl bg-[#040915]/90 border border-cyber-cyan/30 backdrop-blur-xl max-w-3xl hud-bracket shadow-2xl"
          >
            <p className="font-rajdhani font-black text-xl sm:text-2xl md:text-3xl text-cyber-cyan tracking-wider uppercase mb-3">
              “SECURITY IS NOT A FEATURE. IT IS THE FOUNDATION.”
            </p>
            <p className="text-slate-300 text-xs sm:text-sm font-sans leading-relaxed">
              SYSTECH 2K27 bridges theoretical cryptographic proofs with high-velocity adversarial confrontation. 
              We forge defenders capable of protecting critical infrastructure against nation-state threat vectors.
            </p>
          </div>
        </div>

        {/* Tactical Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-20">
          {pillars.map((pillar, idx) => {
            const IconComponent = pillar.icon;
            return (
              <div
                key={idx}
                onMouseEnter={() => sound.playTerminalBlip()}
                className="group relative p-6 rounded-2xl bg-[#040915]/85 border border-cyber-cyan/15 hover:border-cyber-cyan/50 backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_8px_30px_rgba(0,240,255,0.15)] flex flex-col justify-between hud-bracket"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-cyber-900 border border-cyber-cyan/30 flex items-center justify-center text-cyber-cyan group-hover:scale-110 group-hover:border-cyber-cyan group-hover:shadow-neon-cyan transition-all duration-300 mb-5">
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <h3 className="font-orbitron font-bold text-lg text-white mb-2 group-hover:text-cyber-cyan transition-colors">
                    {pillar.title}
                  </h3>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>VECTOR 0{idx + 1}</span>
                  <span className="text-cyber-cyan group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Why Attend & Participant Experience Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mb-20">
          <div className="p-8 rounded-3xl bg-gradient-to-br from-[#040915] via-cyber-900 to-[#040915] border border-cyber-cyan/25 backdrop-blur-xl space-y-5 hud-bracket">
            <span className="text-xs font-mono text-cyber-cyan tracking-widest uppercase block">
              // MOTIVE & IMPACT
            </span>
            <h3 className="font-orbitron font-extrabold text-2xl sm:text-3xl text-white">
              WHY PARTICIPATE IN THE GRID?
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Standard hackathons often focus solely on web building. SYSTECH 2K27 drops you into adversarial scenarios: 
              auditing active binaries, intercepting radio signals, cracking hardened ciphers, and debating national security doctrines.
            </p>
            <div className="space-y-2.5 font-mono text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyber-cyan" />
                <span>Gain industry recognition and build an authentic security research portfolio</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyber-violet" />
                <span>Direct interaction with leading cybersecurity agencies and threat hunters</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Compete for physical trophies, cash bounties, and verified admission credentials</span>
              </div>
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-gradient-to-br from-[#040915] via-cyber-900 to-[#040915] border border-cyber-violet/25 backdrop-blur-xl space-y-5 hud-bracket">
            <span className="text-xs font-mono text-cyber-violet tracking-widest uppercase block">
              // OPERATIVE EXPERIENCE
            </span>
            <h3 className="font-orbitron font-extrabold text-2xl sm:text-3xl text-white">
              WHAT PARTICIPANTS WILL EXPERIENCE
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              From the instant you scan your cryptographic entry pass at the checkpoint, you are an operative inside a synchronized cyberspace:
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-cyber-950 border border-white/5">
                <span className="font-mono text-xs font-bold text-cyber-cyan block mb-1">01. AIR-GAPPED CTF</span>
                <span className="text-[11px] text-slate-400">Live scoreboard projection with attack visualizers</span>
              </div>
              <div className="p-3.5 rounded-xl bg-cyber-950 border border-white/5">
                <span className="font-mono text-xs font-bold text-cyber-violet block mb-1">02. BOUNTY VAULT</span>
                <span className="text-[11px] text-slate-400">Instant reward dispatch for verified 0-day exploits</span>
              </div>
              <div className="p-3.5 rounded-xl bg-cyber-950 border border-white/5">
                <span className="font-mono text-xs font-bold text-emerald-400 block mb-1">03. NETWORKING LOUNGE</span>
                <span className="text-[11px] text-slate-400">Collaborate with fellow security researchers</span>
              </div>
              <div className="p-3.5 rounded-xl bg-cyber-950 border border-white/5">
                <span className="font-mono text-xs font-bold text-amber-400 block mb-1">04. HARDWARE PERKS</span>
                <span className="text-[11px] text-slate-400">Smart RFID tags, swag kits, and cyber apparel</span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-[#040915]/90 border border-cyber-cyan/20 backdrop-blur-xl text-center group hover:border-cyber-cyan transition-all duration-300 hover:shadow-neon-cyan hud-bracket"
              >
                <div className="w-10 h-10 mx-auto rounded-xl bg-cyber-900 border border-cyber-cyan/30 flex items-center justify-center text-cyber-cyan mb-3 group-hover:scale-110 transition-transform">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="font-orbitron font-extrabold text-2xl sm:text-3xl lg:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-cyber-cyan to-cyber-violet mb-1">
                  {stat.value}
                </div>
                <div className="font-mono font-bold text-xs text-white tracking-widest mb-1 uppercase">
                  {stat.label}
                </div>
                <div className="text-[11px] text-slate-400">
                  {stat.desc}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default About;
