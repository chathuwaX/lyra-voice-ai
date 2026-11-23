import React, { useState } from 'react';
import { X, Mic, MessageSquareText, Sliders, RotateCcw, Key, Eye, EyeOff } from 'lucide-react';
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
  apiKey = '',
  onSaveApiKey,
}) => {
  const [tempSystemPrompt, setTempSystemPrompt] = useState(systemPrompt);
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'voice' | 'system' | 'api'>('voice');

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSystemPrompt(tempSystemPrompt);
    if (onSaveApiKey) {
      onSaveApiKey(tempApiKey);
    }
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
          borderColor: theme.cardBorder || (theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'),
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-sky-500 dark:text-sky-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Assistant Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-black/5 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-black/10 dark:border-white/10 px-6 gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('voice')}
            className={`py-3 relative transition-colors ${
              activeTab === 'voice' ? 'text-sky-500 dark:text-sky-400 font-semibold' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Voice & Speech
            {activeTab === 'voice' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500 dark:bg-sky-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`py-3 relative transition-colors ${
              activeTab === 'system' ? 'text-sky-500 dark:text-sky-400 font-semibold' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Persona & Prompt
            {activeTab === 'system' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500 dark:bg-sky-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('api')}
            className={`py-3 relative transition-colors ${
              activeTab === 'api' ? 'text-sky-500 dark:text-sky-400 font-semibold' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            API Key (Optional)
            {activeTab === 'api' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500 dark:bg-sky-400 rounded-full" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
          {/* TAB 1: VOICE & SPEECH */}
          {activeTab === 'voice' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                  Browser Speech Synthesizer Voice
                </label>
                <select
                  value={voiceSettings.voiceURI || ''}
                  onChange={(e) => onUpdateVoiceSettings({ voiceURI: e.target.value || null })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-300/80 dark:border-white/10 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-sky-400 transition-colors"
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
                <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                  <span>Speech Rate</span>
                  <span className="font-mono text-sky-600 dark:text-sky-300">{voiceSettings.rate.toFixed(2)}x</span>
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
                <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                  <span>Pitch</span>
                  <span className="font-mono text-sky-600 dark:text-sky-300">{voiceSettings.pitch.toFixed(2)}</span>
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
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Auto Speak Responses</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Speak AI responses aloud automatically</div>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateVoiceSettings({ autoSpeak: !voiceSettings.autoSpeak })}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    voiceSettings.autoSpeak ? 'bg-sky-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
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
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MessageSquareText className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                  System Instruction Prompt
                </label>
                <button
                  type="button"
                  onClick={handleResetSystemPrompt}
                  className="text-[11px] text-sky-500 dark:text-sky-400 hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Default
                </button>
              </div>
              <textarea
                rows={7}
                value={tempSystemPrompt}
                onChange={(e) => setTempSystemPrompt(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-300/80 dark:border-white/10 text-slate-900 dark:text-slate-100 text-xs font-mono leading-relaxed focus:outline-none focus:border-sky-400 transition-colors custom-scrollbar"
                placeholder="Enter system prompt for voice persona..."
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Mira is tuned to speak in simple, everyday English with short, natural responses (2-4 sentences) like a real human friend.
              </p>
            </div>
          )}

          {/* TAB 3: API KEY (OPTIONAL) */}
          {activeTab === 'api' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                  Direct AI API Key (Optional Override)
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="Optional: Paste Gemini or Groq API key here"
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-300/80 dark:border-white/10 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-sky-400 transition-colors pr-20"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {tempApiKey && (
                      <button
                        type="button"
                        onClick={() => setTempApiKey('')}
                        className="text-[10px] px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 hover:bg-red-500/20 text-slate-500 dark:text-slate-400 hover:text-red-500 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="p-3 mt-3 rounded-xl bg-sky-500/10 dark:bg-sky-950/40 border border-sky-400/20 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  <p className="font-semibold text-sky-600 dark:text-sky-300 mb-1">💡 Cloud Deployment Notice:</p>
                  <p>
                    On Netlify, Mira automatically uses the <strong>GEMINI_API_KEY</strong> added in your Netlify Dashboard (Environment Variables).
                  </p>
                  <p className="mt-1 text-slate-500 dark:text-slate-400">
                    If Netlify environment variables are not yet active or you wish to test directly, you can paste your key above.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-black/10 dark:border-white/10 bg-black/5 dark:bg-slate-950/40">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-black/5 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
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
