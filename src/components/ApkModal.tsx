import React, { useState, useEffect } from 'react';
import { useBus } from '../context/BusContext';
import { Smartphone, Download, X, Terminal, Globe } from 'lucide-react';

export const ApkModal: React.FC = () => {
  const { isApkModalOpen, setIsApkModalOpen } = useBus();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState<'pwa' | 'apk'>('pwa');

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert('To install on Mobile: Open Chrome menu (⋮) and tap "Install app" or "Add to Home screen"!');
    }
  };

  if (!isApkModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
      <div className="relative w-full max-w-lg rounded-3xl dark:bg-[#0B132B]/95 bg-white/95 dark:border-white/15 border-slate-200 border p-6 shadow-2xl backdrop-blur-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b dark:border-white/10 border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base dark:text-white text-slate-900 leading-tight">
                Mobile APK & App Installation
              </h3>
              <p className="text-xs text-slate-400">
                Ready for Android APK & Progressive Web App
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsApkModalOpen(false)}
            className="p-1.5 rounded-full dark:text-slate-400 hover:text-white dark:hover:bg-white/10 text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch between PWA & APK */}
        <div className="flex items-center p-1 rounded-xl dark:bg-white/5 bg-slate-100 mt-4">
          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'pwa'
                ? 'bg-cyan-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Instant Install (PWA / Mobile)
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'apk'
                ? 'bg-cyan-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Android APK Build (Capacitor)
          </button>
        </div>

        {/* Tab 1: PWA */}
        {activeTab === 'pwa' && (
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-2xl dark:bg-cyan-500/10 bg-cyan-50 border border-cyan-500/30 flex items-start gap-3">
              <Globe className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold dark:text-cyan-300 text-cyan-900 mb-1">
                  Zero-Install Mobile Experience
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  This app is fully PWA configured. You can install it straight to your Android phone or iPhone home screen with offline caching, fullscreen mode, and native gestures.
                </p>
              </div>
            </div>

            <button
              onClick={handleInstallPWA}
              className="w-full py-3 px-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_4px_25px_rgba(6,182,212,0.4)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>{isInstalled ? 'App Already Installed ✓' : 'Install App to Home Screen'}</span>
            </button>

            <div className="text-[11px] text-slate-400 space-y-1 pl-1">
              <p>• On Android: Tap Chrome Menu (⋮) ➔ <strong>"Install app"</strong> or "Add to Home screen".</p>
              <p>• On iOS (Safari): Tap Share (􀈂) ➔ <strong>"Add to Home Screen"</strong>.</p>
            </div>
          </div>
        )}

        {/* Tab 2: Native APK */}
        {activeTab === 'apk' && (
          <div className="py-4 space-y-3">
            <div className="p-3 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 mb-1.5">
                <Terminal className="w-3.5 h-3.5" />
                <span>Capacitor APK Compilation Guide</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                Capacitor is already installed and configured in this project (<code className="text-cyan-300">capacitor.config.ts</code>). To produce the standalone <code className="text-cyan-300">.apk</code>:
              </p>

              <div className="p-2.5 rounded-lg bg-black/60 font-mono text-[11px] text-emerald-400 overflow-x-auto space-y-1">
                <div># 1. Build the production assets:</div>
                <div className="text-white">npm run build</div>
                <div className="mt-1"># 2. Add Android native platform (first time):</div>
                <div className="text-white">npx cap add android</div>
                <div className="mt-1"># 3. Sync code to Android project:</div>
                <div className="text-white">npx cap sync</div>
                <div className="mt-1"># 4. Open in Android Studio or build APK:</div>
                <div className="text-white">npx cap open android</div>
              </div>
            </div>

            <div className="p-3 rounded-xl dark:bg-white/5 bg-slate-50 border dark:border-white/10 border-slate-200 text-xs text-slate-300 flex items-center justify-between">
              <div>
                <span className="font-semibold block text-slate-100">Package ID:</span>
                <span className="font-mono text-[11px] text-cyan-400">com.college.bustracker</span>
              </div>
              <span className="px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">
                v2.4.0 (Production)
              </span>
            </div>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={() => setIsApkModalOpen(false)}
          className="w-full mt-2 py-2.5 rounded-xl font-bold text-xs bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white hover:bg-slate-300 dark:hover:bg-white/20 transition-all"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};
