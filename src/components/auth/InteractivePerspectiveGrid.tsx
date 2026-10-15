import React, { useEffect, useRef, useCallback } from 'react';

interface InteractivePerspectiveGridProps {
  className?: string;
  children?: React.ReactNode;
}

export const InteractivePerspectiveGrid: React.FC<InteractivePerspectiveGridProps> = ({
  className = '',
  children,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Mouse coordinates with smoothing
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const targetMouseRef = useRef({ x: -1000, y: -1000 });
  const isHoveringRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    targetMouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    isHoveringRef.current = true;
  }, []);

  const handleMouseEnter = useCallback(() => {
    isHoveringRef.current = true;
  }, []);

  const handleMouseLeave = useCallback(() => {
    isHoveringRef.current = false;
    targetMouseRef.current = { x: -1000, y: -1000 };
  }, []);

  // Handle touch events for responsive mobile interaction
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !e.touches[0]) return;
    targetMouseRef.current = {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
    };
    isHoveringRef.current = true;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !e.touches[0]) return;
    targetMouseRef.current = {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
    };
    isHoveringRef.current = true;
  }, []);

  const handleTouchEnd = useCallback(() => {
    isHoveringRef.current = false;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = window.devicePixelRatio || 1;

    const resize = () => {
      if (!containerRef.current || !canvas) return;
      const rect = containerRef.current.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = window.devicePixelRatio || 1;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (mouseRef.current.x === -1000) {
        mouseRef.current = { x: width * 0.5, y: height * 0.5 };
        targetMouseRef.current = { x: width * 0.5, y: height * 0.5 };
      }
    };

    resize();
    window.addEventListener('resize', resize);

    // Main animation loop
    const render = () => {
      timeRef.current += 0.01;
      const t = timeRef.current;

      // Smooth mouse tracking with responsive damping
      if (isHoveringRef.current) {
        mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.08;
        mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.08;
      } else {
        // Dynamic ambient idle movement
        const idleX = width * 0.5 + Math.sin(t * 0.6) * (width * 0.14);
        const idleY = height * 0.5 + Math.cos(t * 0.5) * (height * 0.1);
        mouseRef.current.x += (idleX - mouseRef.current.x) * 0.03;
        mouseRef.current.y += (idleY - mouseRef.current.y) * 0.03;
      }

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      ctx.clearRect(0, 0, width, height);

      // Parallax horizon tilt based on cursor
      const tiltX = (mx - width * 0.5) * 0.04;
      const tiltY = (my - height * 0.5) * 0.03;
      const cx = width * 0.5 + tiltX;
      const cy = height * 0.5 + tiltY;

      const isLight = document.documentElement.classList.contains('light') || 
                      document.documentElement.getAttribute('data-theme') === 'light';

      // 1. Base background with soft depth
      const bgRadial = ctx.createRadialGradient(cx, cy, 50, cx, cy, Math.max(width, height) * 0.85);
      if (isLight) {
        bgRadial.addColorStop(0, '#FFFFFF');
        bgRadial.addColorStop(0.55, '#F8FAFF');
        bgRadial.addColorStop(1, '#EDF2FE');
      } else {
        bgRadial.addColorStop(0, '#0F131C');
        bgRadial.addColorStop(0.55, '#0B0D13');
        bgRadial.addColorStop(1, '#06070A');
      }
      ctx.fillStyle = bgRadial;
      ctx.fillRect(0, 0, width, height);

      // 2. Interactive Spotlight following cursor / touch
      if (mx > 0 && my > 0) {
        const cursorSpotlight = ctx.createRadialGradient(mx, my, 0, mx, my, 340);
        if (isLight) {
          cursorSpotlight.addColorStop(0, 'rgba(37, 99, 235, 0.14)');
          cursorSpotlight.addColorStop(0.5, 'rgba(37, 99, 235, 0.05)');
          cursorSpotlight.addColorStop(1, 'transparent');
        } else {
          cursorSpotlight.addColorStop(0, 'rgba(79, 140, 255, 0.18)');
          cursorSpotlight.addColorStop(0.5, 'rgba(79, 140, 255, 0.06)');
          cursorSpotlight.addColorStop(1, 'transparent');
        }
        ctx.fillStyle = cursorSpotlight;
        ctx.fillRect(0, 0, width, height);
      }

      // 3. Perspective Grid Configuration
      const numRays = 36;
      const numTransverse = 22;
      const depthCurve = 2.0;

      // Calculate rays
      const rayPoints: { endTopX: number; endBottomX: number }[] = [];
      for (let i = 0; i <= numRays; i++) {
        const u = (i / numRays) * 2 - 1;
        const spread = u * width * 1.6;
        rayPoints.push({
          endTopX: cx + spread,
          endBottomX: cx + spread,
        });
      }

      // Calculate transverse (depth) horizontal lines
      const transverseLines: { y: number; side: 'top' | 'bottom'; factor: number }[] = [];
      for (let j = 1; j <= numTransverse; j++) {
        const p = Math.pow(j / numTransverse, depthCurve);
        transverseLines.push({ y: cy + p * (height - cy + 80), side: 'bottom', factor: p });
        transverseLines.push({ y: cy - p * (cy + 80), side: 'top', factor: p });
      }

      // 4. Draw Perspective Rays (Crisp, website brand blue lines)
      ctx.lineWidth = 1;
      rayPoints.forEach((ray) => {
        const midY = my >= cy ? cy + (height - cy) * 0.5 : cy - cy * 0.5;
        const midX = cx + (ray.endBottomX - cx) * 0.5;
        const distToCursor = Math.hypot(mx - midX, my - midY);
        const cursorInfluence = Math.max(0, 1 - distToCursor / 280);

        const alpha = (0.22 + cursorInfluence * 0.26) * (isLight ? 0.85 : 1);

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ray.endTopX, -80);
        ctx.moveTo(cx, cy);
        ctx.lineTo(ray.endBottomX, height + 80);

        ctx.strokeStyle = isLight
          ? `rgba(37, 99, 235, ${alpha * 1.35})`
          : `rgba(79, 140, 255, ${alpha})`;
        ctx.stroke();
      });

      // 5. Draw Transverse Horizontal Lines
      transverseLines.forEach((tLine) => {
        const distToCursor = Math.abs(my - tLine.y);
        const cursorInfluence = Math.max(0, 1 - distToCursor / 200);
        const horizonFade = Math.min(1, Math.abs(tLine.y - cy) / 35);

        const alpha = (0.20 + cursorInfluence * 0.22) * Math.max(0.45, horizonFade) * (isLight ? 0.85 : 1);

        ctx.beginPath();
        ctx.moveTo(0, tLine.y);
        ctx.lineTo(width, tLine.y);
        ctx.strokeStyle = isLight
          ? `rgba(37, 99, 235, ${alpha * 1.30})`
          : `rgba(79, 140, 255, ${alpha})`;
        ctx.stroke();
      });

      // 6. Draw Grid Intersection Points (Visible nodes)
      const dotStep = 2;
      for (let i = 0; i < rayPoints.length; i += dotStep) {
        const ray = rayPoints[i];
        for (let j = 0; j < transverseLines.length; j += 2) {
          const tLine = transverseLines[j];
          const isBottom = tLine.side === 'bottom';
          const targetX = isBottom ? ray.endBottomX : ray.endTopX;
          const targetY = isBottom ? height + 80 : -80;

          const factor = (tLine.y - cy) / (targetY - cy);
          const x = cx + (targetX - cx) * factor;

          if (x < -10 || x > width + 10) continue;

          const dist = Math.hypot(mx - x, my - tLine.y);
          const proximity = Math.max(0, 1 - dist / 180);

          ctx.beginPath();
          ctx.arc(x, tLine.y, 1.4, 0, Math.PI * 2);
          ctx.fillStyle = isLight
            ? `rgba(37, 99, 235, ${0.35 + proximity * 0.45})`
            : `rgba(110, 170, 255, ${0.30 + proximity * 0.50})`;
          ctx.fill();
        }
      }

      // 7. Bright Horizon Line
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(width, cy);
      ctx.strokeStyle = isLight ? 'rgba(37, 99, 235, 0.50)' : 'rgba(79, 140, 255, 0.40)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // 8. Soft Edge Vignette (Zero black shading in light mode)
      const vignette = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        Math.min(width, height) * 0.35,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.85
      );
      vignette.addColorStop(0, 'transparent');
      if (isLight) {
        vignette.addColorStop(0.70, 'transparent');
        vignette.addColorStop(1, 'rgba(219, 234, 254, 0.25)');
      } else {
        vignette.addColorStop(0.65, 'rgba(6, 7, 10, 0.25)');
        vignette.addColorStop(1, 'rgba(6, 7, 10, 0.65)');
      }
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative w-full h-full min-h-screen overflow-hidden bg-slate-50 dark:bg-[#07090D] ${className}`}
    >
      {/* Subtle Perspective Canvas (Fixed in viewport background) */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Decorative top & bottom ambient light sweeps (ONLY in dark mode, completely absent in light mode) */}
      <div className="hidden dark:block fixed top-0 inset-x-0 h-28 bg-gradient-to-b from-[#0B0D12] to-transparent pointer-events-none z-1" />
      <div className="hidden dark:block fixed bottom-0 inset-x-0 h-28 bg-gradient-to-t from-[#07090D] to-transparent pointer-events-none z-1" />

      {/* Foreground Content (Sign In / Sign Up Card with clean centering) */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-3 sm:p-4">
        {children}
      </div>
    </div>
  );
};

