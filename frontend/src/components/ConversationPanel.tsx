import React, { useRef, useEffect, useState } from 'react';
import { Message, ThemeConfig, AvatarState } from '../types';
import {
  X,
  Trash2,
  Copy,
  Check,
  Bot,
  User,
  Sparkles,
  Volume2,
  Send,
  PanelRightClose,
  PanelRightOpen,
  Mic,
} from 'lucide-react';

interface ConversationPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  messages: Message[];
  interimTranscript: string;
  avatarState: AvatarState;
  onClear: () => void;
  theme: ThemeConfig;
  onSendMessage: (text: string) => void;
  onSpeakMessage?: (text: string) => void;
  isMobile?: boolean;
}

export const ConversationPanel: React.FC<ConversationPanelProps> = ({
  isOpen,
  onToggle,
  messages,
  interimTranscript,
  avatarState,
  onClear,
  theme,
  onSendMessage,
  onSpeakMessage,
  isMobile = false,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');

  // Auto-scroll to bottom whenever messages update or interim changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, interimTranscript, avatarState]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isMobile && isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
        />
      )}

      {/* Main Panel Container */}
      <aside
        className={`h-full flex flex-col backdrop-blur-2xl border-l shadow-2xl transition-all duration-300 ease-in-out z-40 ${
          isMobile
            ? `fixed top-0 right-0 w-full sm:w-[420px] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`
            : `relative ${isOpen ? 'w-80 md:w-96 lg:w-[430px] opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`
        }`}
        style={{
          backgroundColor: theme.cardBg,
          borderColor: 'rgba(255,255,255,0.12)',
        }}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                <span>Live Conversation</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </h2>
              <p className="text-[11px] text-slate-400">Real-time voice & text log</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onClear}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Clear conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors"
              title={isOpen ? 'Collapse side panel' : 'Expand side panel'}
            >
              {isMobile ? <X className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
        >
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isSystem = msg.role === 'system';
            const isAssistant = msg.role === 'assistant';
            const isThinkingPlaceholder = isAssistant && msg.content === '...';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group animate-fade-in`}
              >
                {/* Header tag */}
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
                  {isUser ? (
                    <>
                      <span>You</span>
                      <User className="w-3 h-3 text-sky-300" />
                    </>
                  ) : isSystem ? (
                    <span className="text-amber-400">System</span>
                  ) : (
                    <>
                      <Bot className="w-3.5 h-3.5 text-cyan-300" />
                      <span className="font-medium text-slate-300">Mira</span>
                    </>
                  )}
                  <span>•</span>
                  <span>{formatTime(msg.timestamp)}</span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`relative max-w-[90%] px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed transition-all shadow-md ${
                    isUser
                      ? 'bg-sky-600/80 text-white rounded-br-xs border border-sky-400/30 shadow-sky-950/30'
                      : isSystem
                      ? 'bg-rose-950/70 text-rose-200 border border-rose-500/30 rounded-bl-xs'
                      : 'bg-white/10 text-slate-100 rounded-bl-xs border border-white/15 backdrop-blur-md shadow-black/20'
                  }`}
                >
                  {isThinkingPlaceholder ? (
                    <div className="flex items-center gap-1.5 py-1 px-1 text-sky-300">
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                      <span className="text-xs italic text-slate-300">Mira is thinking...</span>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}

                  {/* Actions (Speaker replay & Copy) */}
                  {!isThinkingPlaceholder && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isAssistant && onSpeakMessage && (
                        <button
                          onClick={() => onSpeakMessage(msg.content)}
                          className="p-1 rounded bg-black/40 hover:bg-black/60 text-slate-300 hover:text-white transition-colors"
                          title="Re-listen to response"
                        >
                          <Volume2 className="w-3 h-3 text-sky-300" />
                        </button>
                      )}

                      <button
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        className="p-1 rounded bg-black/40 hover:bg-black/60 text-slate-300 hover:text-white transition-colors"
                        title="Copy text"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Live Audio Interim Bubble while user is currently speaking */}
          {interimTranscript && (
            <div className="flex flex-col items-end animate-fade-in">
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-sky-400">
                <Mic className="w-3 h-3 animate-pulse" />
                <span>Hearing you live...</span>
              </div>
              <div className="max-w-[90%] px-4 py-2.5 rounded-2xl rounded-br-xs bg-sky-950/60 border border-sky-400/40 text-sky-100 text-xs sm:text-sm italic shadow-lg flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping shrink-0" />
                <span>"{interimTranscript}"</span>
              </div>
            </div>
          )}
        </div>

        {/* Panel Footer: Quick Message Input */}
        <div className="p-3.5 border-t border-white/10 shrink-0 bg-slate-950/30">
          <form onSubmit={handleInputSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type in conversation..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:hover:bg-sky-500 text-white transition-all active:scale-95 shadow-md shadow-sky-500/20"
              title="Send text to conversation"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 px-1">
            <span>{messages.length} messages</span>
            <span>Gemini 3.8 Flash • Real-time</span>
          </div>
        </div>
      </aside>
    </>
  );
};
