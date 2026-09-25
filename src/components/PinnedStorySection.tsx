import React, { useEffect, useRef, useState } from 'react';
import { Shield, AlertTriangle, ShieldAlert, Cpu, Lock, Terminal } from 'lucide-react';
import { gsap } from '../utils/gsapSetup';

const STORY_STAGES = [
  {
    num: '01',
    stage: 'NETWORK',
    status: 'PERIMETER STABLE',
    title: 'GLOBAL RECONNAISSANCE MESH',
    description: 'Autonomous sensor arrays monitoring 10,000+ threat endpoints. Quantum key distribution running at peak fidelity.',
    badge: 'STAGE 01 / 05',
    color: 'text-cyber-cyan',
    borderColor: 'border-cyber-cyan/40',
    ringColor: '#00f0ff',
    icon: Shield,
    telemetry: 'TLS 1.3 // AES-256-GCM // 0xFA39B0',
  },
  {
    num: '02',
    stage: 'THREAT',
    status: 'INGRESS ANOMALY',
    title: 'UNAUTHORIZED ZERO-DAY VECTOR',
    description: 'Suspicious payload injected through an external API relay. Deep packet inspection flags unverified buffer signatures.',
    badge: 'STAGE 02 / 05',
    color: 'text-amber-400',
    borderColor: 'border-amber-400/40',
    ringColor: '#f59e0b',
    icon: AlertTriangle,
    telemetry: 'INGRESS PORT 8443 // HIGH ENTROPY',
  },
  {
    num: '03',
    stage: 'BREACH',
    status: 'PERIMETER VIOLATED',
    title: 'ADVERSARIAL SYSTEM SIEGE',
    description: 'Hostile shellcode executes privilege escalation attempt. Enclave honeypots triggered across Tier-2 subnets.',
    badge: 'STAGE 03 / 05',
    color: 'text-rose-400',
    borderColor: 'border-rose-400/40',
    ringColor: '#f43f5e',
    icon: ShieldAlert,
    telemetry: 'ALERT: BUFFER OVERFLOW AT 0xDEADC0DE',
  },
  {
    num: '04',
    stage: 'DEFENSE',
    status: 'FORCEFIELD ACTIVE',
    title: 'AUTONOMOUS COUNTERMEASURE',
    description: 'Neural IPS severs rogue route corridors. Air-gapped cryptographic fallback engages with zero data leakage.',
    badge: 'STAGE 04 / 05',
    color: 'text-cyber-violet',
    borderColor: 'border-cyber-violet/40',
    ringColor: '#8b5cf6',
    icon: Cpu,
    telemetry: 'DEFENSE PROTOCOL // QUARANTINE ENGAGED',
  },
  {
    num: '05',
    stage: 'SECURED',
    status: 'THREAT NEUTRALIZED',
    title: 'SYSTEM RE-FORTIFIED',
    description: 'Zero-day disassembled, hashed, and committed to national cyber repository. All grid corridors restored to 100% operational health.',
    badge: 'STAGE 05 / 05',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-400/40',
    ringColor: '#10b981',
    icon: Lock,
    telemetry: 'STATUS: IMMUTABLE // AUDIT SIGNED',
  },
];

export const PinnedStorySection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) return;

    const ctx = gsap.context(() => {
      // Pin section and scrub through 5 story stages
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '+=250%',
          pin: true,
          scrub: 1,
          onUpdate: (self) => {
            const idx = Math.min(4, Math.floor(self.progress * 5));
            setActiveStage(idx);
          },
        },
      });

      // Continuous rotation of gyroscopic rings mapped to scrub
      if (ringRef.current) {
        tl.to(ringRef.current, {
          rotation: 360,
          scale: 1.15,
          ease: 'none',
          duration: 1,
        }, 0);
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const current = STORY_STAGES[activeStage];
  const Icon = current.icon;

  return (
    <section
      ref={sectionRef}
      className="relative h-screen w-full flex items-center justify-center bg-[#02040a] overflow-hidden border-t border-cyber-cyan/15 perspective-1000"
    >
      {/* Background Radial Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[180px] pointer-events-none transition-colors duration-700"
        style={{
          backgroundColor: `${current.ringColor}15`,
        }}
      />

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 relative z-10">
        
        {/* Top Section Tracker */}
        <div className="flex items-center justify-between pb-6 mb-8 border-b border-white/10 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyber-cyan animate-ping" />
            <span className="text-slate-400 uppercase">TACTICAL INCIDENT CHRONICLE</span>
          </div>

          <div className="flex items-center gap-2">
            {STORY_STAGES.map((_, idx) => (
              <span
                key={idx}
                className={`w-6 h-1 rounded-full transition-all duration-300 ${
                  activeStage >= idx ? 'bg-cyber-cyan shadow-neon-cyan' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Story Centerpiece Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Transforming Gyroscopic 3D HUD Rings (5 cols) */}
          <div className="lg:col-span-5 flex items-center justify-center">
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
              
              {/* Outer Rotating HUD Reticle */}
              <div
                ref={ringRef}
                className="absolute inset-0 rounded-full border border-dashed transition-colors duration-500 will-change-transform"
                style={{ borderColor: current.ringColor }}
              />

              {/* Inner Gyroscopic Ring */}
              <div
                className="absolute inset-4 rounded-full border border-cyber-cyan/30 animate-spin"
                style={{ animationDuration: '18s' }}
              />

              {/* Reverse Rotating Counter Ring */}
              <div
                className="absolute inset-10 rounded-full border-2 border-dotted border-cyber-violet/40 animate-spin"
                style={{ animationDuration: '12s', animationDirection: 'reverse' }}
              />

              {/* Central Dynamic Stage Shield Icon */}
              <div
                className="relative z-10 w-24 h-24 rounded-2xl bg-cyber-900/90 border flex flex-col items-center justify-center shadow-2xl transition-all duration-500 hud-bracket"
                style={{ borderColor: current.ringColor }}
              >
                <Icon className={`w-10 h-10 ${current.color} transition-colors duration-500`} />
                <span className="font-mono text-[9px] text-slate-400 mt-1">
                  STAGE {current.num}
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic Story Information Panel (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full font-mono text-xs tracking-widest uppercase border transition-colors duration-500 hud-bracket"
              style={{
                backgroundColor: `${current.ringColor}15`,
                borderColor: `${current.ringColor}40`,
                color: current.ringColor,
              }}
            >
              <span>{current.badge}</span>
              <span>•</span>
              <span>{current.status}</span>
            </div>

            {/* Stage Title */}
            <div>
              <span className={`font-orbitron font-black text-4xl sm:text-5xl lg:text-6xl tracking-tight block ${current.color} drop-shadow-[0_0_20px_rgba(0,240,255,0.4)]`}>
                {current.stage}
              </span>
              <h3 className="font-orbitron font-bold text-xl sm:text-2xl text-white mt-1">
                {current.title}
              </h3>
            </div>

            {/* Description */}
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-sans max-w-xl">
              {current.description}
            </p>

            {/* Telemetry Footer */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-3 font-mono text-xs text-slate-400">
              <Terminal className="w-4 h-4 text-cyber-cyan" />
              <span>LIVE TELEMETRY:</span>
              <span className="text-white font-bold bg-cyber-900 px-2 py-1 rounded border border-white/10">
                {current.telemetry}
              </span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default PinnedStorySection;
