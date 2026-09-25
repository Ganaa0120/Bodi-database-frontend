'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { ThemeMode } from '@/lib/types';

interface BackgroundAmbientProps {
  themeMode: ThemeMode;
  backgroundImageSrc?: string;
}

interface Runner {
  trackIndex: number;
  progress: number;
  speed: number;
  length: number;
  color: string;
  lightColor: string;
  coreColor: string;
  glowColor: string;
  lightGlowColor: string;
  direction: 1 | -1;
  width: number;
}

interface IntersectionNode {
  x: number;
  y: number;
  baseRadius: number;
  pulsePhase: number;
  colorDark: string;
  colorLight: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  maxAlpha: number;
  pulseSpeed: number;
}

export const BackgroundAmbient: React.FC<BackgroundAmbientProps> = ({ themeMode, backgroundImageSrc }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const mouseTargetRef = useRef({ x: 0.5, y: 0.5 });
  const mouseCurrentRef = useRef({ x: 0.5, y: 0.5 });

  const isDark = themeMode === 'dark';

  useEffect(() => {
    if (imgRef.current?.complete) {
      setImageLoaded(true);
    }
  }, [backgroundImageSrc]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const nx = e.clientX / window.innerWidth;
      const ny = e.clientY / window.innerHeight;
      mouseTargetRef.current = { x: nx, y: ny };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initTracks();
    };

    window.addEventListener('resize', handleResize);

    type PathFn = (t: number, w: number, h: number) => { x: number; y: number };
    let tracks: PathFn[] = [];
    let nodes: IntersectionNode[] = [];
    let runners: Runner[] = [];
    let particles: Particle[] = [];

    const initTracks = () => {
      tracks = [
        (t, w, h) => ({ x: t * (w + 400) - 200, y: h * 0.18 + Math.sin(t * Math.PI * 2) * 35 }),
        (t, w, h) => ({ x: t * (w + 300) - 150, y: h * 0.08 + t * (h * 0.55) }),
        (t, w, h) => ({ x: t * (w + 400) - 200, y: h * 0.5 + Math.sin(t * Math.PI * 3) * 20 }),
        (t, w, h) => ({ x: (1 - t) * (w + 300) - 150, y: h * 0.85 - t * (h * 0.6) }),
        (t, w, h) => ({ x: t * (w + 400) - 200, y: h * 0.78 + Math.cos(t * Math.PI * 2) * 40 }),
        (t, w, h) => ({ x: (1 - t) * (w + 400) - 200, y: h * 0.32 + Math.sin(t * Math.PI) * 80 }),
      ];

      nodes = [
        { x: width * 0.15, y: height * 0.22, baseRadius: 3, pulsePhase: 0, colorDark: '#38bdf8', colorLight: '#0072ce' },
        { x: width * 0.35, y: height * 0.19, baseRadius: 2.5, pulsePhase: 1.5, colorDark: '#60a5fa', colorLight: '#f37021' },
        { x: width * 0.78, y: height * 0.26, baseRadius: 3.5, pulsePhase: 3.2, colorDark: '#38bdf8', colorLight: '#0072ce' },
        { x: width * 0.88, y: height * 0.42, baseRadius: 2.8, pulsePhase: 4.1, colorDark: '#818cf8', colorLight: '#2563eb' },
        { x: width * 0.22, y: height * 0.51, baseRadius: 3, pulsePhase: 0.8, colorDark: '#38bdf8', colorLight: '#f37021' },
        { x: width * 0.75, y: height * 0.52, baseRadius: 3.5, pulsePhase: 2.3, colorDark: '#60a5fa', colorLight: '#0072ce' },
        { x: width * 0.18, y: height * 0.74, baseRadius: 3, pulsePhase: 1.9, colorDark: '#38bdf8', colorLight: '#0284c7' },
        { x: width * 0.48, y: height * 0.79, baseRadius: 2.5, pulsePhase: 3.7, colorDark: '#818cf8', colorLight: '#f37021' },
        { x: width * 0.82, y: height * 0.76, baseRadius: 3.2, pulsePhase: 5.0, colorDark: '#38bdf8', colorLight: '#0072ce' },
      ];

      runners = [
        { trackIndex: 0, progress: 0.1, speed: 0.0028, length: 280, color: '#38bdf8', lightColor: '#0072ce', coreColor: '#ffffff', glowColor: 'rgba(56, 189, 248, 0.85)', lightGlowColor: 'rgba(0, 114, 206, 0.55)', direction: 1, width: 3.2 },
        { trackIndex: 0, progress: 0.65, speed: 0.002, length: 210, color: '#60a5fa', lightColor: '#0284c7', coreColor: '#ffffff', glowColor: 'rgba(96, 165, 250, 0.7)', lightGlowColor: 'rgba(2, 132, 199, 0.5)', direction: 1, width: 2.5 },
        { trackIndex: 1, progress: 0.3, speed: 0.0035, length: 310, color: '#00f2fe', lightColor: '#0072ce', coreColor: '#ffffff', glowColor: 'rgba(0, 242, 254, 0.9)', lightGlowColor: 'rgba(0, 114, 206, 0.6)', direction: 1, width: 3.5 },
        { trackIndex: 2, progress: 0.75, speed: 0.0022, length: 340, color: '#3b82f6', lightColor: '#1d4ed8', coreColor: '#ffffff', glowColor: 'rgba(59, 130, 246, 0.85)', lightGlowColor: 'rgba(29, 78, 216, 0.55)', direction: 1, width: 3.2 },
        { trackIndex: 3, progress: 0.2, speed: 0.0026, length: 250, color: '#818cf8', lightColor: '#2563eb', coreColor: '#ffffff', glowColor: 'rgba(129, 140, 248, 0.85)', lightGlowColor: 'rgba(37, 99, 235, 0.5)', direction: 1, width: 2.8 },
        { trackIndex: 4, progress: 0.45, speed: 0.0032, length: 320, color: '#38bdf8', lightColor: '#0072ce', coreColor: '#ffffff', glowColor: 'rgba(56, 189, 248, 0.9)', lightGlowColor: 'rgba(0, 114, 206, 0.6)', direction: 1, width: 3.2 },
        { trackIndex: 5, progress: 0.8, speed: 0.0021, length: 270, color: '#60a5fa', lightColor: '#0284c7', coreColor: '#ffffff', glowColor: 'rgba(96, 165, 250, 0.8)', lightGlowColor: 'rgba(2, 132, 199, 0.55)', direction: 1, width: 2.8 },
      ];

      particles = Array.from({ length: 36 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -0.2 - Math.random() * 0.45,
        size: 1 + Math.random() * 2.2,
        alpha: Math.random() * 0.6,
        maxAlpha: 0.35 + Math.random() * 0.55,
        pulseSpeed: 0.01 + Math.random() * 0.02,
      }));
    };

    initTracks();

    let lastTime = performance.now();

    const render = (time: number) => {
      lastTime = time;

      mouseCurrentRef.current.x += (mouseTargetRef.current.x - mouseCurrentRef.current.x) * 0.05;
      mouseCurrentRef.current.y += (mouseTargetRef.current.y - mouseCurrentRef.current.y) * 0.05;

      ctx.clearRect(0, 0, width, height);

      ctx.lineWidth = isDark ? 1 : 1.2;
      tracks.forEach((trackFn, idx) => {
        ctx.beginPath();
        const steps = 60;
        for (let i = 0; i <= steps; i++) {
          const pt = trackFn(i / steps, width, height);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.strokeStyle = isDark
          ? idx % 2 === 0
            ? 'rgba(56, 189, 248, 0.08)'
            : 'rgba(96, 165, 250, 0.06)'
          : idx % 2 === 0
            ? 'rgba(0, 114, 206, 0.18)'
            : 'rgba(37, 99, 235, 0.14)';
        ctx.stroke();
      });

      runners.forEach((runner) => {
        runner.progress += runner.speed;
        if (runner.progress > 1.2) {
          runner.progress = -0.15;
        }

        const trackFn = tracks[runner.trackIndex];
        if (!trackFn) return;

        const headPt = trackFn(Math.min(Math.max(runner.progress, 0), 1), width, height);
        const paramSpan = 0.13;

        const strokeColor = isDark ? runner.color : runner.lightColor;
        const glowColor = isDark ? runner.glowColor : runner.lightGlowColor;

        if (runner.progress > 0 && runner.progress < 1.1) {
          const numTailSteps = 24;
          for (let s = 0; s < numTailSteps; s++) {
            const t1 = runner.progress - (paramSpan * (s + 1)) / numTailSteps;
            const t2 = runner.progress - (paramSpan * s) / numTailSteps;
            if (t2 < 0) continue;

            const p1 = trackFn(Math.max(t1, 0), width, height);
            const p2 = trackFn(Math.max(t2, 0), width, height);

            const segmentAlpha = (1 - s / numTailSteps) * (isDark ? 0.95 : 0.85);

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = strokeColor;
            ctx.globalAlpha = segmentAlpha;
            ctx.lineWidth = runner.width * (1 - s / (numTailSteps * 1.4));
            ctx.lineCap = 'round';
            ctx.stroke();
          }

          ctx.globalAlpha = 1;
          const flareRadius = isDark ? 20 : 16;
          const glowGrad = ctx.createRadialGradient(headPt.x, headPt.y, 0, headPt.x, headPt.y, flareRadius);
          glowGrad.addColorStop(0, runner.coreColor);
          glowGrad.addColorStop(0.3, strokeColor);
          glowGrad.addColorStop(0.75, glowColor);
          glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(headPt.x, headPt.y, flareRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = runner.coreColor;
          ctx.beginPath();
          ctx.arc(headPt.x, headPt.y, runner.width * 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      nodes.forEach((node) => {
        node.pulsePhase += 0.035;
        const pulse = (Math.sin(node.pulsePhase) + 1) / 2;
        const radius = node.baseRadius + pulse * 1.5;
        const nodeColor = isDark ? node.colorDark : node.colorLight;

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius * (2.2 + pulse * 1.8), 0, Math.PI * 2);
        ctx.strokeStyle = nodeColor;
        ctx.globalAlpha = (1 - pulse) * (isDark ? 0.5 : 0.45);
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.globalAlpha = isDark ? 0.8 : 0.85;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 1;
        ctx.fill();
      });

      const mx = mouseCurrentRef.current.x * width;
      const my = mouseCurrentRef.current.y * height;

      const mouseGlow = ctx.createRadialGradient(mx, my, 0, mx, my, 130);
      mouseGlow.addColorStop(0, isDark ? 'rgba(56, 189, 248, 0.16)' : 'rgba(0, 114, 206, 0.14)');
      mouseGlow.addColorStop(0.5, isDark ? 'rgba(96, 165, 250, 0.06)' : 'rgba(56, 189, 248, 0.05)');
      mouseGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = mouseGlow;
      ctx.beginPath();
      ctx.arc(mx, my, 130, 0, Math.PI * 2);
      ctx.fill();

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha += p.pulseSpeed;

        if (p.alpha > p.maxAlpha || p.alpha < 0.05) {
          p.pulseSpeed = -p.pulseSpeed;
        }

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.globalAlpha = Math.max(0, Math.min(p.alpha, 1)) * (isDark ? 0.75 : 0.65);
        ctx.fillStyle = isDark ? '#93c5fd' : '#0072ce';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isDark]);

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    setMousePos({ x: nx, y: ny });
  };

  const parallaxX = (mousePos.x - 0.5) * 24;
  const parallaxY = (mousePos.y - 0.5) * 16;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0" onMouseMove={handleContainerMouseMove}>
      <div className={`absolute inset-0 transition-colors duration-700 ease-in-out ${isDark ? 'bg-[#060a17]' : 'bg-[#eef4fb]'}`} />

      <div
        className="absolute -inset-8 transition-transform duration-700 ease-out will-change-transform"
        style={{ transform: `scale(1.06) translate(${parallaxX}px, ${parallaxY}px)` }}
      >
        {backgroundImageSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={backgroundImageSrc}
            alt=""
            onLoad={() => setImageLoaded(true)}
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover object-center transition-all duration-1000 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            } ${isDark ? 'brightness-[0.72] contrast-[1.12]' : 'brightness-[1.04] contrast-[1.08] saturate-[1.12]'}`}
          />
        )}

        {isDark ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-[#060a17]/80 via-[#070e24]/75 to-[#050814]/92 mix-blend-multiply" />
            <div className="absolute inset-0 bg-radial-[circle_at_50%_30%,rgba(30,64,175,0.25)_0%,rgba(6,10,23,0.85)_80%]" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-blue-50/50 to-slate-100/75 mix-blend-overlay" />
            <div className="absolute inset-0 bg-gradient-to-tr from-sky-100/60 via-white/75 to-blue-50/70" />
            <div className="absolute inset-0 bg-radial-[circle_at_50%_25%,rgba(255,255,255,0.7)_0%,rgba(224,242,254,0.4)_60%,rgba(238,244,252,0.8)_100%]" />
          </>
        )}
      </div>

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: isDark ? 0.95 : 0.9 }} />

      <div
        className="absolute -top-[10%] -left-[5%] w-[550px] h-[550px] rounded-full blur-[140px] pointer-events-none"
        style={{
          background: isDark
            ? 'radial-gradient(circle, rgba(29, 78, 216, 0.28) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(0, 114, 206, 0.2) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute -bottom-[10%] -right-[5%] w-[600px] h-[600px] rounded-full blur-[150px] pointer-events-none"
        style={{
          background: isDark
            ? 'radial-gradient(circle, rgba(14, 165, 233, 0.22) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, transparent 70%)',
        }}
      />

      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${
          isDark
            ? 'bg-radial-[circle_at_center,transparent_35%,rgba(4,7,15,0.75)_100%]'
            : 'bg-radial-[circle_at_center,transparent_45%,rgba(148,163,184,0.22)_100%]'
        }`}
      />
    </div>
  );
};