import { useState, useEffect, useRef, useCallback } from 'react';

// Browser SpeechRecognition interface
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
  silenceTimeoutMs = 1500,
}: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const isListeningRef = useRef(false);
  const silenceTimerRef = useRef<any>(null);
  const accumulatedSpeechRef = useRef<string>('');

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

  // Safe internal stop
  const cleanupRecognition = useCallback(() => {
    clearSilenceTimer();
    isListeningRef.current = false;
    accumulatedSpeechRef.current = '';
    setInterimTranscript('');
    setIsListening(false);
    setAudioLevel(0);

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

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

  // Commit speech & turn off mic
  const commitSpeech = useCallback(() => {
    clearSilenceTimer();
    const text = accumulatedSpeechRef.current.trim();

    if (!text || !isListeningRef.current) {
      cleanupRecognition();
      return;
    }

    // Immediately stop mic so it doesn't hear anything else
    cleanupRecognition();

    // Send recognized text
    onFinalResultRef.current?.(text);
  }, [cleanupRecognition]);

  // Audio level visualizer loop
  const startVisualizer = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;
      if (!micStreamRef.current || !micStreamRef.current.active) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        }).catch(() => null);
        if (!stream) return;
        micStreamRef.current = stream;
      }

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(micStreamRef.current);
        source.connect(analyser);
      } else if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }

      const analyser = analyserRef.current;
      if (!analyser) return;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVolume = () => {
        if (!isListeningRef.current) {
          setAudioLevel(0);
          return;
        }

        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(1, Math.max(0, avg / 128)));

        animFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err) {
      // Visualizer is non-critical; speech recognition works regardless
    }
  };

  // Start listening with a FRESH instance every single turn!
  const startListening = useCallback(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      onErrorRef.current?.('Speech recognition is not supported in this browser.');
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
      // Create a fresh instance for this turn
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

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

          clearSilenceTimer();

          if (finalBatch) {
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
          onErrorRef.current?.('Microphone permission blocked. Please allow microphone access in your browser to talk to Mira.');
          cleanupRecognition();
        } else if (event.error === 'network') {
          onErrorRef.current?.('Speech recognition network error. Please check your internet connection.');
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('SpeechRecognition error:', event.error);
        }
      };

      recognition.onend = () => {
        // If ended while still supposed to be listening (e.g. Chrome silent pause), restart if text was empty
        if (isListeningRef.current) {
          if (accumulatedSpeechRef.current.trim()) {
            commitSpeech();
          } else {
            // Restart seamlessly
            try {
              recognition.start();
            } catch (e) {
              setIsListening(false);
              isListeningRef.current = false;
            }
          }
        } else {
          setIsListening(false);
          isListeningRef.current = false;
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      startVisualizer();
    } catch (err: any) {
      console.warn('Error starting fresh recognition instance:', err);
      setIsListening(false);
      isListeningRef.current = false;
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRecognition();
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [cleanupRecognition]);

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
