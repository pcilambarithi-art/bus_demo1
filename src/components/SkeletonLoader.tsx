import React from 'react';

export const SkeletonGlassCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`
        relative overflow-hidden rounded-[24px] p-6
        backdrop-blur-[20px] dark:bg-slate-900/50 bg-white/40
        border dark:border-white/10 border-slate-200 shadow-lg
        ${className}
      `}
    >
      {/* Shimmer linear gradient pass */}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 dark:via-cyan-400/10 to-transparent animate-[shimmer_1.8s_infinite]" />

      <div className="space-y-4">
        {/* Title bar */}
        <div className="flex items-center justify-between">
          <div className="w-28 h-5 rounded-lg bg-slate-300/40 dark:bg-white/10" />
          <div className="w-12 h-5 rounded-full bg-slate-300/30 dark:bg-white/10" />
        </div>

        {/* Subtitle */}
        <div className="w-44 h-3.5 rounded bg-slate-300/30 dark:bg-white/5" />

        {/* Stats 2-column blocks */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t dark:border-white/10 border-slate-200">
          <div className="h-10 rounded-xl bg-slate-300/30 dark:bg-white/10" />
          <div className="h-10 rounded-xl bg-slate-300/30 dark:bg-white/10" />
        </div>

        {/* Full width bottom bar */}
        <div className="w-full h-8 rounded-xl bg-slate-300/20 dark:bg-white/5" />
      </div>
    </div>
  );
};
