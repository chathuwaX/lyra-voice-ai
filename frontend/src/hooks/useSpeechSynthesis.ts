import { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceSettings } from '../types';

export function stripMarkdownForSpeech(text: string): string {
  if (!text) return '';

  let cleaned = text
    // Remove fenced code blocks
    .replace(/```[\s\S]*?```/g, ' ')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove markdown links [label](url) -> label
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images ![alt](url) -> ''
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Remove headers (#, ##, etc.)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italics
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove bullet points and numbered lists at beginning of lines
    .replace(/^[\*\-+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // Replace multiple newlines or tabs with a simple space
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

export function useSpeechSynthesis(
  initialSettings?: Partial<VoiceSettings>,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: string) => void;
  }
) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [settings, setSettings] = useState<VoiceSettings>({
    voiceURI: null,
    rate: 1.05,
    pitch: 1.0,
    volume: 1.0,
    isMuted: false,
    autoSpeak: true,
    handsFreeMode: true, // Default to true: auto-off mic during speech and auto-open mic when speech finishes!
    ...initialSettings,
  });

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load available speech synthesis voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const updateVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices && availableVoices.length > 0) {
        setVoices(availableVoices);

        // Auto-select a high quality natural-sounding female voice if none set
        setSettings((prev) => {
          if (prev.voiceURI && availableVoices.some((v) => v.voiceURI === prev.voiceURI)) {
            return prev;
          }

          // Search preference: US/UK English natural or female voices
          const preferredVoice =
            availableVoices.find(
              (v) =>
                v.lang.startsWith('en') &&
                (v.name.includes('Natural') ||
                 v.name.includes('Jenny') ||
                 v.name.includes('Aria') ||
                 v.name.includes('Zira') ||
                 v.name.includes('Samantha') ||
                 v.name.includes('Google US English') ||
                 v.name.toLowerCase().includes('female'))
            ) ||
            availableVoices.find((v) => v.lang.startsWith('en')) ||
            availableVoices[0];

          return {
            ...prev,
            voiceURI: preferredVoice ? preferredVoice.voiceURI : null,
          };
        });
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    (rawText: string) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      if (settings.isMuted) return;

      const cleanText = stripMarkdownForSpeech(rawText);
      if (!cleanText) return;

      stopSpeaking();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      currentUtteranceRef.current = utterance;

      utterance.rate = Math.max(0.7, Math.min(1.8, settings.rate));
      utterance.pitch = Math.max(0.6, Math.min(1.4, settings.pitch));
      utterance.volume = Math.max(0, Math.min(1.0, settings.volume));

      if (settings.voiceURI && voices.length > 0) {
        const selected = voices.find((v) => v.voiceURI === settings.voiceURI);
        if (selected) {
          utterance.voice = selected;
        }
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        callbacksRef.current?.onStart?.();
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        callbacksRef.current?.onEnd?.();
      };

      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
        setIsSpeaking(false);
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          callbacksRef.current?.onError?.(`Speech synthesis error: ${e.error}`);
        }
      };

      // Workaround for Chrome long utterance bug
      window.speechSynthesis.speak(utterance);
    },
    [settings, voices, stopSpeaking]
  );

  const updateSettings = useCallback((newSettings: Partial<VoiceSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('antigravity_voice_settings', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  return {
    voices,
    isSpeaking,
    settings,
    updateSettings,
    speak,
    stopSpeaking,
  };
}
