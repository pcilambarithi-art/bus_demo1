import React, { useState, useEffect } from 'react';
import { useBus } from '../context/BusContext';
import type { LegalTab } from '../types/bus';
import {
  Bus,
  ArrowUp,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Lock,
  Cookie,
  FileText,
  DollarSign,
  Scale,
  Clock,
  Trash2,
} from 'lucide-react';
import { sound } from '../utils/sound';

export const Footer: React.FC = () => {
  const { openLegalModal } = useBus();
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

  const handleLegalClick = (e: React.MouseEvent, tab: LegalTab) => {
    e.preventDefault();
    openLegalModal(tab);
  };

  const handleReopenCookies = () => {
    sound.playClick();
    window.dispatchEvent(new CustomEvent('dce_reopen_cookie_banner'));
  };

  return (
    <footer className="relative bg-[#050814] border-t dark:border-white/10 border-slate-300 pt-12 pb-10 overflow-hidden text-slate-400 font-sans text-xs">
      {/* Background soft ambient glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[220px] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 pb-10 border-b dark:border-white/10 border-slate-800">
          
          {/* Brand & Mission (5 cols) */}
          <div className="lg:col-span-5 space-y-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white border border-cyan-400/50 p-1 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)] shrink-0">
                <img
                  src="./app-logo.jpg"
                  alt="Dhanalakshmi College of Engineering Official Crest"
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
              <div>
                <span className="font-extrabold text-base sm:text-lg text-white tracking-tight block leading-tight">
                  DCE <span className="text-cyan-400">BUS TRACKER</span>
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  Dhanalakshmi College of Engineering, Chennai
                </span>
              </div>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed max-w-sm">
              Official real-time campus fleet tracking, student boarding telemetry, and route safety radar system. AICTE Approved & Affiliated to Anna University.
            </p>

            <div className="pt-1 flex flex-wrap items-center gap-2 font-mono text-[11px]">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                ACTIVE FLEET RADAR
              </span>
              <span className="text-slate-400">
                DISPATCH TIME: <strong className="text-slate-200">{timeStr}</strong>
              </span>
            </div>
          </div>

          {/* Legal, Privacy & Compliance Links (4 cols) */}
          <div className="lg:col-span-4 space-y-3 font-mono">
            <h4 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>LEGAL, PRIVACY & POLICIES</span>
            </h4>
            <ul className="space-y-2 text-[11px]">
              <li>
                <button
                  onClick={(e) => handleLegalClick(e, 'privacy')}
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 text-slate-300 focus-visible:ring-2 focus-visible:ring-cyan-500 outline-none rounded"
                >
                  <Lock className="w-3 h-3 text-cyan-400" />
                  <span>Privacy Policy (DPDP Act 2023)</span>
                </button>
              </li>
              <li>
                <button
                  onClick={(e) => handleLegalClick(e, 'terms')}
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 text-slate-300 focus-visible:ring-2 focus-visible:ring-cyan-500 outline-none rounded"
                >
                  <FileText className="w-3 h-3 text-indigo-400" />
                  <span>Terms of Service & Bus Pass Rules</span>
                </button>
              </li>
              <li>
                <button
                  onClick={(e) => handleLegalClick(e, 'refund')}
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 text-slate-300 focus-visible:ring-2 focus-visible:ring-cyan-500 outline-none rounded"
                >
                  <DollarSign className="w-3 h-3 text-emerald-400" />
                  <span>Transport Fee & Refund Policy</span>
                </button>
              </li>
              <li>
                <button
                  onClick={(e) => handleLegalClick(e, 'cookie')}
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 text-slate-300 focus-visible:ring-2 focus-visible:ring-cyan-500 outline-none rounded"
                >
                  <Cookie className="w-3 h-3 text-amber-400" />
                  <span>Cookie Policy & Local Storage Audit</span>
                </button>
              </li>
              <li>
                <button
                  onClick={(e) => handleLegalClick(e, 'licenses')}
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 text-slate-300 focus-visible:ring-2 focus-visible:ring-cyan-500 outline-none rounded"
                >
                  <Scale className="w-3 h-3 text-cyan-400" />
                  <span>Institutional Details & Open-Source Licenses</span>
                </button>
              </li>
              <li>
                <button
                  onClick={(e) => handleLegalClick(e, 'data-deletion')}
                  className="hover:text-rose-400 transition-colors flex items-center gap-1.5 text-rose-300/90 focus-visible:ring-2 focus-visible:ring-cyan-500 outline-none rounded"
                >
                  <Trash2 className="w-3 h-3 text-rose-400" />
                  <span>Data Deletion Request & Privacy Rights</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Campus Transit Command Center & Helpdesk (3 cols) */}
          <div className="lg:col-span-3 space-y-3 font-mono">
            <h4 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <Bus className="w-3.5 h-3.5 text-cyan-400" />
              <span>TRANSPORT DESK</span>
            </h4>
            <div className="space-y-2 text-[11px] text-slate-300">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>Dr. V. P. R. Nagar, Manimangalam, Chennai - 601301.</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>+91 94443 90150 / 044 7122 4000</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>transport@dce.edu.in</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                <span>06:30 AM – 06:30 PM IST (Mon–Sat)</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar: Copyright, Cookie Preferences & Back to Top */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-slate-400">
          <div className="flex flex-wrap items-center gap-2">
            <span>© 2026 DHANALAKSHMI COLLEGE OF ENGINEERING.</span>
            <span className="hidden sm:inline">•</span>
            <span>ALL RIGHTS RESERVED.</span>
            <span className="hidden sm:inline">•</span>
            <button
              onClick={handleReopenCookies}
              className="text-cyan-400 hover:underline cursor-pointer focus-visible:ring-1 focus-visible:ring-cyan-500 outline-none"
            >
              Cookie Settings
            </button>
          </div>

          <button
            onClick={scrollToTop}
            aria-label="Scroll back to top of page"
            className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500 outline-none rounded p-1"
          >
            <span>BACK TO TOP</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </footer>
  );
};
