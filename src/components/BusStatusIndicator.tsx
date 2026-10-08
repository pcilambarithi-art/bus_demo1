import React from 'react';
import type { BusTelemetry } from '../types/bus';

export type BusStatusType = 'destination' | 'at_station' | 'moving';

export interface BusStatusInfo {
  type: BusStatusType;
  color: 'yellow' | 'green' | 'red';
  label: string;
  description: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  glowColor: string;
}

/**
 * Authoritatively determines 3-state operational status:
 * 🟢 Green  — At Station (Bus has reached or is halted at station, speed <= 2 km/h)
 * 🔴 Red    — Moving to Next Station (Bus departed and en route, speed > 2 km/h)
 * 🟡 Yellow — Destination / Very Close (Bus has arrived or is near final terminus)
 */
export function determineBusStatus(telemetry: BusTelemetry): BusStatusInfo {
  // 1. Primary: Use authoritative statusIndicator from server telemetry engine / BusContext
  if (telemetry.statusIndicator === 'yellow') {
    return {
      type: 'destination',
      color: 'yellow',
      label: 'Destination / Very Close',
      description: 'Bus has reached or is very close to final destination',
      badgeBg: 'bg-amber-400/15',
      badgeBorder: 'border-amber-400/40',
      badgeText: 'text-amber-400',
      glowColor: 'shadow-[0_0_12px_rgba(245,158,11,0.7)]',
    };
  }

  if (telemetry.statusIndicator === 'green') {
    return {
      type: 'at_station',
      color: 'green',
      label: 'At Station',
      description: 'Bus is waiting / stopped at the station (boarding active)',
      badgeBg: 'bg-emerald-500/15',
      badgeBorder: 'border-emerald-400/40',
      badgeText: 'text-emerald-400',
      glowColor: 'shadow-[0_0_12px_rgba(16,185,129,0.7)]',
    };
  }

  if (telemetry.statusIndicator === 'red') {
    return {
      type: 'moving',
      color: 'red',
      label: 'Moving to Next Station',
      description: 'Bus is currently moving toward next station',
      badgeBg: 'bg-rose-500/15',
      badgeBorder: 'border-rose-400/40',
      badgeText: 'text-rose-400',
      glowColor: 'shadow-[0_0_12px_rgba(244,63,94,0.7)]',
    };
  }

  // 2. Fallback if statusIndicator is not pre-computed:
  const isDestination = telemetry.status === 'ARRIVING';
  const isAtStation =
    telemetry.status === 'ARRIVED' ||
    (telemetry.speedKmh <= 2 && telemetry.distanceToNextStopMeters <= 60);

  if (isDestination) {
    return {
      type: 'destination',
      color: 'yellow',
      label: 'Destination / Very Close',
      description: 'Bus has reached or is very close to final destination',
      badgeBg: 'bg-amber-400/15',
      badgeBorder: 'border-amber-400/40',
      badgeText: 'text-amber-400',
      glowColor: 'shadow-[0_0_12px_rgba(245,158,11,0.7)]',
    };
  }

  if (isAtStation) {
    return {
      type: 'at_station',
      color: 'green',
      label: 'At Station',
      description: 'Bus is waiting / stopped at the station (boarding active)',
      badgeBg: 'bg-emerald-500/15',
      badgeBorder: 'border-emerald-400/40',
      badgeText: 'text-emerald-400',
      glowColor: 'shadow-[0_0_12px_rgba(16,185,129,0.7)]',
    };
  }

  return {
    type: 'moving',
    color: 'red',
    label: 'Moving to Next Station',
    description: 'Bus is currently moving toward next station',
    badgeBg: 'bg-rose-500/15',
    badgeBorder: 'border-rose-400/40',
    badgeText: 'text-rose-400',
    glowColor: 'shadow-[0_0_12px_rgba(244,63,94,0.7)]',
  };
}

interface BusStatusIndicatorProps {
  telemetry: BusTelemetry;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}

export const BusStatusIndicator: React.FC<BusStatusIndicatorProps> = ({
  telemetry,
  size = 'md',
  showLabel = false,
  className = '',
  onClick,
  interactive = false,
}) => {
  const status = determineBusStatus(telemetry);

  const sizeStyles = {
    xs: { circle: 'w-4 h-4', icon: 'w-2.5 h-2.5', text: 'text-[9px]' },
    sm: { circle: 'w-5 h-5', icon: 'w-3 h-3', text: 'text-[10px]' },
    md: { circle: 'w-6 h-6', icon: 'w-3.5 h-3.5', text: 'text-xs' },
    lg: { circle: 'w-8 h-8', icon: 'w-4 h-4', text: 'text-sm' },
  }[size];

  const tooltipTitle = `${
    status.type === 'destination'
      ? '🟡 Destination / Very Close'
      : status.type === 'at_station'
      ? '🟢 At Station (Waiting/Boarding)'
      : '🔴 Moving to Next Station'
  }${onClick || interactive ? ' — Click to view status purpose & details' : ''}`;

  const renderIcon = () => {
    switch (status.type) {
      case 'destination':
        // 🟡 Yellow — Destination / Very Close: Location Pin with Check Mark
        return (
          <div
            className={`${sizeStyles.circle} rounded-full bg-amber-400 border border-amber-300 flex items-center justify-center shrink-0 ${status.glowColor} transition-transform ${
              onClick || interactive ? 'hover:scale-110 active:scale-95 cursor-pointer ring-2 ring-amber-400/40' : ''
            }`}
            title={tooltipTitle}
          >
            <svg
              className={`${sizeStyles.icon} text-slate-950`}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm-1.25 10.5l-3-3 1.41-1.41L10.75 9.68l4.84-4.84 1.41 1.41-6.25 6.25z" />
            </svg>
          </div>
        );

      case 'at_station':
        // 🟢 Green — At Station: Station check mark
        return (
          <div
            className={`${sizeStyles.circle} rounded-full bg-emerald-500 border border-emerald-300 flex items-center justify-center shrink-0 ${status.glowColor} transition-transform ${
              onClick || interactive ? 'hover:scale-110 active:scale-95 cursor-pointer ring-2 ring-emerald-400/40' : ''
            }`}
            title={tooltipTitle}
          >
            <svg
              className={`${sizeStyles.icon} text-slate-950`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        );

      case 'moving':
      default:
        // 🔴 Red — Moving to Next Station: Forward Route Arrow
        return (
          <div
            className={`${sizeStyles.circle} rounded-full bg-rose-500 border border-rose-300 flex items-center justify-center shrink-0 ${status.glowColor} transition-transform ${
              onClick || interactive ? 'hover:scale-110 active:scale-95 cursor-pointer ring-2 ring-rose-400/40' : ''
            }`}
            title={tooltipTitle}
          >
            <svg
              className={`${sizeStyles.icon} text-white`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </div>
        );
    }
  };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={`inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 rounded-full ${className}`}
        aria-label={tooltipTitle}
      >
        {renderIcon()}
        {showLabel && (
          <span
            className={`font-bold tracking-tight ${status.badgeText} ${sizeStyles.text}`}
          >
            {status.label}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {renderIcon()}
      {showLabel && (
        <span
          className={`font-bold tracking-tight ${status.badgeText} ${sizeStyles.text}`}
        >
          {status.label}
        </span>
      )}
    </div>
  );
};
