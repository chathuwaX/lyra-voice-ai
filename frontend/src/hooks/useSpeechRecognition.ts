import { useState, useEffect, useRef, useCallback } from 'react';

interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export interface UseSpeechRecognitionOptions {
  onFinalResult?: (transcript: string) => void;
  onInterimResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  continuous?: boolean;
  silenceTimeoutMs?: number;
}

export function useSpeechRecognition({
  onFinalResult,
  onInterimResult,
  onError,
  silenceTimeoutMs = 1200,
}: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const silenceTimerRef = useRef<any>(null);
  const accumulatedSpeechRef = useRef<string>('');
  const volumeAnimRef = useRef<number | null>(null);

  const onFinalResultRef = useRef(onFinalResult);
  onFinalResultRef.current = onFinalResult;

  const onInterimResultRef = useRef(onInterimResult);
  onInterimResultRef.current = onInterimResult;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Check browser support on mount
  useEffect(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
    }
  }, []);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const stopVolumeAnimation = () => {
    if (volumeAnimRef.current) {
      cancelAnimationFrame(volumeAnimRef.current);
      volumeAnimRef.current = null;
    }
    setAudioLevel(0);
  };

  const triggerSpeechAudioLevelPulse = () => {
    // Pulse audio level to animate avatar voice orb naturally while speaking
    setAudioLevel(0.6 + Math.random() * 0.4);
    if (volumeAnimRef.current) {
      cancelAnimationFrame(volumeAnimRef.current);
    }
    const decay = () => {
      setAudioLevel((prev) => {
        const next = prev * 0.88;
        if (next > 0.05 && isListeningRef.current) {
          volumeAnimRef.current = requestAnimationFrame(decay);
          return next;
        }
        return 0;
      });
    };
    volumeAnimRef.current = requestAnimationFrame(decay);
  };

  // Safe internal stop
  const cleanupRecognition = useCallback(() => {
    clearSilenceTimer();
    stopVolumeAnimation();
    isListeningRef.current = false;
    accumulatedSpeechRef.current = '';
    setInterimTranscript('');
    setIsListening(false);

    if (recognitionRef.current) {
      try {
        const rec = recognitionRef.current;
        recognitionRef.current = null;
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.abort();
      } catch (e) {}
    }
  }, []);

  // Commit recognized speech & notify
  const commitSpeech = useCallback(() => {
    clearSilenceTimer();
    stopVolumeAnimation();

    const text = accumulatedSpeechRef.current.trim();
    if (!text || !isListeningRef.current) {
      cleanupRecognition();
      return;
    }

    // Stop listening before sending
    cleanupRecognition();

    // Deliver recognized text to parent
    onFinalResultRef.current?.(text);
  }, [cleanupRecognition]);

  // Start listening
  const startListening = useCallback(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      onErrorRef.current?.('Speech recognition is not supported in this browser. Please use Google Chrome, Edge, or Safari.');
      return;
    }

    // Clean up any lingering previous session first
    cleanupRecognition();
    clearSilenceTimer();
    accumulatedSpeechRef.current = '';
    setInterimTranscript('');
    isListeningRef.current = true;
    setIsListening(true);

    try {
      const recognition = new SpeechRecognitionAPI();

      // Mobile devices (Android/iOS) perform much better with continuous: false
      const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      recognition.continuous = !isMobile;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        if (!isListeningRef.current) return;

        let currentInterim = '';
        let finalBatch = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalBatch += item[0].transcript;
          } else {
            currentInterim += item[0].transcript;
          }
        }

        const activeText = (finalBatch || currentInterim).trim();

        if (activeText && isListeningRef.current) {
          accumulatedSpeechRef.current = activeText;
          setInterimTranscript(activeText);
          onInterimResultRef.current?.(activeText);
          triggerSpeechAudioLevelPulse();

          clearSilenceTimer();

          if (finalBatch && isMobile) {
            // On mobile, final batch immediately commits
            commitSpeech();
          } else {
            silenceTimerRef.current = setTimeout(() => {
              if (isListeningRef.current) {
                commitSpeech();
              }
            }, silenceTimeoutMs);
          }
        }
      };

      recognition.onerror = (event: any) => {
        if (!isListeningRef.current) return;
        clearSilenceTimer();

        if (event.error === 'not-allowed') {
          onErrorRef.current?.('Microphone permission blocked. Please allow microphone in your browser address bar.');
          cleanupRecognition();
        } else if (event.error === 'network') {
          onErrorRef.current?.('Speech recognition network error. Please check your internet connection.');
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('SpeechRecognition error:', event.error);
        }
      };

      recognition.onend = () => {
        // If recognition naturally ends while user was speaking, commit what was heard
        if (isListeningRef.current) {
          if (accumulatedSpeechRef.current.trim()) {
            commitSpeech();
          } else {
            // Re-arm cleanly after 300ms if still listening
            setTimeout(() => {
              if (isListeningRef.current && recognitionRef.current) {
                try {
                  recognition.start();
                } catch (e) {
                  cleanupRecognition();
                }
              }
            }, 300);
          }
        } else {
          cleanupRecognition();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Error starting speech recognition:', err);
      cleanupRecognition();
    }
  }, [cleanupRecognition, commitSpeech, silenceTimeoutMs]);

  const stopListening = useCallback(() => {
    cleanupRecognition();
  }, [cleanupRecognition]);

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  return {
    isListening,
    interimTranscript,
    audioLevel,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
  };
}
