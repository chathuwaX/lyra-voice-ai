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
  continuous = false,
  silenceTimeoutMs = 1000,
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

  // Critical state flags to prevent echo and loop re-triggering
  const isActiveRef = useRef(false);
  const silenceTimerRef = useRef<any>(null);
  const accumulatedSpeechRef = useRef<string>('');
  const lastCommittedTextRef = useRef<string>('');
  const lastCommittedTimeRef = useRef<number>(0);

  const onFinalResultRef = useRef(onFinalResult);
  onFinalResultRef.current = onFinalResult;

  const onInterimResultRef = useRef(onInterimResult);
  onInterimResultRef.current = onInterimResult;

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  // Hard stop & abort helper to prevent any pending audio from leaking
  const hardAbortRecognition = useCallback(() => {
    clearSilenceTimer();
    isActiveRef.current = false;
    accumulatedSpeechRef.current = '';
    setInterimTranscript('');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort(); // abort clears buffers immediately
      } catch (e) {}
    }
    setIsListening(false);
    stopAudioAnalysis();
  }, []);

  // Commit accumulated speech once, then immediately shut off mic
  const commitSpeech = useCallback(() => {
    clearSilenceTimer();
    const text = accumulatedSpeechRef.current.trim();

    if (!text || !isActiveRef.current) {
      return;
    }

    const now = Date.now();
    // Prevent duplicate commits of the same text within 2.5 seconds
    if (text === lastCommittedTextRef.current && now - lastCommittedTimeRef.current < 2500) {
      hardAbortRecognition();
      return;
    }

    lastCommittedTextRef.current = text;
    lastCommittedTimeRef.current = now;

    // Immediately shut down mic so it cannot hear anything else
    hardAbortRecognition();

    // Deliver user's question to the app
    onFinalResultRef.current?.(text);
  }, [hardAbortRecognition]);

  useEffect(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      // If mic was turned off or aborted, strictly ignore any trailing results
      if (!isActiveRef.current) {
        return;
      }

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

      if (activeText && isActiveRef.current) {
        accumulatedSpeechRef.current = activeText;
        setInterimTranscript(activeText);
        onInterimResultRef.current?.(activeText);

        clearSilenceTimer();

        if (finalBatch) {
          commitSpeech();
        } else {
          // Silence timeout: when user pauses for silenceTimeoutMs, finalize
          silenceTimerRef.current = setTimeout(() => {
            if (isActiveRef.current) {
              commitSpeech();
            }
          }, silenceTimeoutMs);
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (!isActiveRef.current) return;
      console.warn('SpeechRecognition error:', event.error);
      clearSilenceTimer();

      if (event.error === 'not-allowed') {
        onError?.('Microphone permission denied. Please allow microphone access.');
        hardAbortRecognition();
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        onError?.(`Speech error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      clearSilenceTimer();
      // If still supposed to be active (e.g. browser timed out while listening), restart
      if (isActiveRef.current && continuous) {
        try {
          recognition.start();
        } catch (e) {
          setIsListening(false);
          isActiveRef.current = false;
        }
      } else {
        setIsListening(false);
        isActiveRef.current = false;
        stopAudioAnalysis();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      clearSilenceTimer();
      try {
        recognition.abort();
      } catch (e) {}
      stopAudioAnalysis();
    };
  }, [continuous, silenceTimeoutMs, commitSpeech, hardAbortRecognition, onError]);

  // Audio level visualizer with echo cancellation enabled
  const startAudioAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVolume = () => {
        if (!analyserRef.current || !isActiveRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, Math.max(0, avg / 128));
        setAudioLevel(normalized);

        animFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err) {
      console.warn('Audio analysis stream could not be started:', err);
    }
  };

  const stopAudioAnalysis = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      onError?.('Speech recognition is not supported in this browser.');
      return;
    }

    // Reset all buffers and mark active
    clearSilenceTimer();
    accumulatedSpeechRef.current = '';
    setInterimTranscript('');
    isActiveRef.current = true;

    try {
      recognitionRef.current.start();
      setIsListening(true);
      startAudioAnalysis();
    } catch (err: any) {
      if (err.name === 'InvalidStateError') {
        // Recognition was still closing, retry after clean 200ms pause
        setTimeout(() => {
          if (isActiveRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
              setIsListening(true);
              startAudioAnalysis();
            } catch (e) {
              setIsListening(true);
            }
          }
        }, 200);
      } else {
        console.error('Error starting recognition:', err);
        onError?.('Could not activate microphone.');
      }
    }
  }, [onError]);

  const stopListening = useCallback(() => {
    hardAbortRecognition();
  }, [hardAbortRecognition]);

  const toggleListening = useCallback(() => {
    if (isListening || isActiveRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

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
