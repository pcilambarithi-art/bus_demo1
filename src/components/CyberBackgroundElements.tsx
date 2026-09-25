import React, { useEffect, useRef } from 'react';
import { gsap } from '../utils/gsapSetup';

const FLOATING_TELEMETRY = [
  { text: 'ENCRYPTED PACKET // 0x7F3A91', x: '12%', y: '18%', speed: 0.08 },
  { text: 'AUTH VERIFIED // NODE_247', x: '82%', y: '28%', speed: -0.06 },
  { text: 'FIREWALL ACTIVE // TRACE BLOCKED', x: '7%', y: '58%', speed: 0.12 },
  { text: 'SECURE CHANNEL // AES-256', x: '88%', y: '72%', speed: -0.09 },
  { text: 'TLS 1.3 // PORT 443 // OPEN', x: '18%', y: '84%', speed: 0.07 },
  { text: 'ACCESS GRANTED // CIPHER LOCKED', x: '75%', y: '92%', speed: -0.1 },
];

export const CyberBackgroundElements: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridSlowRef = useRef<HTMLDivElement>(null);
  const gridMedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) return;

    const ctx = gsap.context(() => {
      // Parallax scroll on slow grid
      if (gridSlowRef.current) {
        gsap.to(gridSlowRef.current, {
          y: -120,
          ease: 'none',
          scrollTrigger: {
            trigger: document.body,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1.5,
          },
        });
      }

      // Parallax scroll on medium grid
      if (gridMedRef.current) {
        gsap.to(gridMedRef.current, {
          y: -240,
          ease: 'none',
          scrollTrigger: {
            trigger: document.body,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 2,
          },
        });
      }

      // Parallax on floating micro-telemetry tags
      const tagEls = containerRef.current?.querySelectorAll('.cyber-floating-tag');
      tagEls?.forEach((el, idx) => {
        const speed = FLOATING_TELEMETRY[idx % FLOATING_TELEMETRY.length].speed * 400;
        gsap.to(el, {
          y: speed,
          ease: 'none',
          scrollTrigger: {
            trigger: document.body,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1.2,
          },
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Deep Cyber Navy Base */}
      <div className="absolute inset-0 bg-[#02040a]" />

      {/* Layer 1: Slow Deep Cyber Grid */}
      <div
        ref={gridSlowRef}
        className="absolute -inset-y-32 inset-x-0 bg-cyber-grid opacity-25"
      />

      {/* Layer 2: Medium Density Secondary Grid */}
      <div
        ref={gridMedRef}
        className="absolute -inset-y-48 inset-x-0 bg-cyber-grid-dense opacity-15"
      />

      {/* Layer 3: Floating Micro-Telemetry HUD Elements */}
      {FLOATING_TELEMETRY.map((item, idx) => (
        <div
          key={idx}
          className="cyber-floating-tag absolute font-mono text-[9px] text-cyber-cyan/35 tracking-widest px-2 py-0.5 rounded border border-cyber-cyan/15 bg-cyber-950/40 backdrop-blur-xs hidden md:block"
          style={{ left: item.x, top: item.y }}
        >
          {item.text}
        </div>
      ))}

      {/* Layer 4: CRT Scanlines Overlay */}
      <div className="absolute inset-0 scanline-overlay opacity-30 pointer-events-none" />

      {/* Layer 5: Cyber Radial Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(2,4,10,0.75)_100%)] pointer-events-none" />
    </div>
  );
};

export default CyberBackgroundElements;
