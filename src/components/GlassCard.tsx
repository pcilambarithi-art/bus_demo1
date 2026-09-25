import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
  interactive?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  onClick,
  hoverEffect = false,
  interactive = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-[24px]
        backdrop-blur-[20px] -webkit-backdrop-blur-[20px]
        /* Dark mode glass styling */
        dark:bg-[rgba(15,23,42,0.65)] dark:border-[rgba(255,255,255,0.12)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.45)]
        /* Light mode glass styling */
        bg-[rgba(255,255,255,0.22)] border-[rgba(255,255,255,0.35)] shadow-[0_8px_30px_0_rgba(31,38,135,0.12)]
        border
        /* Top specular reflection highlight */
        before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[1px]
        before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:pointer-events-none
        transition-all duration-300 ease-out
        ${hoverEffect ? 'hover:border-cyan-500/30 hover:shadow-[0_12px_40px_rgba(6,182,212,0.15)] hover:-translate-y-0.5' : ''}
        ${interactive ? 'cursor-pointer active:scale-[0.98]' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};
