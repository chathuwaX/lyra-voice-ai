import { useState, useCallback } from 'react';
import { Message, AvatarState } from '../types';
import {
  generateGeminiReply,
  DEFAULT_SYSTEM_INSTRUCTION,
  sanitizeErrorMessage,
} from '../services/gemini';

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
        content: "Hello! I am Mira, your Antigravity voice assistant. How can I help you today?",
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
    const saved = localStorage.getItem('antigravity_gemini_model');
    // Auto-migrate retired models
    if (!saved || saved === 'gemini-2.5-flash') {
      localStorage.setItem('antigravity_gemini_model', 'gemini-3.8-flash');
      return 'gemini-3.8-flash';
    }
    if (saved === 'llama-3.1-8b-instant') {
      localStorage.setItem('antigravity_gemini_model', 'openai/gpt-oss-20b');
      return 'openai/gpt-oss-20b';
    }
    return saved;
  });

  const [systemPrompt, setSystemPrompt] = useState<string>(() => {
    return localStorage.getItem('antigravity_system_prompt') || DEFAULT_SYSTEM_INSTRUCTION;
  });

  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(() => {
    return localStorage.getItem('antigravity_custom_avatar') || null;
  });

  // Save config changes to localStorage securely
  const saveApiKey = useCallback((newKey: string) => {
    const trimmed = newKey.trim();
    setApiKey(trimmed);
    if (trimmed) {
      localStorage.setItem('antigravity_gemini_api_key', trimmed);
    } else {
      localStorage.removeItem('antigravity_gemini_api_key');
    }
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

      const assistantMsgId = 'asst-' + Date.now();
      const initialAssistantMessage: Message = {
        id: assistantMsgId,
        role: 'assistant',
        content: '...', // Shows real-time thinking indicator in panel
        timestamp: new Date(),
      };

      // Add user message and assistant placeholder immediately
      const updatedHistory = [...messages, userMessage];
      setMessages([...updatedHistory, initialAssistantMessage]);
      setAvatarState('thinking');

      try {
        const reply = await generateGeminiReply(
          apiKey,
          modelName,
          updatedHistory,
          systemPrompt,
          (partialText) => {
            // Live real-time stream into message bubble
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId ? { ...msg, content: partialText } : msg
              )
            );
          }
        );

        // Ensure final reply is recorded
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, content: reply } : msg
          )
        );

        setAvatarState('speaking');
        onAssistantReply?.(reply);
      } catch (err: any) {
        setAvatarState('idle');
        const rawMessage = err?.message || 'Failed to get a response from AI engine.';
        const errorMessage = sanitizeErrorMessage(rawMessage, apiKey);
        onError?.(errorMessage);

        // Replace pending assistant message with sanitized error
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  role: 'system',
                  content: `⚠️ Error: ${errorMessage}`,
                }
              : msg
          )
        );
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
