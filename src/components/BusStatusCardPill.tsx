import React from 'react';
import { ChevronRight } from 'lucide-react';
import { BusStatusIndicator, determineBusStatus } from './BusStatusIndicator';
import type { BusTelemetry, BusVehicle } from '../types/bus';

interface BusStatusCardPillProps {
  bus: BusVehicle;
  telemetry: BusTelemetry;
  onClick?: () => void;
  className?: string;
  showSubtitle?: boolean;
}

/**
 * Premium dark navy rounded-pill bus tracking card
 * Preserves the exact typography, bus ID, speed display (22 km/h), cyan/blue accent,
 * and navigation arrow with the newly redesigned 3-state circular status indicator:
 * 🟡 Yellow — Destination / Very Close
 * 🔴 Red    — Moving to Next Station
 * 🟢 Green  — At Station
 */
export const BusStatusCardPill: React.FC<BusStatusCardPillProps> = ({
  bus,
  telemetry,
  onClick,
  className = '',
  showSubtitle = false,
}) => {
  const statusInfo = determineBusStatus(telemetry);

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`
        group relative flex items-center justify-between px-3.5 py-2.5 rounded-2xl sm:rounded-full
        bg-[#0B1528]/90 dark:bg-[#070E20]/95
        border border-cyan-500/25 dark:border-cyan-400/30
        shadow-[0_8px_24px_rgba(3,10,30,0.5)]
        backdrop-blur-xl transition-all duration-300
        ${onClick ? 'cursor-pointer hover:border-cyan-400/60 hover:shadow-[0_8px_30px_rgba(6,182,212,0.25)] hover:scale-[1.01] active:scale-[0.99]' : ''}
        ${className}
      `}
    >
      {/* Specular ambient line across top */}
      <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />

      {/* Left side: Circular Status Indicator + Bus Info */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Small circular status indicator (🟡 / 🔴 / 🟢) replacing old bus icon */}
        <BusStatusIndicator telemetry={telemetry} size="sm" />

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-xs sm:text-sm font-sans tracking-tight text-white group-hover:text-cyan-300 transition-colors">
              {bus.busNumber}
            </span>
            <span className="text-[10px] font-mono text-cyan-400/80 px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-500/20">
              {bus.plateNumber}
            </span>
          </div>

          {showSubtitle && (
            <p className="text-[10px] text-slate-400 truncate mt-0.5 max-w-[140px] sm:max-w-[200px]">
              {statusInfo.label}
            </p>
          )}
        </div>
      </div>

      {/* Right side: Speed Badge + Navigation Arrow */}
      <div className="flex items-center gap-2.5 shrink-0 pl-2">
        {/* Speed display */}
        <div className="flex items-baseline gap-0.5 px-2 py-1 rounded-xl bg-cyan-500/10 border border-cyan-400/25">
          <span className="text-xs sm:text-sm font-mono font-black text-cyan-300">
            {telemetry.speedKmh}
          </span>
          <span className="text-[9px] font-sans text-cyan-400/80 font-medium">km/h</span>
        </div>

        {/* Right-side cyan navigation arrow */}
        <div className="w-6 h-6 rounded-full flex items-center justify-center bg-cyan-500/15 text-cyan-400 group-hover:bg-cyan-500/25 group-hover:translate-x-0.5 transition-all">
          <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
      </div>
    </div>
  );
};
