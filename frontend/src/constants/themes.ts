import { ThemeConfig, ThemeMode } from '../types';

export const THEMES: Record<ThemeMode, ThemeConfig> = {
  dark: {
    id: 'dark',
    name: 'Dark Theme',
    tagline: 'Deep space aesthetic with neon azure radiance',
    bgColor: '#030712',
    gradientBg:
      'radial-gradient(ellipse at 50% 40%, rgba(14, 165, 233, 0.18) 0%, rgba(2, 6, 23, 0.8) 60%, #020617 100%)',
    accentGlow: 'rgba(56, 189, 248, 0.45)',
    ringColor: 'rgba(56, 189, 248, 0.8)',
    particleColors: ['#38bdf8', '#7dd3fc', '#bae6fd', '#ffffff', '#0284c7'],
    cardBg: 'rgba(15, 23, 42, 0.78)',
    cardBorder: 'rgba(255, 255, 255, 0.12)',
    avatarBorder: 'border-sky-400/40 shadow-[0_0_50px_rgba(56,189,248,0.35)]',
    textColor: '#f8fafc',
    textMuted: '#94a3b8',
    headerBorder: 'rgba(255, 255, 255, 0.1)',
    isDark: true,
  },
  light: {
    id: 'light',
    name: 'Light Theme',
    tagline: 'Clean bright daylight studio with soft sky glow',
    bgColor: '#f1f5f9',
    gradientBg:
      'radial-gradient(ellipse at 50% 40%, rgba(56, 189, 248, 0.22) 0%, rgba(241, 245, 249, 0.85) 60%, #e2e8f0 100%)',
    accentGlow: 'rgba(14, 165, 233, 0.35)',
    ringColor: 'rgba(2, 132, 199, 0.8)',
    particleColors: ['#0284c7', '#0ea5e9', '#38bdf8', '#64748b', '#94a3b8'],
    cardBg: 'rgba(255, 255, 255, 0.85)',
    cardBorder: 'rgba(0, 0, 0, 0.08)',
    avatarBorder: 'border-sky-500/50 shadow-[0_0_50px_rgba(14,165,233,0.3)]',
    textColor: '#0f172a',
    textMuted: '#64748b',
    headerBorder: 'rgba(0, 0, 0, 0.08)',
    isDark: false,
  },
};
