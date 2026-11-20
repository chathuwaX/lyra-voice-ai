import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Send, Radio, MessageSquare, Volume2, VolumeX } from 'lucide-react';
import { ThemeConfig } from '../types';

interface VoiceControlsProps {
  theme: ThemeConfig;
  isListening: boolean;
  interimTranscript: string;
  isSpeaking: boolean;
  isMuted: boolean;
  handsFreeMode: boolean;
  onToggleListening: () => void;
  onToggleHandsFree: () => void;
  onToggleMute: () => void;
  onSendMessage: (text: string) => void;
  onStopSpeaking: () => void;
  isSpeechSupported: boolean;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  theme,
  isListening,
  interimTranscript,
  isSpeaking,
  isMuted,
  handsFreeMode,
  onToggleListening,
  onToggleHandsFree,
  onToggleMute,
  onSendMessage,
  onStopSpeaking,
  isSpeechSupported,
}) => {
  const [inputText, setInputText] = useState('');
  const [showTextInput, setShowTextInput] = useState(!isSpeechSupported);

  // Keyboard shortcut: Spacebar to toggle Push-to-Talk when not typing in text fields
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing in an input or textarea, do not trigger spacebar mic
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (isSpeaking) {
          onStopSpeaking();
        } else {
          onToggleListening();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSpeaking, onStopSpeaking, onToggleListening]);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  return (
    <div className="relative z-20 w-full max-w-xl mx-auto px-4 flex flex-col items-center gap-3">
      {/* Live Interim Transcript Bubble */}
      {interimTranscript && (
        <div className="w-full max-w-md px-4 py-2.5 rounded-2xl bg-sky-950/70 backdrop-blur-xl border border-sky-400/40 text-sky-100 text-sm shadow-xl text-center animate-fade-in flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping shrink-0" />
          <span className="italic">"{interimTranscript}"</span>
        </div>
      )}

      {/* Primary Voice Action Bar */}
      <div
        className="flex items-center justify-between gap-4 px-6 py-3 rounded-full backdrop-blur-2xl border shadow-2xl transition-all duration-300 w-full max-w-md"
        style={{
          backgroundColor: theme.cardBg,
          borderColor: isListening ? theme.ringColor : 'rgba(255,255,255,0.12)',
          boxShadow: isListening ? `0 0 35px ${theme.accentGlow}` : '0 10px 30px rgba(0,0,0,0.5)',
        }}
      >
        {/* Left: Hands-Free Continuous Mode Toggle */}
        <button
          onClick={onToggleHandsFree}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            handsFreeMode
              ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/5'
          }`}
          title="Toggle hands-free continuous conversation mode"
        >
          <Radio className={`w-3.5 h-3.5 ${handsFreeMode ? 'text-emerald-400 animate-pulse' : ''}`} />
          <span className="hidden sm:inline">Hands-free</span>
        </button>

        {/* Center: Push-to-Talk Mic Button */}
        <div className="relative flex items-center justify-center">
          {/* Subtle outer pulsing ring when listening */}
          {isListening && (
            <div
              className="absolute inset-[-10px] rounded-full animate-ping pointer-events-none opacity-40"
              style={{ backgroundColor: theme.ringColor }}
            />
          )}

          <button
            onClick={onToggleListening}
            disabled={!isSpeechSupported}
            className={`relative flex items-center justify-center w-14 h-14 rounded-full transition-all duration-300 active:scale-95 shadow-xl ${
              isListening
                ? 'bg-gradient-to-tr from-sky-500 to-cyan-400 text-white shadow-[0_0_25px_#38bdf8]'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            } ${!isSpeechSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isListening ? 'Click to stop listening' : 'Click or Press Spacebar to speak'}
          >
            {isListening ? (
              <Mic className="w-6 h-6 animate-pulse" />
            ) : (
              <MicOff className="w-6 h-6 text-slate-300" />
            )}
          </button>
        </div>

        {/* Right: Mute & Text toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleMute}
            className={`p-2 rounded-full transition-all ${
              isMuted
                ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200'
            }`}
            title={isMuted ? 'Unmute AI Voice' : 'Mute AI Voice'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShowTextInput(!showTextInput)}
            className={`p-2 rounded-full transition-all ${
              showTextInput
                ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Text Input Fallback"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Spacebar helper prompt */}
      <div className="text-[11px] text-slate-400 tracking-wide flex items-center gap-1.5 opacity-80">
        <span>Press</span>
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-slate-200 font-mono text-[10px]">
          Space
        </kbd>
        <span>to talk / stop</span>
      </div>

      {/* Text Input Fallback Bar (Collapsible or always usable) */}
      {showTextInput && (
        <form
          onSubmit={handleTextSubmit}
          className="w-full max-w-md flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl border transition-all duration-300 animate-fade-in shadow-xl"
          style={{
            backgroundColor: theme.cardBg,
            borderColor: 'rgba(255,255,255,0.15)',
          }}
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message here..."
            className="flex-1 bg-transparent border-none outline-none px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2 rounded-full bg-sky-500 hover:bg-sky-400 text-white disabled:opacity-40 disabled:hover:bg-sky-500 transition-all active:scale-95"
            title="Send text message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  );
};
