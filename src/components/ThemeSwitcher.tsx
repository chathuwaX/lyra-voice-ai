import React from 'react';
import { ThemeMode, ThemeConfig } from '../types';
import { THEMES } from '../constants/themes';
import { Sparkles, Briefcase, Sun, Orbit } from 'lucide-react';

interface ThemeSwitcherProps {
  currentTheme: ThemeMode;
  onSelectTheme: (mode: ThemeMode) => void;
  activeConfig: ThemeConfig;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  currentTheme,
  onSelectTheme,
  activeConfig,
}) => {
  const options: { id: ThemeMode; icon: React.ReactNode; label: string }[] = [
    { id: 'antigravity', icon: <Sparkles className="w-3.5 h-3.5" />, label: 'Normal' },
    { id: 'professional', icon: <Briefcase className="w-3.5 h-3.5" />, label: 'Professional' },
    { id: 'friendly', icon: <Sun className="w-3.5 h-3.5" />, label: 'Warm' },
    { id: 'futuristic', icon: <Orbit className="w-3.5 h-3.5" />, label: 'Futuristic' },
  ];

  return (
    <div
      className="flex items-center gap-1 p-1 rounded-full backdrop-blur-xl border transition-all duration-300 shadow-lg"
      style={{
        backgroundColor: activeConfig.cardBg,
        borderColor: 'rgba(255,255,255,0.1)',
      }}
    >
      {options.map((opt) => {
        const isActive = currentTheme === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onSelectTheme(opt.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              isActive
                ? 'bg-white/20 text-white shadow-sm border border-white/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
            title={THEMES[opt.id].tagline}
          >
            <span className={isActive ? 'text-sky-300' : ''}>{opt.icon}</span>
            <span className="hidden md:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
