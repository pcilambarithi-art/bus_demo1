import React from 'react';
import type { EventItem } from '../types';
import { 
  X, Calendar, Clock, MapPin, Users, Award, ShieldCheck, 
  Terminal, AlertTriangle, Phone, ExternalLink 
} from 'lucide-react';
import { sound } from '../utils/audio';

interface EventModalProps {
  event: EventItem | null;
  onClose: () => void;
  onRegister: (eventId: string) => void;
}

export const EventModal: React.FC<EventModalProps> = ({ event, onClose, onRegister }) => {
  if (!event) return null;

  /**
   * Derives a human-readable team-size label from the saved event data.
   * Uses `teamMin` / `teamMax` as the source of truth so that Custom events
   * always show the actual count entered by the admin rather than the raw
   * dropdown value "Custom".
   *
   * Rules:
   *  • teamMax === 1  →  "Individual"
   *  • teamMin === teamMax  →  "{N} Members"
   *  • teamMin !== teamMax  →  "Up to {teamMax} Members"
   *  • Fallback: use event.type string as-is (covers legacy events)
   */
  const getTeamSizeLabel = (): string => {
    const { teamMin, teamMax, type } = event;

    // Individual
    if (teamMax === 1 || type === 'Individual') return 'Individual';

    // Fixed size (e.g. Team (2 Members), Team (3 Members), Team (4 Members))
    if (teamMin > 0 && teamMax > 0 && teamMin === teamMax) {
      return `${teamMax} Member${teamMax > 1 ? 's' : ''}`;
    }

    // Custom / range: show "Up to N Members"
    if (teamMax > 1) {
      return `Up to ${teamMax} Member${teamMax > 1 ? 's' : ''}`;
    }

    // Legacy fallback
    return type;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Dark backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
        onClick={() => {
          sound.playClick();
          onClose();
        }}
      />

      {/* Cyber Modal Window */}
      <div className="relative w-full max-w-3xl my-8 bg-cyber-900/95 border border-cyber-cyan/40 rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.2)] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-cyber-950/80 border-b border-cyber-cyan/20">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded bg-cyber-cyan/15 border border-cyber-cyan/30 text-cyber-cyan font-mono text-xs font-bold">
              SYS-EVT // {event.number}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
              event.track === 'Technical' 
                ? 'bg-cyber-cyan/15 text-cyber-cyan border-cyber-cyan/40' 
                : 'bg-cyber-violet/15 text-cyber-violet border-cyber-violet/40'
            }`}>
              {event.track}
            </span>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-cyber-900 border border-cyber-cyan/20 text-slate-400 hover:text-white hover:border-cyber-cyan transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 max-h-[75vh] overflow-y-auto space-y-6">
          {/* Header info */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h2 className="font-orbitron font-extrabold text-2xl sm:text-3xl text-white tracking-wide">
                {event.name}
              </h2>
              <span className="px-3 py-1 rounded-full bg-cyber-violet/20 border border-cyber-violet/40 text-cyber-violet font-mono text-xs font-semibold">
                Bounty: {event.prizePool}
              </span>
            </div>
            <p className="font-rajdhani font-semibold text-lg text-cyber-cyan">
              {event.tagline}
            </p>
            <p className="text-slate-300 text-sm sm:text-base mt-2 leading-relaxed">
              {event.detailedDescription}
            </p>
          </div>

          {/* Quick Specifications Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-cyber-950/60 border border-cyber-cyan/15 font-mono text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Calendar className="w-4 h-4 text-cyber-cyan shrink-0" />
              <div>
                <span className="block text-[10px] text-slate-500">DATE</span>
                <span>{event.date}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              <Clock className="w-4 h-4 text-cyber-violet shrink-0" />
              <div>
                <span className="block text-[10px] text-slate-500">TIME</span>
                <span>{event.time}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              <Users className="w-4 h-4 text-cyber-cyan shrink-0" />
              <div>
                <span className="block text-[10px] text-slate-500">TEAM SIZE</span>
                <span>{getTeamSizeLabel()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
              <div>
                <span className="block text-[10px] text-slate-500">VENUE</span>
                <span className="truncate">{event.venue}</span>
              </div>
            </div>
          </div>

          {/* Rules & Protocols */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-orbitron text-sm sm:text-base text-white font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              TACTICAL RULES & PROTOCOLS
            </h3>
            <ul className="space-y-2">
              {event.rules.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300 font-sans">
                  <span className="text-cyber-cyan font-mono font-bold mt-0.5">[{idx + 1}]</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Eligibility & Prerequisites */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-cyber-950/40 border border-cyber-cyan/10">
              <h4 className="flex items-center gap-2 font-orbitron text-xs text-cyber-cyan font-semibold mb-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                ELIGIBILITY
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {event.eligibility.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-cyber-cyan">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-cyber-950/40 border border-cyber-violet/10">
              <h4 className="flex items-center gap-2 font-orbitron text-xs text-cyber-violet font-semibold mb-2">
                <Award className="w-3.5 h-3.5" />
                PREREQUISITES & TOOLS
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {event.prerequisites.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-cyber-violet">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Coordinators Contact */}
          {event.coordinators && event.coordinators.length > 0 && (
            <div className="pt-2 border-t border-cyber-cyan/10 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-400">
              <span className="text-[11px] text-slate-500 uppercase">EVENT COORDINATORS:</span>
              <div className="flex flex-wrap gap-4">
                {event.coordinators.map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-cyber-cyan" />
                    <span>{c.name}:</span>
                    <span className="text-cyber-cyan">{c.contact}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Registration Trigger */}
        <div className="px-6 py-4 bg-cyber-950/80 border-t border-cyber-cyan/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>REGISTRATION TERMINAL ACTIVE • INSTANT ACCESS</span>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onRegister(event.id);
            }}
            onMouseEnter={() => sound.playTerminalBlip()}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyber-cyan to-cyber-violet text-black font-mono font-bold text-xs tracking-widest hover:shadow-neon-cyan active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Terminal className="w-4 h-4" />
            <span>ENROLL FOR {event.name}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
