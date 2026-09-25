import React, { useEffect, useRef } from 'react';
import { ShieldCheck, Cpu, Activity, Lock, Wifi, AlertTriangle } from 'lucide-react';
import { gsap } from '../utils/gsapSetup';
import { sound } from '../utils/audio';

const STATS = [
  {
    label: 'SYSTEM STATUS',
    value: 'ONLINE',
    sub: 'All defense grids synchronized',
    icon: ShieldCheck,
    color: 'text-emerald-400',
    badge: 'STABLE',
    fromDir: { x: -80, y: 40, rotationY: -15 },
  },
  {
    label: 'THREAT LEVEL',
    value: 'DEFCON 4',
    sub: 'Low anomalous vector traffic',
    icon: AlertTriangle,
    color: 'text-amber-400',
    badge: 'MONITORED',
    fromDir: { x: 80, y: -40, rotationY: 15 },
  },
  {
    label: 'ACTIVE NODES',
    targetNumber: 247,
    value: '247',
    sub: 'Air-gapped mesh architecture',
    icon: Cpu,
    color: 'text-cyber-cyan',
    badge: 'OPERATIONAL',
    fromDir: { x: -60, y: -60, rotationX: 15 },
  },
  {
    label: 'ENCRYPTION',
    value: 'AES-256',
    sub: 'Post-quantum key derivation',
    icon: Lock,
    color: 'text-cyber-violet',
    badge: 'HARDENED',
    fromDir: { x: 60, y: 60, rotationX: -15 },
  },
  {
    label: 'NETWORK',
    value: 'SECURE',
    sub: 'Zero packet loss detected',
    icon: Wifi,
    color: 'text-blue-400',
    badge: 'VERIFIED',
    fromDir: { x: -50, y: 70, rotationY: -10 },
  },
  {
    label: 'UPTIME',
    targetNumber: 99.98,
    value: '99.98%',
    sub: 'Zero downtime breach resilience',
    icon: Activity,
    color: 'text-emerald-400',
    badge: 'OPTIMAL',
    fromDir: { x: 50, y: -70, rotationY: 10 },
  },
];

export const SystemStatusSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) return;

    const ctx = gsap.context(() => {
      // Header entrance
      if (headerRef.current) {
        gsap.from(headerRef.current, {
          y: 60,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
          },
        });
      }

      // Cards 3D Entrance & Lock into Grid
      const cards = cardsContainerRef.current?.querySelectorAll('.hud-stat-card');
      if (cards && cards.length) {
        cards.forEach((card, idx) => {
          const config = STATS[idx].fromDir;
          gsap.fromTo(
            card,
            {
              x: config.x,
              y: config.y,
              rotationX: config.rotationX || 0,
              rotationY: config.rotationY || 0,
              scale: 0.82,
              opacity: 0,
            },
            {
              x: 0,
              y: 0,
              rotationX: 0,
              rotationY: 0,
              scale: 1,
              opacity: 1,
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

        // Number counter scroll animation
        const counterEls = cardsContainerRef.current?.querySelectorAll('.hud-counter-value');
        counterEls?.forEach((el) => {
          const target = parseFloat(el.getAttribute('data-target') || '0');
          if (target > 0) {
            const isFloat = target % 1 !== 0;
            const obj = { val: 0 };
            gsap.to(obj, {
              val: target,
              duration: 1.8,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: el,
                start: 'top 85%',
              },
              onUpdate: () => {
                el.textContent = isFloat ? `${obj.val.toFixed(2)}%` : Math.floor(obj.val).toString();
              },
            });
          }
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-32 bg-[#02040a]/90 overflow-hidden border-t border-cyber-cyan/15 perspective-1000"
    >
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-cyber-blue/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Section Header */}
        <div ref={headerRef} className="flex flex-col items-center text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan font-mono text-xs tracking-widest mb-4 hud-bracket">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SOC COMMAND MATRIX // TELEMETRY</span>
          </div>

          <h2 className="font-orbitron font-extrabold text-3xl sm:text-4xl md:text-5xl text-white tracking-tight mb-4">
            SYSTEM STATUS & <span className="text-cyber-cyan text-glow-cyan">TELEMETRY</span>
          </h2>

          <p className="max-w-2xl text-slate-400 text-sm sm:text-base font-sans">
            Real-time telemetry stream synchronized across national cyber range relays and secure enclave monitoring nodes.
          </p>
        </div>

        {/* HUD Statistics 6-Card Grid */}
        <div
          ref={cardsContainerRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transform-style-3d"
        >
          {STATS.map((stat, idx) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={idx}
                onMouseEnter={() => sound.playTerminalBlip()}
                className="hud-stat-card relative p-6 sm:p-7 rounded-2xl bg-[#040915]/85 border border-cyber-cyan/20 hover:border-cyber-cyan/50 backdrop-blur-xl transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,240,255,0.18)] flex flex-col justify-between group hud-bracket transform-style-3d cursor-default"
              >
                {/* Top Badge & Metric Label */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-cyber-900 border border-cyber-cyan/30 flex items-center justify-center text-cyber-cyan group-hover:scale-110 transition-transform">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="font-mono text-xs text-slate-400 font-bold tracking-wider">
                      {stat.label}
                    </span>
                  </div>

                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/25 text-cyber-cyan tracking-wider">
                    {stat.badge}
                  </span>
                </div>

                {/* Stat Big Value */}
                <div className="my-3">
                  <div
                    className={`font-orbitron font-black text-3xl sm:text-4xl tracking-tight ${stat.color} drop-shadow-[0_0_15px_rgba(0,240,255,0.3)] hud-counter-value`}
                    data-target={stat.targetNumber || 0}
                  >
                    {stat.value}
                  </div>
                  <p className="text-slate-400 font-sans text-xs mt-1">
                    {stat.sub}
                  </p>
                </div>

                {/* Bottom Status Wire */}
                <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>TELEMETRY_0{idx + 1}</span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    SYNCED
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default SystemStatusSection;
