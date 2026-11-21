import React, { useRef, useEffect } from 'react';
import { Message, ThemeConfig } from '../types';
import { X, Trash2, Copy, Check, Bot, User, Sparkles } from 'lucide-react';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  onClear: () => void;
  theme: ThemeConfig;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  onClear,
  theme,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
        />
      )}

      {/* Slide-out Drawer Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] z-50 transform transition-transform duration-300 ease-in-out flex flex-col backdrop-blur-2xl border-l shadow-2xl ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          backgroundColor: theme.cardBg,
          borderColor: 'rgba(255,255,255,0.12)',
        }}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-semibold text-slate-100">Conversation Transcript</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClear}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Clear Conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors"
              title="Close Transcript"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages List */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 px-6">
              <Bot className="w-12 h-12 text-slate-500 mb-2 stroke-1" />
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Say hello or type a prompt to start the conversation!
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              const isSystem = msg.role === 'system';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
                    {isUser ? (
                      <>
                        <span>You</span>
                        <User className="w-3 h-3 text-sky-300" />
                      </>
                    ) : isSystem ? (
                      <span className="text-amber-400">System Notification</span>
                    ) : (
                      <>
                        <Bot className="w-3 h-3 text-cyan-300" />
                        <span>Mira</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{formatTime(msg.timestamp)}</span>
                  </div>

                  <div
                    className={`relative max-w-[88%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed transition-all shadow-md ${
                      isUser
                        ? 'bg-sky-600/80 text-white rounded-br-xs border border-sky-400/30'
                        : isSystem
                        ? 'bg-rose-950/60 text-rose-200 border border-rose-500/30 rounded-bl-xs'
                        : 'bg-white/10 text-slate-100 rounded-bl-xs border border-white/15 backdrop-blur-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {/* Copy message button */}
                    <button
                      onClick={() => copyToClipboard(msg.content, msg.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-black/40 hover:bg-black/60 text-slate-300 hover:text-white"
                      title="Copy text"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-white/10 text-center text-[11px] text-slate-400 flex items-center justify-between">
          <span>{messages.length} messages</span>
          <span className="text-slate-500">Mira AI • Voice Assistant</span>
        </div>
      </div>
    </>
  );
};
