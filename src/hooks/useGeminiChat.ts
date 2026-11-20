import { useState, useCallback, useEffect } from 'react';
import { Message, AvatarState } from '../types';
import { generateGeminiReply, DEFAULT_SYSTEM_INSTRUCTION } from '../services/gemini';

export interface UseGeminiChatOptions {
  onAssistantReply?: (reply: string) => void;
  onError?: (error: string) => void;
}

export function useGeminiChat({ onAssistantReply, onError }: UseGeminiChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>(() => {
    return [
      {
        id: 'welcome-1',
        role: 'assistant',
        content: "Hello! I am Lyra, your Antigravity voice assistant. How can I help you today?",
        timestamp: new Date(),
      },
    ];
  });

  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [apiKey, setApiKey] = useState<string>(() => {
    // Check localStorage first, then Vite env
    const saved = localStorage.getItem('antigravity_gemini_api_key');
    if (saved && saved.trim()) return saved.trim();
    return (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
  });

  const [modelName, setModelName] = useState<string>(() => {
    return localStorage.getItem('antigravity_gemini_model') || 'gemini-2.5-flash';
  });

  const [systemPrompt, setSystemPrompt] = useState<string>(() => {
    return localStorage.getItem('antigravity_system_prompt') || DEFAULT_SYSTEM_INSTRUCTION;
  });

  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(() => {
    return localStorage.getItem('antigravity_custom_avatar') || null;
  });

  // Save config changes to localStorage
  const saveApiKey = useCallback((newKey: string) => {
    setApiKey(newKey.trim());
    localStorage.setItem('antigravity_gemini_api_key', newKey.trim());
  }, []);

  const saveModel = useCallback((newModel: string) => {
    setModelName(newModel);
    localStorage.setItem('antigravity_gemini_model', newModel);
  }, []);

  const saveSystemPrompt = useCallback((newPrompt: string) => {
    setSystemPrompt(newPrompt);
    localStorage.setItem('antigravity_system_prompt', newPrompt);
  }, []);

  const saveCustomAvatar = useCallback((dataUrl: string | null) => {
    setCustomAvatarUrl(dataUrl);
    if (dataUrl) {
      localStorage.setItem('antigravity_custom_avatar', dataUrl);
    } else {
      localStorage.removeItem('antigravity_custom_avatar');
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content: "Conversation cleared. What would you like to explore next?",
        timestamp: new Date(),
      },
    ]);
  }, []);

  const sendMessage = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed) return;

      const userMessage: Message = {
        id: 'usr-' + Date.now(),
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      };

      const updatedHistory = [...messages, userMessage];
      setMessages(updatedHistory);
      setAvatarState('thinking');

      try {
        const reply = await generateGeminiReply(
          apiKey,
          modelName,
          updatedHistory,
          systemPrompt
        );

        const assistantMsg: Message = {
          id: 'asst-' + Date.now(),
          role: 'assistant',
          content: reply,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setAvatarState('speaking');

        onAssistantReply?.(reply);
      } catch (err: any) {
        console.error('Gemini error:', err);
        setAvatarState('idle');
        const errorMessage = err?.message || 'Failed to get a response from Gemini.';
        onError?.(errorMessage);

        const errorMsg: Message = {
          id: 'err-' + Date.now(),
          role: 'system',
          content: `⚠️ Error: ${errorMessage}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    },
    [apiKey, modelName, messages, systemPrompt, onAssistantReply, onError]
  );

  return {
    messages,
    avatarState,
    setAvatarState,
    apiKey,
    saveApiKey,
    modelName,
    saveModel,
    systemPrompt,
    saveSystemPrompt,
    customAvatarUrl,
    saveCustomAvatar,
    sendMessage,
    clearMessages,
  };
}
