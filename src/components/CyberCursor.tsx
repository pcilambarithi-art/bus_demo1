import React, { useEffect, useRef, useState } from 'react';

export const CyberCursor: React.FC = () => {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only enable on devices that support hover (desktop with fine mouse pointer)
    const isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!isDesktop) return;

    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      setIsVisible(true);

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      }

      // Check for interactive targets
      const target = e.target as HTMLElement | null;
      if (target) {
        const isInteractive = !!target.closest('button, a, input, select, textarea, [role="button"], .cursor-pointer');
        setIsLocked(isInteractive);
      }
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    let animId: number;
    const render = () => {
      // Smooth lerp trailing for the outer ring
      ringX += (mouseX - ringX) * 0.2;
      ringY += (mouseY - ringY) * 0.2;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      }

      animId = requestAnimationFrame(render);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Hidden on mobile / touch
  return (
    <div
      className={`pointer-events-none fixed inset-0 z-50 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } hidden lg:block`}
    >
      {/* Precision Inner Dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 -ml-1 -mt-1 w-2 h-2 rounded-full bg-cyber-cyan shadow-neon-cyan transition-transform duration-75 ease-out"
      />

      {/* Trailing Targeting Reticle */}
      <div
        ref={ringRef}
        className={`fixed top-0 left-0 -ml-4 -mt-4 rounded-full border transition-all duration-200 ease-out flex items-center justify-center ${
          isLocked
            ? 'w-10 h-10 -ml-5 -mt-5 border-cyber-cyan bg-cyber-cyan/15 scale-110 shadow-neon-cyan rotate-45'
            : 'w-8 h-8 border-cyber-cyan/40 bg-transparent'
        }`}
      >
        {isLocked && (
          <span className="text-[7px] font-mono text-cyber-cyan absolute -bottom-3 tracking-widest uppercase">
            LOCKED
          </span>
        )}
      </div>
    </div>
  );
};

export default CyberCursor;
