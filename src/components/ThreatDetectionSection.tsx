import React, { useEffect, useRef, useState } from 'react';
import { ShieldAlert, ShieldCheck, AlertOctagon, Terminal } from 'lucide-react';
import { gsap } from '../utils/gsapSetup';

export const ThreatDetectionSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);

  const [phaseIndex, setPhaseIndex] = useState(0);

  const PHASES = [
    {
      title: 'PHASE 01 // NETWORK STABLE',
      desc: 'All nodes communicating over encrypted AES-256 relays. Zero vector anomalies.',
      threatLevel: 'NOMINAL',
      firewall: 'STANDBY',
      badgeColor: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
    },
    {
      title: 'PHASE 02 // THREAT ANOMALY DETECTED',
      desc: 'Suspicious ingress packet stream targeting Node 0x7F. Packet signature unknown.',
      threatLevel: 'ELEVATED',
      firewall: 'ANALYZING',
      badgeColor: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
    },
    {
      title: 'PHASE 03 // ADVERSARIAL SPREAD ATTEMPT',
      desc: 'Exploit attempting lateral movement across adjoining mesh vectors. SYN flood detected.',
      threatLevel: 'CRITICAL',
      firewall: 'ENGAGING',
      badgeColor: 'text-rose-400 border-rose-400/30 bg-rose-400/10',
    },
    {
      title: 'PHASE 04 // AI FIREWALL BARRIER ACTIVE',
      desc: 'Adaptive neural defense rules deployed. Vector paths severed around infection zone.',
      threatLevel: 'CONTAINING',
      firewall: 'ACTIVE // FORCEFIELD',
      badgeColor: 'text-cyber-cyan border-cyber-cyan/30 bg-cyber-cyan/10',
    },
    {
      title: 'PHASE 05 // THREAT ISOLATION & QUARANTINE',
      desc: 'Malicious payload sandboxed into high-entropy honeypot cage. Quarantine 100% complete.',
      threatLevel: 'ISOLATED',
      firewall: 'PURGING',
      badgeColor: 'text-cyber-violet border-cyber-violet/30 bg-cyber-violet/10',
    },
    {
      title: 'PHASE 06 // SYSTEM RESTORED & FORTIFIED',
      desc: 'Network vectors re-encrypted. Zero-day signature patched into global symposium rulebook.',
      threatLevel: 'SECURED',
      firewall: 'OPTIMAL // RESILIENT',
      badgeColor: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
    },
  ];

  useEffect(() => {
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = Math.min(500, window.innerHeight * 0.6));

    // Network Topology Definition
    const nodeCount = 18;
    const nodes: {
      id: number;
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      connections: number[];
      isTarget: boolean;
      infected: boolean;
      isolated: boolean;
    }[] = [];

    // Distribute nodes evenly in an organic cyber cluster
    const cx = width / 2;
    const cy = height / 2;
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      const radius = 80 + (i % 3) * 65 + (Math.sin(i * 2) * 25);
      const nx = cx + Math.cos(angle) * radius;
      const ny = cy + Math.sin(angle) * (radius * 0.75);
      nodes.push({
        id: i,
        x: nx,
        y: ny,
        baseX: nx,
        baseY: ny,
        connections: [],
        isTarget: i === 7, // Central target node
        infected: false,
        isolated: false,
      });
    }

    // Connect close neighbors
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
        if (dist < 150) {
          nodes[i].connections.push(j);
        }
      }
    }

    // Packets moving along connections
    interface Packet {
      from: number;
      to: number;
      progress: number;
      speed: number;
      isThreat: boolean;
    }
    const packets: Packet[] = [];
    const maxPackets = 14;

    const spawnPacket = () => {
      const fromNode = nodes[Math.floor(Math.random() * nodes.length)];
      if (!fromNode.connections.length) return;
      const toId = fromNode.connections[Math.floor(Math.random() * fromNode.connections.length)];
      packets.push({
        from: fromNode.id,
        to: toId,
        progress: 0,
        speed: 0.01 + Math.random() * 0.015,
        isThreat: false,
      });
    };

    for (let i = 0; i < maxPackets; i++) {
      spawnPacket();
    }

    // GSAP ScrollTrigger to scrub progress variable 0 to 1
    const scrollObj = { progress: 0 };
    let animationFrameId: number;

    const scrollAnim = isReduced ? null : gsap.to(scrollObj, {
      progress: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: '+=150%',
        pin: true,
        scrub: 1,
        onUpdate: (self) => {
          const currentProgress = self.progress;
          const idx = Math.min(5, Math.floor(currentProgress * 6));
          setPhaseIndex(idx);
        },
      },
    });

    // Resize listener
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || 800;
      height = canvas.height = Math.min(500, window.innerHeight * 0.6);
    };
    window.addEventListener('resize', handleResize);

    // Canvas Render Loop
    let time = 0;
    const render = () => {
      animationFrameId = requestAnimationFrame(render);
      time += 0.02;

      ctx.clearRect(0, 0, width, height);

      const p = scrollObj.progress; // 0 to 1

      // Determine phase state
      // Phase 1 (0 - 0.16): Stable
      // Phase 2 (0.16 - 0.33): Threat appears at target (node 7)
      // Phase 3 (0.33 - 0.5): Threat spreads to neighbors
      // Phase 4 (0.5 - 0.67): Firewall barriers activate
      // Phase 5 (0.67 - 0.83): Threat isolated
      // Phase 6 (0.83 - 1.0): Fully secured

      const isThreatAppeared = p >= 0.16;
      const isThreatSpreading = p >= 0.33;
      const isFirewallActive = p >= 0.5;
      const isThreatIsolated = p >= 0.67;
      const isSystemSecured = p >= 0.83;

      const targetNode = nodes[7];

      // Draw Connection Lines
      nodes.forEach((node) => {
        node.connections.forEach((connId) => {
          const neighbor = nodes[connId];
          const isTargetEdge = node.isTarget || neighbor.isTarget;

          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(neighbor.x, neighbor.y);

          if (isThreatSpreading && !isFirewallActive && isTargetEdge) {
            // Compromised line (red/amber warning)
            ctx.strokeStyle = `rgba(244, 63, 94, ${0.4 + Math.sin(time * 6) * 0.3})`;
            ctx.lineWidth = 1.8;
          } else if (isFirewallActive && isTargetEdge && !isSystemSecured) {
            // Severed firewall line (dashed cyan)
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
            ctx.lineWidth = 1.5;
          } else if (isSystemSecured) {
            // Restored fortified connection
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
            ctx.lineWidth = 1.2;
          } else {
            // Normal baseline line
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
            ctx.lineWidth = 1;
          }
          ctx.stroke();
        });
      });

      // Update & Draw Packets
      packets.forEach((pkt, idx) => {
        pkt.progress += pkt.speed;
        if (pkt.progress >= 1) {
          packets.splice(idx, 1);
          spawnPacket();
          return;
        }

        const from = nodes[pkt.from];
        const to = nodes[pkt.to];
        if (!from || !to) return;

        const px = from.x + (to.x - from.x) * pkt.progress;
        const py = from.y + (to.y - from.y) * pkt.progress;

        const isMalicious = isThreatSpreading && !isThreatIsolated && (from.isTarget || to.isTarget);

        ctx.beginPath();
        ctx.arc(px, py, isMalicious ? 3 : 2, 0, Math.PI * 2);
        ctx.fillStyle = isMalicious ? '#f43f5e' : '#00f0ff';
        ctx.shadowColor = isMalicious ? '#f43f5e' : '#00f0ff';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw Firewall Perimeter Rings around target node in phase 4-5
      if (isFirewallActive && !isSystemSecured && targetNode) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(targetNode.x, targetNode.y, 55 + Math.sin(time * 4) * 4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(targetNode.x, targetNode.y, 40, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        // Firewall Status HUD Tag in canvas
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillStyle = '#00f0ff';
        ctx.fillText('// AI_FIREWALL: QUARANTINE_LOCKED', targetNode.x - 85, targetNode.y - 65);
      }

      // Draw Nodes
      nodes.forEach((node) => {
        const isCompromised = isThreatAppeared && node.isTarget && !isSystemSecured;

        // Node Outer Radar Ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, isCompromised ? 12 + Math.sin(time * 6) * 3 : 7, 0, Math.PI * 2);
        if (isCompromised) {
          ctx.fillStyle = isThreatIsolated ? 'rgba(139, 92, 246, 0.2)' : 'rgba(244, 63, 94, 0.2)';
          ctx.strokeStyle = isThreatIsolated ? '#8b5cf6' : '#f43f5e';
        } else if (isSystemSecured) {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
          ctx.strokeStyle = '#10b981';
        } else {
          ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
          ctx.strokeStyle = '#00f0ff';
        }
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();

        // Inner Core Point
        ctx.beginPath();
        ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = isCompromised
          ? isThreatIsolated ? '#c084fc' : '#ff4d6d'
          : isSystemSecured ? '#10b981' : '#ffffff';
        ctx.fill();

        // Node ID microtext
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
        ctx.fillText(`0x${node.id.toString(16).toUpperCase()}`, node.x + 10, node.y + 3);
      });
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      scrollAnim?.scrollTrigger?.kill();
      scrollAnim?.kill();
    };
  }, []);

  const activePhase = PHASES[phaseIndex];

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex flex-col justify-center py-20 bg-[#02040a] overflow-hidden border-t border-cyber-cyan/15"
    >
      {/* Background radial atmosphere */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[450px] bg-cyber-violet/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 relative z-10">
        
        {/* Section Heading */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan font-mono text-xs tracking-widest mb-4 hud-bracket">
            <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
            <span>INCIDENT RESPONSE // SURVEILLANCE MESH</span>
          </div>

          <h2 className="font-orbitron font-extrabold text-3xl sm:text-4xl md:text-5xl text-white tracking-tight mb-3">
            THREAT DETECTION & <span className="text-cyber-cyan text-glow-cyan">DEFENSE AUDIT</span>
          </h2>

          <p className="max-w-2xl text-slate-400 text-sm font-sans">
            Scroll to observe the autonomous detection, firewall containment, and neutralization of adversary zero-day vectors.
          </p>
        </div>

        {/* Threat Visualization Matrix Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Canvas Interactive Network Area (8 cols) */}
          <div className="lg:col-span-8 p-3 sm:p-5 rounded-3xl bg-[#040915]/90 border border-cyber-cyan/25 backdrop-blur-xl shadow-2xl relative hud-bracket overflow-hidden">
            {/* Top Terminal Ribbon */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-cyber-cyan/15 font-mono text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyber-cyan animate-ping" />
                <span className="text-white font-bold">NODE CLUSTER: 18 CHANNELS</span>
              </div>
              <span className="text-cyber-cyan">FPS: 60 // GPU ACCELERATED</span>
            </div>

            {/* Canvas Visualizer */}
            <div className="relative w-full h-[380px] sm:h-[460px] flex items-center justify-center">
              <canvas ref={canvasRef} className="w-full h-full block" />
            </div>

            {/* Bottom Progress Bar */}
            <div className="px-3 pt-2 flex items-center justify-between font-mono text-[10px] text-slate-400 border-t border-white/5">
              <span>SCROLL PROGRESSION: {phaseIndex + 1}/6</span>
              <span className="text-cyber-cyan uppercase">{activePhase.threatLevel}</span>
            </div>
          </div>

          {/* Phase HUD Telemetry Panel (4 cols) */}
          <div
            ref={hudRef}
            className="lg:col-span-4 p-6 sm:p-7 rounded-3xl bg-[#040915]/90 border border-cyber-cyan/30 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-6 hud-bracket"
          >
            <div>
              {/* Phase Badge */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="text-[10px] font-mono text-slate-400 tracking-widest">
                  INCIDENT LOG
                </span>
                <span className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border ${activePhase.badgeColor}`}>
                  {activePhase.threatLevel}
                </span>
              </div>

              {/* Phase Title */}
              <h3 className="font-orbitron font-bold text-lg sm:text-xl text-white mb-3 flex items-center gap-2">
                {phaseIndex < 2 ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                ) : phaseIndex < 4 ? (
                  <AlertOctagon className="w-5 h-5 text-rose-400 animate-pulse" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-cyber-cyan" />
                )}
                <span>{activePhase.title}</span>
              </h3>

              {/* Phase Description */}
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6 font-sans">
                {activePhase.desc}
              </p>

              {/* Status HUD Metrics */}
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 rounded-xl bg-cyber-900/90 border border-white/5 flex items-center justify-between">
                  <span className="text-slate-400">FIREWALL PROTOCOL:</span>
                  <span className="text-cyber-cyan font-bold">{activePhase.firewall}</span>
                </div>
                <div className="p-3 rounded-xl bg-cyber-900/90 border border-white/5 flex items-center justify-between">
                  <span className="text-slate-400">INGRESS AUDIT:</span>
                  <span className="text-emerald-400 font-bold">MONITORED</span>
                </div>
                <div className="p-3 rounded-xl bg-cyber-900/90 border border-white/5 flex items-center justify-between">
                  <span className="text-slate-400">SANDBOX INTEGRITY:</span>
                  <span className="text-slate-200 font-bold">ARMED</span>
                </div>
              </div>
            </div>

            {/* Interactive Scroll Prompt */}
            <div className="pt-4 border-t border-white/10 flex items-center gap-2 text-[11px] font-mono text-cyber-cyan">
              <Terminal className="w-3.5 h-3.5" />
              <span>CONTINUE SCROLLING TO COMPLETE AUDIT</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default ThreatDetectionSection;
