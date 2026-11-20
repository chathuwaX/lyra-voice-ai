import React, { useState, useEffect, useRef, useCallback } from 'react';
import { THEMES } from './constants/themes';
import { ThemeMode } from './types';
import { ParticleBackground } from './components/ParticleBackground';
import { AvatarStage } from './components/AvatarStage';
import { VoiceControls } from './components/VoiceControls';
import { ChatDrawer } from './components/ChatDrawer';
import { SettingsModal } from './components/SettingsModal';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { ToastContainer, ToastMessage } from './components/Toast';
import { useGeminiChat } from './hooks/useGeminiChat';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import { MessageSquare, Settings, Sparkles, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  // Theme management
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('antigravity_theme') as ThemeMode) || 'antigravity';
  });

  const activeThemeConfig = THEMES[currentTheme] || THEMES.antigravity;

  const handleSelectTheme = (mode: ThemeMode) => {
    setCurrentTheme(mode);
    localStorage.setItem('antigravity_theme', mode);
  };

  // UI Modals / Drawers
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, type: 'error' | 'success' | 'info' = 'info') => {
    const id = 'toast-' + Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Speech Synthesis (TTS)
  const speechCallbacksRef = useRef<{ onEnd?: () => void }>({});

  const {
    voices,
    isSpeaking,
    settings: voiceSettings,
    updateSettings: updateVoiceSettings,
    speak,
    stopSpeaking,
  } = useSpeechSynthesis(
    {},
    {
      onStart: () => {
        setAvatarState('speaking');
      },
      onEnd: () => {
        setAvatarState('idle');
        speechCallbacksRef.current.onEnd?.();
      },
      onError: (err) => {
        addToast(err, 'error');
        setAvatarState('idle');
      },
    }
  );

  // Gemini Chat Hook
  const {
    messages,
    avatarState,
    setAvatarState,
    apiKey,
    saveApiKey,
    modelName,
    saveModel,
    systemPrompt,
    saveSystemPrompt,
    customAvatarUrl,
    saveCustomAvatar,
    sendMessage,
    clearMessages,
  } = useGeminiChat({
    onAssistantReply: (reply) => {
      if (voiceSettings.autoSpeak && !voiceSettings.isMuted) {
        speak(reply);
      } else {
        setAvatarState('idle');
      }
    },
    onError: (err) => {
      addToast(err, 'error');
    },
  });

  // Speech Recognition (STT)
  const handleUserFinalSpeech = useCallback(
    (transcript: string) => {
      if (!transcript.trim()) return;

      if (!apiKey) {
        addToast('Please enter your Gemini API Key in Settings to chat.', 'error');
        setIsSettingsOpen(true);
        return;
      }

      sendMessage(transcript);
    },
    [apiKey, sendMessage, addToast]
  );

  const {
    isListening,
    interimTranscript,
    audioLevel,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    toggleListening,
  } = useSpeechRecognition({
    onFinalResult: handleUserFinalSpeech,
    onError: (err) => {
      addToast(err, 'error');
    },
    continuous: voiceSettings.handsFreeMode,
  });

  // Set avatar state to 'listening' when mic is active and not thinking or speaking
  useEffect(() => {
    if (isListening && avatarState !== 'thinking' && avatarState !== 'speaking') {
      setAvatarState('listening');
    } else if (!isListening && avatarState === 'listening') {
      setAvatarState('idle');
    }
  }, [isListening, avatarState, setAvatarState]);

  // Hands-free continuous loop: when assistant finishes speaking, resume listening
  useEffect(() => {
    speechCallbacksRef.current.onEnd = () => {
      if (voiceSettings.handsFreeMode && isSpeechSupported) {
        setTimeout(() => {
          startListening();
        }, 350);
      }
    };
  }, [voiceSettings.handsFreeMode, isSpeechSupported, startListening]);

  const handleToggleHandsFree = () => {
    const nextState = !voiceSettings.handsFreeMode;
    updateVoiceSettings({ handsFreeMode: nextState });
    addToast(
      nextState
        ? 'Hands-free mode activated: Assistant will automatically listen after speaking.'
        : 'Hands-free mode deactivated: Use Push-to-Talk or Spacebar.',
      'info'
    );
  };

  const handleToggleMute = () => {
    const nextMute = !voiceSettings.isMuted;
    updateVoiceSettings({ isMuted: nextMute });
    if (nextMute && isSpeaking) {
      stopSpeaking();
    }
    addToast(nextMute ? 'Speech output muted.' : 'Speech output unmuted.', 'info');
  };

  const handleInterruptSpeaking = () => {
    stopSpeaking();
    setAvatarState('idle');
  };

  const handleManualSendMessage = (text: string) => {
    if (!apiKey) {
      addToast('Please enter your Gemini API Key in Settings to chat.', 'error');
      setIsSettingsOpen(true);
      return;
    }
    sendMessage(text);
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex flex-col justify-between transition-colors duration-1000 select-none font-sans"
      style={{ backgroundColor: activeThemeConfig.bgColor }}
    >
      {/* Dynamic Canvas Particles & Light Orbs */}
      <ParticleBackground theme={activeThemeConfig} />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Top Header Navbar */}
      <header className="relative z-30 flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-300 flex items-center justify-center shadow-lg shadow-sky-500/20 border border-white/20">
            <Sparkles className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-2">
              <span>MIRA</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
                Voice AI
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {activeThemeConfig.tagline}
            </p>
          </div>
        </div>

        {/* Center: Theme Selector */}
        <div className="hidden sm:block">
          <ThemeSwitcher
            currentTheme={currentTheme}
            onSelectTheme={handleSelectTheme}
            activeConfig={activeThemeConfig}
          />
        </div>

        {/* Right Action Icons: Transcript & Settings */}
        <div className="flex items-center gap-2.5">
          {/* Missing API Key Warning Pill */}
          {!apiKey && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-medium animate-pulse hover:bg-amber-500/30 transition-colors"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="hidden md:inline">API Key Needed</span>
            </button>
          )}

          {/* Transcript Drawer Toggle */}
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="relative p-2.5 rounded-2xl backdrop-blur-xl border border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all shadow-md active:scale-95"
            title="Open Conversation Transcript"
          >
            <MessageSquare className="w-4 h-4" />
            {messages.length > 1 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
                {messages.length}
              </span>
            )}
          </button>

          {/* Settings Modal Toggle */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 rounded-2xl backdrop-blur-xl border border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all shadow-md active:scale-95"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Center Area: Avatar Stage */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-4">
        {/* Mobile Theme Switcher */}
        <div className="sm:hidden mb-2">
          <ThemeSwitcher
            currentTheme={currentTheme}
            onSelectTheme={handleSelectTheme}
            activeConfig={activeThemeConfig}
          />
        </div>

        <AvatarStage
          avatarState={avatarState}
          theme={activeThemeConfig}
          audioLevel={audioLevel}
          customAvatarUrl={customAvatarUrl}
          onUploadAvatar={saveCustomAvatar}
          onStopSpeaking={handleInterruptSpeaking}
          isHandsFree={voiceSettings.handsFreeMode}
        />
      </main>

      {/* Bottom Voice & Text Action Controls */}
      <footer className="relative pb-6 sm:pb-8">
        <VoiceControls
          theme={activeThemeConfig}
          isListening={isListening}
          interimTranscript={interimTranscript}
          isSpeaking={isSpeaking}
          isMuted={voiceSettings.isMuted}
          handsFreeMode={voiceSettings.handsFreeMode}
          onToggleListening={toggleListening}
          onToggleHandsFree={handleToggleHandsFree}
          onToggleMute={handleToggleMute}
          onSendMessage={handleManualSendMessage}
          onStopSpeaking={handleInterruptSpeaking}
          isSpeechSupported={isSpeechSupported}
        />
      </footer>

      {/* Collapsible Transcript Drawer */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={messages}
        onClear={clearMessages}
        theme={activeThemeConfig}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={activeThemeConfig}
        apiKey={apiKey}
        onSaveApiKey={saveApiKey}
        modelName={modelName}
        onSaveModel={saveModel}
        systemPrompt={systemPrompt}
        onSaveSystemPrompt={saveSystemPrompt}
        voices={voices}
        voiceSettings={voiceSettings}
        onUpdateVoiceSettings={updateVoiceSettings}
      />
    </div>
  );
};
export default App;
