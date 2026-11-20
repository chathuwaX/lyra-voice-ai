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
}

export function useSpeechRecognition({
  onFinalResult,
  onInterimResult,
  onError,
  continuous = false,
}: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 1 for visualizer
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isManuallyStoppedRef = useRef(false);

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
      let currentInterim = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finalTranscript += item[0].transcript;
        } else {
          currentInterim += item[0].transcript;
        }
      }

      setInterimTranscript(currentInterim);
      if (onInterimResult && currentInterim) {
        onInterimResult(currentInterim);
      }

      if (finalTranscript.trim() && onFinalResult) {
        setInterimTranscript('');
        onFinalResult(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('SpeechRecognition error:', event.error);
      if (event.error === 'not-allowed') {
        onError?.('Microphone permission denied. Please allow microphone access in your browser.');
        stopListening();
      } else if (event.error === 'network') {
        onError?.('Speech recognition network error. Please check your connection or use text input.');
      } else if (event.error !== 'no-speech') {
        onError?.(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // If still continuous and not manually stopped, restart
      if (!isManuallyStoppedRef.current && continuous) {
        try {
          recognition.start();
        } catch (e) {
          setIsListening(false);
        }
      } else {
        setIsListening(false);
        stopAudioAnalysis();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch (e) {}
      stopAudioAnalysis();
    };
  }, [continuous, onFinalResult, onInterimResult, onError]);

  // Audio level visualizer for microphone wave animation
  const startAudioAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        // Normalize 0 to 1
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
    isManuallyStoppedRef.current = false;
    setInterimTranscript('');
    try {
      recognitionRef.current.start();
      setIsListening(true);
      startAudioAnalysis();
    } catch (err: any) {
      // In case it was already active
      if (err.name === 'InvalidStateError') {
        setIsListening(true);
      } else {
        console.error('Error starting recognition:', err);
        onError?.('Could not activate microphone recognition.');
      }
    }
  }, [onError]);

  const stopListening = useCallback(() => {
    isManuallyStoppedRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
    stopAudioAnalysis();
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
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
