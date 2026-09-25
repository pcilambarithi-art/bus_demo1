import React, { useState, useEffect } from 'react';
import { Shield, ArrowUp, Mail, MapPin, Phone } from 'lucide-react';
import { sound } from '../utils/audio';

export const Footer: React.FC = () => {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        `${now.toLocaleTimeString('en-US', { hour12: false })} IST (UTC+05:30)`
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const scrollToTop = () => {
    sound.playClick();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative bg-cyber-950 border-t border-cyber-cyan/15 pt-16 pb-12 overflow-hidden text-slate-400 font-sans text-xs">
      {/* Background glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[250px] bg-cyber-cyan/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-white/10">
          
          {/* Brand & Mission (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyber-900 border border-cyber-cyan/40 flex items-center justify-center text-cyber-cyan shadow-neon-cyan">
                <Shield className="w-5 h-5" />
              </div>
              <span className="font-orbitron font-black text-xl text-white tracking-wider">
                CYSTECH <span className="text-cyber-cyan">2K27</span>
              </span>
            </div>

            <p className="font-rajdhani font-bold text-sm text-cyber-cyan tracking-wider uppercase">
              “ENTER THE GRID. BREAK THE LIMITS.”
            </p>

            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              The premier national cybersecurity symposium uniting next-generation ethical hackers, 
              defense strategists, and cryptographic researchers.
            </p>

            <div className="pt-2 flex items-center gap-3 font-mono text-[11px]">
              <span className="px-2.5 py-1 rounded bg-cyber-900 border border-cyber-cyan/20 text-cyber-cyan">
                SECURE TELEMETRY
              </span>
              <span className="text-slate-500">
                TIME: <strong className="text-slate-300">{timeStr}</strong>
              </span>
            </div>
          </div>

          {/* Quick Navigation Links (3 cols) */}
          <div className="lg:col-span-3 space-y-3 font-mono">
            <h4 className="font-orbitron font-bold text-xs text-white uppercase tracking-wider">
              NAVIGATION
            </h4>
            <ul className="space-y-2">
              {[
                { name: 'Home Matrix', href: '#home' },
                { name: 'Events & Challenges', href: '#events' },
                { name: 'About Symposium', href: '#about' },
                { name: 'Timeline Itinerary', href: '#schedule' },
                { name: 'Protocol FAQ', href: '#faq' },
              ].map((link, idx) => (
                <li key={idx}>
                  <a
                    href={link.href}
                    onClick={() => sound.playClick()}
                    className="hover:text-cyber-cyan transition-colors"
                  >
                    // {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Campus Coordinates & Venue (4 cols) */}
          <div className="lg:col-span-4 space-y-3 font-mono">
            <h4 className="font-orbitron font-bold text-xs text-white uppercase tracking-wider">
              COMMAND CENTER
            </h4>
            <div className="space-y-2.5 text-[11px]">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-cyber-cyan shrink-0 mt-0.5" />
                <span>Department of Information Security & Cyber Defense, Cyber Range Complex, Main Tech Campus.</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-cyber-violet shrink-0" />
                <span className="text-slate-300">contact@systech2k27.org</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-slate-300">+91 (0) 44 2876 5400</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Back to Top */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span>© 2027 CYSTECH CYBER GRID. ALL RIGHTS RESERVED.</span>
            <span>•</span>
            <span className="text-emerald-400">DEFENSE STATUS: OPTIMAL</span>
          </div>

          <button
            onClick={scrollToTop}
            className="flex items-center gap-1 text-slate-400 hover:text-cyber-cyan transition-colors"
          >
            <span>ELEVATE TO PINNACLE</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </footer>
  );
};
