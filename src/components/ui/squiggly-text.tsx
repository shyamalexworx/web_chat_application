import React, { useId, useState, useEffect } from 'react';

export interface SquigglyTextProps {
  children: React.ReactNode;
  steps?: number;
  stepDuration?: number;
  scale?: number | [number, number];
  baseFrequency?: number;
  numOctaves?: number;
  as?: 'span' | 'div';
  className?: string;
  style?: React.CSSProperties;
}

export function SquigglyText({
  children,
  steps = 4,
  stepDuration = 160,
  scale = [2, 3.5],
  baseFrequency = 0.02,
  numOctaves = 3,
  as = 'span',
  className = '',
  style = {},
}: SquigglyTextProps) {
  const reactId = useId();
  const safeId = reactId.replace(/[:_]/g, '');
  const filterId = (i: number) => `squiggly-${safeId}-${i}`;

  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps);
    }, stepDuration);
    return () => clearInterval(timer);
  }, [steps, stepDuration]);

  const scaleAt = (i: number) =>
    Array.isArray(scale) ? scale[i % scale.length] : scale;

  const Wrapper = as === 'div' ? 'div' : 'span';

  return (
    <Wrapper
      style={{
        filter: `url(#${filterId(activeStep)})`,
        ...style,
      }}
      className={`inline-block ${className}`}
    >
      <svg
        aria-hidden
        className="pointer-events-none absolute h-0 w-0 overflow-hidden"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {Array.from({ length: steps }).map((_, i) => (
            <filter id={filterId(i)} key={i}>
              <feTurbulence
                baseFrequency={baseFrequency}
                numOctaves={numOctaves}
                result="noise"
                seed={i}
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={scaleAt(i)}
              />
            </filter>
          ))}
        </defs>
      </svg>
      {children}
    </Wrapper>
  );
}

export default SquigglyText;

