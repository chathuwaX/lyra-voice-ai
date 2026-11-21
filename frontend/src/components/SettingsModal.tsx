import React, { useState } from 'react';
import { X, Mic, MessageSquareText, Sliders, RotateCcw } from 'lucide-react';
import { ThemeConfig, VoiceSettings } from '../types';
import { DEFAULT_SYSTEM_INSTRUCTION } from '../services/gemini';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  systemPrompt: string;
  onSaveSystemPrompt: (prompt: string) => void;
  voices: SpeechSynthesisVoice[];
  voiceSettings: VoiceSettings;
  onUpdateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  apiKey?: string;
  onSaveApiKey?: (key: string) => void;
  modelName?: string;
  onSaveModel?: (model: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  systemPrompt,
  onSaveSystemPrompt,
  voices,
  voiceSettings,
  onUpdateVoiceSettings,
}) => {
  const [tempSystemPrompt, setTempSystemPrompt] = useState(systemPrompt);
  const [activeTab, setActiveTab] = useState<'voice' | 'system'>('voice');

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSystemPrompt(tempSystemPrompt);
    onClose();
  };

  const handleResetSystemPrompt = () => {
    setTempSystemPrompt(DEFAULT_SYSTEM_INSTRUCTION);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-lg rounded-3xl backdrop-blur-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{
          backgroundColor: theme.cardBg,
          borderColor: 'rgba(255,255,255,0.15)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-semibold text-slate-100">Assistant Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 px-6 gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('voice')}
            className={`py-3 relative transition-colors ${
              activeTab === 'voice' ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Voice & Speech
            {activeTab === 'voice' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`py-3 relative transition-colors ${
              activeTab === 'system' ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Persona & Prompt
            {activeTab === 'system' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 rounded-full" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
          {/* TAB 1: VOICE & SPEECH */}
          {activeTab === 'voice' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-sky-400" />
                  Browser Speech Synthesizer Voice
                </label>
                <select
                  value={voiceSettings.voiceURI || ''}
                  onChange={(e) => onUpdateVoiceSettings({ voiceURI: e.target.value || null })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-slate-100 text-sm focus:outline-none focus:border-sky-400 transition-colors"
                >
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>

              {/* Rate slider */}
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Speech Rate</span>
                  <span className="font-mono text-sky-300">{voiceSettings.rate.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.5"
                  step="0.05"
                  value={voiceSettings.rate}
                  onChange={(e) => onUpdateVoiceSettings({ rate: parseFloat(e.target.value) })}
                  className="w-full accent-sky-400"
                />
              </div>

              {/* Pitch slider */}
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Pitch</span>
                  <span className="font-mono text-sky-300">{voiceSettings.pitch.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.05"
                  value={voiceSettings.pitch}
                  onChange={(e) => onUpdateVoiceSettings({ pitch: parseFloat(e.target.value) })}
                  className="w-full accent-sky-400"
                />
              </div>

              {/* Auto speak toggle */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="text-sm font-medium text-slate-200">Auto Speak Responses</div>
                  <div className="text-xs text-slate-400">Speak AI responses aloud automatically</div>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateVoiceSettings({ autoSpeak: !voiceSettings.autoSpeak })}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    voiceSettings.autoSpeak ? 'bg-sky-500 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-md transform" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PERSONA & PROMPT */}
          {activeTab === 'system' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <MessageSquareText className="w-3.5 h-3.5 text-sky-400" />
                  System Instruction Prompt
                </label>
                <button
                  type="button"
                  onClick={handleResetSystemPrompt}
                  className="text-[11px] text-sky-400 hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Default
                </button>
              </div>
              <textarea
                rows={7}
                value={tempSystemPrompt}
                onChange={(e) => setTempSystemPrompt(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-white/10 text-slate-100 text-xs font-mono leading-relaxed focus:outline-none focus:border-sky-400 transition-colors custom-scrollbar"
                placeholder="Enter system prompt for voice persona..."
              />
              <p className="text-[11px] text-slate-400">
                Mira is tuned to respond concisely (2-4 sentences max) and actively ask natural follow-up questions to keep real-time conversation flowing smoothly.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-slate-950/40">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-medium bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/25 transition-all active:scale-95"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
