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

export function determineBusStatus(telemetry: BusTelemetry): BusStatusInfo {
  const isNearDestination =
    telemetry.distanceToStudentStopMeters <= 300 ||
    telemetry.status === 'ARRIVING';
  const isAtStation =
    telemetry.status === 'ARRIVED' ||
    (telemetry.speedKmh <= 2 && telemetry.distanceToNextStopMeters <= 60);

  if (isNearDestination) {
    return {
      type: 'destination',
      color: 'yellow',
      label: 'Destination / Very Close',
      description: 'Bus has reached or is very close to destination',
      badgeBg: 'bg-amber-400/15',
      badgeBorder: 'border-amber-400/40',
      badgeText: 'text-amber-400',
      glowColor: 'shadow-[0_0_12px_rgba(245,158,11,0.6)]',
    };
  }

  if (isAtStation) {
    return {
      type: 'at_station',
      color: 'green',
      label: 'At Station',
      description: 'Bus is waiting / stopped at the station',
      badgeBg: 'bg-emerald-500/15',
      badgeBorder: 'border-emerald-400/40',
      badgeText: 'text-emerald-400',
      glowColor: 'shadow-[0_0_12px_rgba(16,185,129,0.6)]',
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
    glowColor: 'shadow-[0_0_12px_rgba(244,63,94,0.6)]',
  };
}

interface BusStatusIndicatorProps {
  telemetry: BusTelemetry;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const BusStatusIndicator: React.FC<BusStatusIndicatorProps> = ({
  telemetry,
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  const status = determineBusStatus(telemetry);

  const sizeStyles = {
    xs: { circle: 'w-4 h-4', icon: 'w-2.5 h-2.5', text: 'text-[9px]' },
    sm: { circle: 'w-5 h-5', icon: 'w-3 h-3', text: 'text-[10px]' },
    md: { circle: 'w-6 h-6', icon: 'w-3.5 h-3.5', text: 'text-xs' },
    lg: { circle: 'w-8 h-8', icon: 'w-4 h-4', text: 'text-sm' },
  }[size];

  const renderIcon = () => {
    switch (status.type) {
      case 'destination':
        // 🟡 Yellow — Destination / Very Close: Location Pin with Check Mark
        return (
          <div
            className={`${sizeStyles.circle} rounded-full bg-amber-400 border border-amber-300 flex items-center justify-center shrink-0 ${status.glowColor} transition-all`}
            title="🟡 Yellow — Destination / Very Close"
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
            className={`${sizeStyles.circle} rounded-full bg-emerald-500 border border-emerald-300 flex items-center justify-center shrink-0 ${status.glowColor} transition-all`}
            title="🟢 Green — At Station"
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
            className={`${sizeStyles.circle} rounded-full bg-rose-500 border border-rose-300 flex items-center justify-center shrink-0 ${status.glowColor} transition-all`}
            title="🔴 Red — Moving to Next Station"
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

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
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
