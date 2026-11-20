export type ThemeMode = 'antigravity' | 'professional' | 'friendly' | 'futuristic';

export interface ThemeConfig {
  id: ThemeMode;
  name: string;
  tagline: string;
  bgColor: string;
  accentGlow: string;
  ringColor: string;
  particleColors: string[];
  gradientBg: string;
  cardBg: string;
  avatarBorder: string;
}

export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  interim?: boolean;
}

export interface VoiceSettings {
  voiceURI: string | null;
  rate: number; // 0.8 - 1.5
  pitch: number; // 0.8 - 1.2
  volume: number; // 0 - 1
  isMuted: boolean;
  autoSpeak: boolean;
  handsFreeMode: boolean;
}

export interface GeminiConfig {
  apiKey: string;
  model: string;
  systemInstruction?: string;
  temperature?: number;
}
