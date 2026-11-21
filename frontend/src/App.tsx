import React, { useState, useEffect, useRef, useCallback } from 'react';
import { THEMES } from './constants/themes';
import { ThemeMode } from './types';
import { ParticleBackground } from './components/ParticleBackground';
import { AvatarStage } from './components/AvatarStage';
import { VoiceControls } from './components/VoiceControls';
import { ConversationPanel } from './components/ConversationPanel';
import { SettingsModal } from './components/SettingsModal';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { ToastContainer, ToastMessage } from './components/Toast';
import { useGeminiChat } from './hooks/useGeminiChat';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import { MessageSquare, Settings, Sparkles, PanelRightOpen } from 'lucide-react';

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

  // Screen width detection for responsive side panel
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Conversation Side Panel: Open by default on desktop!
  const [isSidePanelOpen, setIsSidePanelOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => {
      const next = !prev;
      if (next) {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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

  // Refs for speech recognition controls to avoid circular declaration order
  const startListeningRef = useRef<() => void>(() => {});
  const stopListeningRef = useRef<() => void>(() => {});

  // Anti-echo filters to prevent Mira from hearing herself through speakers
  const lastAssistantSpokenRef = useRef<string>('');
  const lastAssistantFinishedTimeRef = useRef<number>(0);

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
        stopListeningRef.current(); // Hard abort microphone while Mira speaks
      },
      onEnd: () => {
        setAvatarState('idle');
        lastAssistantFinishedTimeRef.current = Date.now();
        speechCallbacksRef.current.onEnd?.();
      },
      onError: (err) => {
        addToast(err, 'error');
        setAvatarState('idle');
        lastAssistantFinishedTimeRef.current = Date.now();
        if (voiceSettings.handsFreeMode && isSpeechSupported) {
          setTimeout(() => {
            startListeningRef.current();
          }, 750);
        }
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
      lastAssistantSpokenRef.current = reply.toLowerCase().trim();
      if (voiceSettings.autoSpeak && !voiceSettings.isMuted) {
        speak(reply);
      } else {
        setAvatarState('idle');
        lastAssistantFinishedTimeRef.current = Date.now();
        if (voiceSettings.handsFreeMode && isSpeechSupported) {
          setTimeout(() => {
            startListeningRef.current();
          }, 750);
        }
      }
    },
    onError: (err) => {
      addToast(err, 'error');
    },
  });

  // Fast Speech Recognition (STT with real-time VAD)
  const handleUserFinalSpeech = useCallback(
    (transcript: string) => {
      const cleanUserText = transcript.trim();
      if (!cleanUserText) return;

      // Anti-Echo Check: If assistant is currently speaking, ignore
      if (isSpeaking) {
        return;
      }

      // If text is verbatim identical to the assistant's previous message, ignore echo
      const normalizedUser = cleanUserText.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
      const normalizedAssistant = lastAssistantSpokenRef.current.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
      if (normalizedAssistant && normalizedUser === normalizedAssistant) {
        return;
      }

      // Clear previous assistant spoken text so next questions are never blocked
      lastAssistantSpokenRef.current = '';

      // Immediately shut off microphone while processing & speaking
      stopListeningRef.current();

      sendMessage(cleanUserText);
    },
    [isSpeaking, sendMessage]
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
    silenceTimeoutMs: 1400, // 1.4s comfortable conversational silence window
  });

  // Keep refs in sync
  useEffect(() => {
    startListeningRef.current = startListening;
    stopListeningRef.current = stopListening;
  }, [startListening, stopListening]);

  // Set avatar state to 'listening' when mic is active and not thinking or speaking
  useEffect(() => {
    if (isListening && avatarState !== 'thinking' && avatarState !== 'speaking') {
      setAvatarState('listening');
    } else if (!isListening && avatarState === 'listening') {
      setAvatarState('idle');
    }
  }, [isListening, avatarState, setAvatarState]);

  // Hands-free continuous loop: when assistant finishes speaking, resume listening cleanly with fresh mic session
  useEffect(() => {
    speechCallbacksRef.current.onEnd = () => {
      if (voiceSettings.handsFreeMode && isSpeechSupported) {
        setTimeout(() => {
          lastAssistantSpokenRef.current = '';
          startListeningRef.current();
        }, 550);
      }
    };
  }, [voiceSettings.handsFreeMode, isSpeechSupported]);

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
    if (voiceSettings.handsFreeMode && isSpeechSupported) {
      setTimeout(() => {
        startListening();
      }, 200);
    }
  };

  const handleManualSendMessage = (text: string) => {
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

      {/* Top Header Navbar (Hidden in Fullscreen Immersive Mode) */}
      {!isFullscreen && (
        <header className="relative z-30 flex items-center justify-between px-4 sm:px-8 py-3.5 sm:py-4 shrink-0 border-b border-white/5 backdrop-blur-md">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-300 flex items-center justify-center shadow-lg shadow-sky-500/20 border border-white/20">
              <Sparkles className="w-4 h-4 text-slate-950" />
            </div>
            <div>
              <h1 className="text-sm sm:base font-bold tracking-tight text-white flex items-center gap-2">
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
          <div className="flex items-center gap-2">
            {/* Conversation Side Panel Toggle */}
            <button
              onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-2xl backdrop-blur-xl border transition-all shadow-md active:scale-95 text-xs font-medium ${
                isSidePanelOpen
                  ? 'bg-sky-500/20 text-sky-200 border-sky-400/40 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10 hover:border-white/25'
              }`}
              title={isSidePanelOpen ? 'Collapse Conversation Side Panel' : 'Open Conversation Side Panel'}
            >
              {isSidePanelOpen ? <MessageSquare className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
              <span className="hidden sm:inline">Conversation</span>
              {messages.length > 1 && (
                <span className="px-1.5 py-0.2 rounded-full bg-sky-500 text-white text-[10px] font-bold">
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
      )}

      {/* Main Workspace: Split View with Avatar Stage + Docked Conversation Side Panel */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Left/Center Area: Avatar Stage & Voice Controls */}
        <div
          className={`flex-1 flex flex-col justify-between items-center relative z-10 px-4 ${
            isFullscreen ? 'py-1' : 'py-3 sm:py-4'
          } overflow-y-auto custom-scrollbar`}
        >
          {/* Mobile Theme Switcher */}
          {!isFullscreen && (
            <div className="sm:hidden mb-1">
              <ThemeSwitcher
                currentTheme={currentTheme}
                onSelectTheme={handleSelectTheme}
                activeConfig={activeThemeConfig}
              />
            </div>
          )}

          {/* Central Floating Avatar */}
          <div className="flex-1 flex items-center justify-center w-full">
            <AvatarStage
              avatarState={avatarState}
              theme={activeThemeConfig}
              audioLevel={audioLevel}
              customAvatarUrl={customAvatarUrl}
              onUploadAvatar={saveCustomAvatar}
              onStopSpeaking={handleInterruptSpeaking}
              isHandsFree={voiceSettings.handsFreeMode}
              lastAssistantText={lastAssistantSpokenRef.current}
              isFullscreen={isFullscreen}
              onToggleFullscreen={handleToggleFullscreen}
            />
          </div>

          {/* Bottom Voice Controls */}
          <div className="w-full pb-2">
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
          </div>
        </div>

        {/* Right Side Panel: Live Real-Time Conversation Log (Hidden in Fullscreen) */}
        {!isFullscreen && (
          <ConversationPanel
            isOpen={isSidePanelOpen}
            onToggle={() => setIsSidePanelOpen(!isSidePanelOpen)}
            messages={messages}
            interimTranscript={interimTranscript}
            avatarState={avatarState}
            onClear={clearMessages}
            theme={activeThemeConfig}
            onSendMessage={handleManualSendMessage}
            onSpeakMessage={(text) => speak(text)}
            isMobile={isMobile}
          />
        )}
      </div>

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
