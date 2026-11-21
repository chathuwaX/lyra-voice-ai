import React from 'react';
import { AvatarState, ThemeConfig } from '../types';
import {
  VolumeX,
  Sparkles,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { HumanCanvas } from './digital-human/HumanCanvas';

interface AvatarStageProps {
  avatarState: AvatarState;
  theme: ThemeConfig;
  audioLevel: number; // 0 to 1
  customAvatarUrl?: string | null;
  onUploadAvatar?: (dataUrl: string | null) => void;
  onStopSpeaking: () => void;
  isHandsFree?: boolean;
  lastAssistantText?: string;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const AvatarStage: React.FC<AvatarStageProps> = ({
  avatarState,
  theme,
  audioLevel,
  customAvatarUrl,
  onStopSpeaking,
  isHandsFree,
  lastAssistantText,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const avatarSrc = customAvatarUrl || '/avatar.png';
  const isSpeaking = avatarState === 'speaking';

  // Calculate audio-reactive scale and glow boost
  const audioReactiveScale =
    avatarState === 'listening'
      ? 1 + audioLevel * 0.08
      : avatarState === 'speaking'
      ? 1.025 + Math.sin(Date.now() / 150) * 0.02
      : 1;

  return (
    <>
      {/* Stage Container */}
      <div
        className={`relative flex flex-col items-center justify-center select-none z-10 transition-all duration-500 ${
          isFullscreen ? 'py-2 w-full max-w-4xl' : 'py-6 w-full'
        }`}
      >
        {/* Fullscreen Close / Exit Floating Button */}
        {isFullscreen && onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-semibold backdrop-blur-xl border border-white/25 transition-all shadow-2xl active:scale-95"
            title="Exit Fullscreen Mode"
          >
            <Minimize2 className="w-4 h-4 text-cyan-400" />
            <span>Exit Fullscreen</span>
          </button>
        )}

        {/* Outer ambient glow backlight */}
        <div
          className="absolute rounded-full pointer-events-none transition-all duration-700 ease-out"
          style={{
            width: isFullscreen ? '750px' : '460px',
            height: isFullscreen ? '750px' : '460px',
            background: theme.gradientBg,
            filter: isFullscreen ? 'blur(120px)' : 'blur(80px)',
            opacity: avatarState === 'speaking' ? 0.95 : avatarState === 'listening' ? 0.85 : 0.55,
            transform: `scale(${avatarState === 'speaking' ? 1.25 : 1})`,
          }}
        />

        {/* Zero Gravity Floating Container */}
        <div
          className="relative transition-transform duration-500 ease-out animate-float-slow flex items-center justify-center"
          style={{ transform: `scale(${audioReactiveScale})` }}
        >
          {/* State 1: Thinking Orbiting Ring & Particles */}
          {avatarState === 'thinking' && (
            <div className="absolute inset-[-28px] pointer-events-none">
              <div className="absolute inset-0 rounded-full border border-sky-400/40 animate-spin-slow" />
              <div className="absolute inset-2 rounded-full border border-dashed border-cyan-300/30 animate-spin-reverse-slow" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-cyan-300 shadow-[0_0_12px_#38bdf8] animate-spin-slow" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-sky-200 shadow-[0_0_10px_#bae6fd] animate-spin-reverse-slow" />
            </div>
          )}

          {/* State 2: Listening Halo Pulse (Audio Reactive) */}
          {avatarState === 'listening' && (
            <div
              className="absolute inset-[-20px] rounded-full pointer-events-none transition-all duration-150 animate-halo-pulse"
              style={{
                boxShadow: `0 0 ${35 + audioLevel * 75}px ${theme.ringColor}`,
                border: `2px solid ${theme.ringColor}`,
                transform: `scale(${1 + audioLevel * 0.16})`,
              }}
            />
          )}

          {/* State 3: Speaking Halo Pulse */}
          {avatarState === 'speaking' && (
            <div
              className="absolute inset-[-16px] rounded-full pointer-events-none animate-pulse-glow"
              style={{
                boxShadow: `0 0 55px ${theme.accentGlow}`,
                border: `2px solid ${theme.accentGlow}`,
              }}
            />
          )}

          {/* Central 3D Digital Human Container */}
          <div
            className={`relative rounded-full overflow-hidden p-1.5 transition-all duration-700 backdrop-blur-md shadow-2xl ${
              theme.avatarBorder
            } ${
              isFullscreen
                ? 'w-[78vw] max-w-[520px] h-[78vw] max-h-[520px]'
                : 'w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96'
            }`}
            style={{
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.03) 100%)',
            }}
          >
            {/* Inner 3D Container - Photorealistic Digital Human */}
            <div className="relative w-full h-full rounded-full overflow-hidden bg-slate-950 shadow-inner">
              <div className="w-full h-full cursor-grab active:cursor-grabbing">
                <HumanCanvas
                  avatarState={avatarState}
                  isSpeaking={isSpeaking}
                  audioLevel={audioLevel}
                  themeGlow={theme.ringColor}
                  fallbackImageUrl={avatarSrc}
                />
              </div>

              {/* Fullscreen Toggle Overlay Button */}
              {onToggleFullscreen && (
                <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-40">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFullscreen();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 bg-slate-950/85 hover:bg-slate-900 text-slate-300 hover:text-white text-[11px] font-medium backdrop-blur-xl border border-white/15 rounded-full shadow-xl transition-all active:scale-95"
                    title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Immersive Mode'}
                  >
                    {isFullscreen ? (
                      <>
                        <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Exit Fullscreen</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                        <span>Fullscreen</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Subtle holographic sheen overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* State Status Pill Indicator */}
        <div className="mt-6 flex flex-col items-center gap-2.5 max-w-xl text-center px-4">
          <div
            className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium backdrop-blur-xl border transition-all duration-300 shadow-md"
            style={{
              backgroundColor: theme.cardBg,
              borderColor: avatarState === 'listening' ? theme.ringColor : 'rgba(255,255,255,0.12)',
              color: '#f8fafc',
            }}
          >
            {avatarState === 'idle' && (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Mic Open (Ready)</span>
              </>
            )}

            {avatarState === 'listening' && (
              <>
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                <span className="text-sky-300 font-semibold tracking-wide">Hearing You...</span>
              </>
            )}

            {avatarState === 'thinking' && (
              <>
                <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-spin" />
                <span className="text-cyan-200 font-medium tracking-wide">Thinking... (Mic Off)</span>
              </>
            )}

            {avatarState === 'speaking' && (
              <>
                <span className="flex items-center gap-0.5 h-3">
                  <span
                    className="w-1 bg-sky-400 rounded-full animate-wave-bar"
                    style={{ animationDelay: '0ms', height: '100%' }}
                  />
                  <span
                    className="w-1 bg-sky-300 rounded-full animate-wave-bar"
                    style={{ animationDelay: '150ms', height: '70%' }}
                  />
                  <span
                    className="w-1 bg-sky-200 rounded-full animate-wave-bar"
                    style={{ animationDelay: '300ms', height: '90%' }}
                  />
                </span>
                <span className="text-sky-200 font-medium">Mira Speaking (Mic Off)</span>
              </>
            )}

            {isHandsFree && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                Hands-free
              </span>
            )}
          </div>

          {/* Live Audio Reactive Micro-Waveform Bars when Listening */}
          {avatarState === 'listening' && (
            <div className="flex items-center gap-1 h-5 px-3 py-1 rounded-full bg-slate-900/60 backdrop-blur-md border border-sky-400/30">
              {[0.4, 0.8, 1, 0.7, 0.9, 0.5, 0.3].map((factor, idx) => {
                const heightPct = Math.max(
                  20,
                  Math.min(100, audioLevel * 100 * factor + Math.sin(idx) * 15)
                );
                return (
                  <div
                    key={idx}
                    className="w-1 bg-gradient-to-t from-sky-500 to-cyan-300 rounded-full transition-all duration-75"
                    style={{ height: `${heightPct}%` }}
                  />
                );
              })}
            </div>
          )}

          {/* Real-Time Live Assistant Speech Subtitle (During Fullscreen or Normal View) */}
          {avatarState === 'speaking' && lastAssistantText && (
            <div className="mt-1 px-4 py-2 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-sky-400/20 text-xs sm:text-sm text-sky-100 shadow-xl max-w-lg line-clamp-2 animate-fade-in">
              "{lastAssistantText}"
            </div>
          )}

          {/* Interrupt Speaking Button */}
          {avatarState === 'speaking' && (
            <button
              onClick={onStopSpeaking}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 text-xs font-medium backdrop-blur-md transition-all shadow-lg active:scale-95 animate-fade-in"
              title="Interrupt speech and return to idle"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Interrupt / Stop Speaking</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};
