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
      timeRef.current += 0.008;
      const t = timeRef.current;

      // Extremely smooth mouse tracking with damping
      if (isHoveringRef.current) {
        mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.05;
        mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.05;
      } else {
        // Very gentle, imperceptible idle breathing
        const idleX = width * 0.5 + Math.sin(t * 0.5) * (width * 0.08);
        const idleY = height * 0.5 + Math.cos(t * 0.4) * (height * 0.06);
        mouseRef.current.x += (idleX - mouseRef.current.x) * 0.02;
        mouseRef.current.y += (idleY - mouseRef.current.y) * 0.02;
      }

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      ctx.clearRect(0, 0, width, height);

      // Micro-parallax tilt: extremely subtle and smooth
      const tiltX = (mx - width * 0.5) * 0.015;
      const tiltY = (my - height * 0.5) * 0.012;
      const cx = width * 0.5 + tiltX;
      const cy = height * 0.5 + tiltY;

      // 1. Dark base background with soft ambient vignette
      const bgRadial = ctx.createRadialGradient(cx, cy, 40, cx, cy, Math.max(width, height) * 0.75);
      bgRadial.addColorStop(0, 'rgba(15, 18, 26, 0.45)');
      bgRadial.addColorStop(0.6, 'rgba(11, 13, 18, 0.9)');
      bgRadial.addColorStop(1, '#07090D');
      ctx.fillStyle = bgRadial;
      ctx.fillRect(0, 0, width, height);

      // 2. Very subtle ambient flashlight glow following cursor (no harsh laser)
      if (mx > 0 && my > 0) {
        const cursorSpotlight = ctx.createRadialGradient(mx, my, 0, mx, my, 280);
        cursorSpotlight.addColorStop(0, 'rgba(79, 140, 255, 0.05)');
        cursorSpotlight.addColorStop(0.5, 'rgba(79, 140, 255, 0.015)');
        cursorSpotlight.addColorStop(1, 'transparent');
        ctx.fillStyle = cursorSpotlight;
        ctx.fillRect(0, 0, width, height);
      }

      // 3. Perspective Grid Configuration (dual-plane ceiling and floor like Image 1)
      const numRays = 34; // Radial lines radiating from horizon
      const numTransverse = 20; // Horizontal perspective lines per half
      const depthCurve = 2.0;

      // Calculate rays
      const rayPoints: { endTopX: number; endBottomX: number }[] = [];
      for (let i = 0; i <= numRays; i++) {
        const u = (i / numRays) * 2 - 1; // -1 to 1
        const spread = u * width * 1.5;
        rayPoints.push({
          endTopX: cx + spread,
          endBottomX: cx + spread,
        });
      }

      // Calculate transverse (depth) horizontal lines
      const transverseLines: { y: number; side: 'top' | 'bottom'; factor: number }[] = [];
      for (let j = 1; j <= numTransverse; j++) {
        const p = Math.pow(j / numTransverse, depthCurve);
        transverseLines.push({ y: cy + p * (height - cy + 60), side: 'bottom', factor: p });
        transverseLines.push({ y: cy - p * (cy + 60), side: 'top', factor: p });
      }

      // 4. Draw Perspective Rays (Subtle, uniform slate lines, zero laser lights)
      ctx.lineWidth = 1;
      rayPoints.forEach((ray) => {
        // Calculate very subtle proximity glow
        const midY = my >= cy ? cy + (height - cy) * 0.4 : cy - cy * 0.4;
        const midX = cx + (ray.endBottomX - cx) * 0.4;
        const distToCursor = Math.hypot(mx - midX, my - midY);
        const cursorInfluence = Math.max(0, 1 - distToCursor / 260);

        // Alpha stays between 0.06 and 0.12 (soft and subtle)
        const alpha = 0.06 + cursorInfluence * 0.06;

        ctx.beginPath();
        // Top ray
        ctx.moveTo(cx, cy);
        ctx.lineTo(ray.endTopX, -60);
        // Bottom ray
        ctx.moveTo(cx, cy);
        ctx.lineTo(ray.endBottomX, height + 60);

        ctx.strokeStyle = `rgba(160, 175, 200, ${alpha})`;
        ctx.stroke();
      });

      // 5. Draw Transverse Horizontal Depth Lines (Zero bright borders, gentle perspective fade)
      transverseLines.forEach((tLine) => {
        const distToCursor = Math.abs(my - tLine.y);
        const cursorInfluence = Math.max(0, 1 - distToCursor / 180);
        const horizonFade = Math.min(1, Math.abs(tLine.y - cy) / 45);

        // Alpha stays between 0.05 and 0.11
        const alpha = (0.05 + cursorInfluence * 0.06) * horizonFade;

        ctx.beginPath();
        ctx.moveTo(0, tLine.y);
        ctx.lineTo(width, tLine.y);
        ctx.strokeStyle = `rgba(160, 175, 200, ${alpha})`;
        ctx.stroke();
      });

      // 6. Draw Intersection Dots (Tiny 1px delicate points, no neon halos)
      const dotStep = 2;
      for (let i = 0; i < rayPoints.length; i += dotStep) {
        const ray = rayPoints[i];
        for (let j = 0; j < transverseLines.length; j += 2) {
          const tLine = transverseLines[j];
          const isBottom = tLine.side === 'bottom';
          const targetX = isBottom ? ray.endBottomX : ray.endTopX;
          const targetY = isBottom ? height + 60 : -60;

          const factor = (tLine.y - cy) / (targetY - cy);
          const x = cx + (targetX - cx) * factor;

          if (x < -10 || x > width + 10) continue;

          const dist = Math.hypot(mx - x, my - tLine.y);
          const proximity = Math.max(0, 1 - dist / 160);

          ctx.beginPath();
          ctx.arc(x, tLine.y, 0.9, 0, Math.PI * 2);
          // Very soft dot opacity: 0.12 to 0.24 max near cursor
          ctx.fillStyle = `rgba(160, 175, 200, ${0.12 + proximity * 0.12})`;
          ctx.fill();
        }
      }

      // 7. Subtle Horizon Line
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(width, cy);
      ctx.strokeStyle = 'rgba(79, 140, 255, 0.08)';
      ctx.stroke();

      // 8. Soft Center Vignette Mask to guarantee maximum clarity for login card
      const vignette = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        Math.min(width, height) * 0.2,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.65
      );
      vignette.addColorStop(0, 'rgba(11, 13, 18, 0.4)');
      vignette.addColorStop(0.7, 'rgba(11, 13, 18, 0.85)');
      vignette.addColorStop(1, 'rgba(7, 9, 13, 0.98)');
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
      className={`relative w-full h-full min-h-screen overflow-hidden bg-[#07090D] ${className}`}
    >
      {/* Subtle Perspective Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Decorative top & bottom ambient light sweeps */}
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[#0B0D12] via-transparent to-transparent pointer-events-none z-1" />
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#07090D] via-transparent to-transparent pointer-events-none z-1" />

      {/* Foreground Content (Sign In / Sign Up Card) */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
};
