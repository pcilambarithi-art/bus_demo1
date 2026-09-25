import React, { useEffect, useState, useRef } from 'react';

interface EtaDisplayProps {
  minutes: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const EtaDisplay: React.FC<EtaDisplayProps> = ({
  minutes,
  className = '',
  size = 'md',
}) => {
  const [displayValue, setDisplayValue] = useState(minutes);
  const [animating, setAnimating] = useState(false);
  const prevValueRef = useRef(minutes);

  useEffect(() => {
    if (minutes !== prevValueRef.current) {
      setAnimating(true);
      const timer = setTimeout(() => {
        setDisplayValue(minutes);
        prevValueRef.current = minutes;
        setAnimating(false);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [minutes]);

  const sizeClasses = {
    sm: 'text-base font-semibold',
    md: 'text-2xl font-bold',
    lg: 'text-4xl font-extrabold tracking-tight',
  }[size];

  const displayText = displayValue <= 0 ? 'Now' : `${displayValue} min`;

  return (
    <div className={`relative inline-flex items-center overflow-hidden ${className}`}>
      <span
        className={`font-mono transition-all duration-300 ease-out inline-block ${sizeClasses} ${
          animating
            ? 'opacity-0 -translate-y-3 scale-90 blur-[2px]'
            : 'opacity-100 translate-y-0 scale-100 blur-0'
        }`}
      >
        {displayText}
      </span>
    </div>
  );
};
