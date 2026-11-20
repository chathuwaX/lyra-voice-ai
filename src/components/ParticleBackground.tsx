import React, { useEffect, useRef } from 'react';
import { ThemeConfig } from '../types';

interface ParticleBackgroundProps {
  theme: ThemeConfig;
}

interface Particle {
  x: number;
  y: number;
  radius: number;
  color: string;
  vx: number;
  vy: number;
  alpha: number;
  alphaSpeed: number;
  pulseOffset: number;
}

interface LightOrb {
  x: number;
  y: number;
  radius: number;
  baseRadius: number;
  color: string;
  vx: number;
  vy: number;
  alpha: number;
  pulseSpeed: number;
}

export const ParticleBackground: React.FC<ParticleBackgroundProps> = ({ theme }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
    };

    window.addEventListener('resize', handleResize);

    // Initialize small floating particles
    const particleCount = Math.floor(Math.min(width, 1400) / 22);
    const particles: Particle[] = [];
    const colors = theme.particleColors;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.2 + 0.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 0.35,
        vy: -Math.random() * 0.45 - 0.15, // Gentle zero-gravity upward drift
        alpha: Math.random() * 0.6 + 0.2,
        alphaSpeed: (Math.random() * 0.01 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }

    // Initialize 5 large translucent floating ambient light orbs
    const orbs: LightOrb[] = [];
    const orbColors = theme.particleColors;
    const orbCount = 5;

    for (let i = 0; i < orbCount; i++) {
      const baseRadius = Math.random() * 140 + 120;
      orbs.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: baseRadius,
        baseRadius,
        color: orbColors[i % orbColors.length],
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        alpha: Math.random() * 0.08 + 0.04,
        pulseSpeed: Math.random() * 0.015 + 0.008,
      });
    }

    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      // 1. Draw large ambient orbs with soft radial gradient
      for (const orb of orbs) {
        orb.x += orb.vx;
        orb.y += orb.vy;

        // Wrap around viewport edges gently
        if (orb.x < -orb.radius) orb.x = width + orb.radius;
        if (orb.x > width + orb.radius) orb.x = -orb.radius;
        if (orb.y < -orb.radius) orb.y = height + orb.radius;
        if (orb.y > height + orb.radius) orb.y = -orb.radius;

        orb.radius = orb.baseRadius + Math.sin(time * orb.pulseSpeed) * 35;

        const gradient = ctx.createRadialGradient(
          orb.x,
          orb.y,
          0,
          orb.x,
          orb.y,
          orb.radius
        );
        gradient.addColorStop(0, orb.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.save();
        ctx.globalAlpha = orb.alpha;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 2. Draw crisp antigravity stardust particles
      for (const p of particles) {
        p.x += p.vx + Math.sin(time + p.pulseOffset) * 0.25;
        p.y += p.vy;

        p.alpha += p.alphaSpeed;
        if (p.alpha > 0.8 || p.alpha < 0.15) {
          p.alphaSpeed = -p.alphaSpeed;
        }

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.save();
        ctx.globalAlpha = Math.max(0.05, Math.min(1, p.alpha));
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.radius * 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000"
      style={{ opacity: 0.95 }}
    />
  );
};
