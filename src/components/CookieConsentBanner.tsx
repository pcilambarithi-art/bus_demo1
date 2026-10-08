import React, { useState, useEffect } from 'react';
import { useBus } from '../context/BusContext';
import { Cookie, ShieldCheck, Check, Settings, X } from 'lucide-react';
import { sound } from '../utils/sound';

export const CookieConsentBanner: React.FC = () => {
  const { openLegalModal } = useBus();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user already consented
    try {
      const consent = localStorage.getItem('dce_cookie_consent');
      if (!consent) {
        // Small delay so it animates in cleanly after initial render
        const timer = setTimeout(() => setIsVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch (_) {
      // Ignore if localStorage unavailable
    }
  }, []);

  // Listen for custom trigger to reopen cookie settings
  useEffect(() => {
    const handleReopen = () => setIsVisible(true);
    window.addEventListener('dce_reopen_cookie_banner', handleReopen);
    return () => window.removeEventListener('dce_reopen_cookie_banner', handleReopen);
  }, []);

  if (!isVisible) return null;

  const handleAcceptAll = () => {
    sound.playClick();
    try {
      localStorage.setItem(
        'dce_cookie_consent',
        JSON.stringify({ choice: 'all', timestamp: new Date().toISOString() })
      );
    } catch (_) {}
    setIsVisible(false);
  };

  const handleEssentialOnly = () => {
    sound.playClick();
    try {
      localStorage.setItem(
        'dce_cookie_consent',
        JSON.stringify({ choice: 'essential', timestamp: new Date().toISOString() })
      );
    } catch (_) {}
    setIsVisible(false);
  };

  const handleOpenCookiePolicy = () => {
    sound.playClick();
    openLegalModal('cookie');
  };

  return (
    <aside
      role="region"
      aria-label="Cookie & Local Storage Preferences"
      className="fixed bottom-3 left-3 right-3 sm:left-6 sm:right-auto sm:max-w-lg z-[110] animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]"
    >
      <div className="relative p-4 sm:p-5 rounded-3xl dark:bg-[#0B132B]/95 bg-white/95 border dark:border-cyan-400/30 border-slate-300 shadow-[0_10px_35px_rgba(0,0,0,0.25)] backdrop-blur-xl text-slate-800 dark:text-slate-100">
        
        {/* Specular line */}
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <Cookie className="w-5 h-5" />
          </div>

          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-extrabold tracking-tight dark:text-white text-slate-900 flex items-center gap-1.5">
                <span>Privacy & Storage Preferences</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-400/20">
                  Zero Ads
                </span>
              </h3>
              <button
                onClick={handleEssentialOnly}
                aria-label="Dismiss cookie notice with essential cookies only"
                className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] sm:text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              We use strictly necessary browser storage (sessions, audio chimes, dark/light theme, and GPS stop cache) to operate the bus radar. We <strong>never</strong> use tracking cookies or sell personal data.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-2">
              <button
                onClick={handleAcceptAll}
                className="flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all active:scale-95 shadow-md shadow-cyan-500/20 flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-cyan-500 outline-none"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Accept All</span>
              </button>

              <button
                onClick={handleEssentialOnly}
                className="flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold dark:bg-white/10 bg-slate-200 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 transition-all active:scale-95 border dark:border-white/10 border-slate-300 flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-cyan-500 outline-none"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Essential Only</span>
              </button>

              <button
                onClick={handleOpenCookiePolicy}
                className="py-2 px-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-cyan-500 outline-none"
                aria-label="View Detailed Cookie and Storage Policy"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="text-[11px] underline">Cookie Policy</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </aside>
  );
};
