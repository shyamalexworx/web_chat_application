import React from 'react';

export interface HoverBorderGradientProps {
  children: React.ReactNode;
  containerClassName?: string;
  className?: string;
  as?: React.ElementType;
  duration?: number;
}

export const HoverBorderGradient: React.FC<HoverBorderGradientProps> = ({
  children,
  containerClassName = '',
  className = '',
  as: Component = 'div',
  duration = 5,
}) => {
  return (
    <Component
      className={`relative p-[1.5px] overflow-hidden rounded-3xl transition-all ${containerClassName}`}
    >
      {/* 1. Continuously Rotating Conic Gradient Beam traveling around the perimeter border */}
      <div
        className="absolute inset-[-100%] pointer-events-none animate-spin-slow"
        style={{
          animationDuration: `${duration}s`,
          background: `conic-gradient(from 0deg, transparent 0 320deg, #4F8CFF 340deg, #38BDF8 355deg, transparent 360deg)`,
        }}
      />

      {/* 2. Secondary soft ambient glow line */}
      <div
        className="absolute inset-[-100%] pointer-events-none opacity-40 blur-sm animate-spin-slow"
        style={{
          animationDuration: `${duration}s`,
          background: `conic-gradient(from 0deg, transparent 0 300deg, #2563EB 335deg, #60A5FA 360deg)`,
        }}
      />

      {/* 3. Inner Card Content Container */}
      <div className={`relative z-10 w-full h-full rounded-[23px] ${className}`}>
        {children}
      </div>
    </Component>
  );
};

export default HoverBorderGradient;

