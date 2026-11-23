import React from 'react';
import { ThemeMode, ThemeConfig } from '../types';
import { Moon, Sun } from 'lucide-react';

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
  const isDark = currentTheme === 'dark';

  return (
    <div
      className="flex items-center p-1 rounded-full backdrop-blur-xl border transition-all duration-300 shadow-md"
      style={{
        backgroundColor: activeConfig.cardBg,
        borderColor: activeConfig.cardBorder || (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'),
      }}
    >
      <button
        type="button"
        onClick={() => onSelectTheme('dark')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
          isDark
            ? 'bg-slate-800 text-sky-300 shadow-sm border border-sky-400/30'
            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
        }`}
        title="Dark Background Theme"
      >
        <Moon className="w-3.5 h-3.5 text-sky-400" />
        <span>Dark</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTheme('light')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
          !isDark
            ? 'bg-white text-amber-600 shadow-sm border border-amber-300/50'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
        }`}
        title="Light Background Theme"
      >
        <Sun className="w-3.5 h-3.5 text-amber-500" />
        <span>Light</span>
      </button>
    </div>
  );
};
