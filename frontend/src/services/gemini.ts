import { GoogleGenAI } from '@google/genai';
import { Message } from '../types';

export const DEFAULT_SYSTEM_INSTRUCTION = `You are "Mira", an intelligent, warm, and highly capable voice AI assistant in an antigravity holographic interface. 
You are speaking directly in a real-time voice conversation with the user.

Key conversational rules:
1. Speak naturally, concisely, and warmly, just like an articulate, thoughtful human companion.
2. Keep responses brief: exactly 2 to 3 sentences maximum for ultra-fast natural spoken exchange.
3. Actively drive natural two-way conversation by asking an insightful, relevant follow-up question at the end.
4. Do NOT use markdown symbols, bullet asterisks (*, -), hashes (#), code fences, or URLs, because your response will be read aloud by browser text-to-speech. Spell out abbreviations or acronyms if needed for clear pronunciation.
5. Never be robotic or stiff. Be curious, helpful, and empathetic.`;

/**
 * Strips and redacts any sensitive API key strings or query parameters from error messages
 * so secrets are never leaked into the UI, toasts, or console logs.
 */
export function sanitizeErrorMessage(rawMessage?: string, userKey?: string): string {
  if (!rawMessage) return 'An error occurred during communication.';
  let sanitized = String(rawMessage);

  if (userKey && userKey.trim().length > 6) {
    sanitized = sanitized.split(userKey.trim()).join('[REDACTED_API_KEY]');
  }

  // Redact any string resembling Google or Groq API keys
  sanitized = sanitized
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED_API_KEY]')
    .replace(/gsk_[0-9A-Za-z_-]{20,}/g, '[REDACTED_API_KEY]')
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')
    .replace(/[?&]key=[^&\s]+/gi, '?key=[REDACTED]');

  return sanitized;
}

export async function generateGeminiReply(
  apiKey: string,
  modelName: string = 'qwen/qwen3.8-27b',
  history: Message[],
  systemInstruction: string = DEFAULT_SYSTEM_INSTRUCTION,
  onChunk?: (partialText: string) => void
): Promise<string> {
  const cleanKey = apiKey?.trim() || '';

  // Filter out system or interim messages
  const validMessages = history.filter((m) => m.role === 'user' || m.role === 'assistant');
  if (validMessages.length === 0) {
    throw new Error('No user prompt found in history');
  }

  // 1. Primary Strategy: Call Express Backend Serverless API (/api/chat)
  const apiBase = (import.meta.env.VITE_API_URL as string) || '/api';
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (cleanKey) {
      headers['X-Api-Key'] = cleanKey;
    }

    const backendRes = await fetch(`${apiBase}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages: validMessages,
        modelName,
        systemInstruction,
      }),
    });

    if (backendRes.ok) {
      const data = await backendRes.json();
      if (data?.reply) {
        onChunk?.(data.reply);
        return data.reply;
      }
    } else {
      const errData = await backendRes.json().catch(() => ({}));
      const detailedError =
        errData?.error ||
        `Backend API returned status ${backendRes.status} (${backendRes.statusText || 'Function Error'}). Please check Netlify serverless function.`;
      if (!cleanKey) {
        throw new Error(detailedError);
      }
    }
  } catch (backendErr: any) {
    if (backendErr?.message && !backendErr.message.includes('fetch')) {
      throw backendErr;
    }
    // Backend unreachable (e.g. running standalone static build without local Express server)
    // Fall back to client-side direct calling if client key is provided
  }

  // 2. Client-side fallback: requires user API key
  if (!cleanKey) {
    throw new Error('AI assistant service is currently unavailable. Please try again shortly.');
  }

  // Groq direct client call
  if (cleanKey.startsWith('gsk_')) {
    try {
      const validGroqModels = ['openai/gpt-oss-20b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b'];
      const groqModel = validGroqModels.includes(modelName) ? modelName : 'openai/gpt-oss-20b';

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cleanKey}`,
        },
        body: JSON.stringify({
          model: groqModel,
          messages: [
            { role: 'system', content: systemInstruction },
            ...validMessages.map((m) => ({ role: m.role, content: m.content })),
          ],
          max_tokens: 150,
          temperature: 0.65,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const rawErr = errJson?.error?.message || `Groq error: ${res.statusText}`;
        throw new Error(sanitizeErrorMessage(rawErr, cleanKey));
      }

      const groqData = await res.json();
      const content = groqData?.choices?.[0]?.message?.content?.trim();
      if (content) {
        onChunk?.(content);
        return content;
      }
    } catch (groqErr: any) {
      throw new Error(sanitizeErrorMessage(groqErr?.message || 'Groq connection error', cleanKey));
    }
  }

  // Google Gemini direct client call
  const effectiveModel =
    !modelName || modelName.includes('llama') || modelName.includes('qwen') || modelName.includes('2.0') || modelName.includes('2.5')
      ? 'gemini-flash-lite-latest'
      : modelName;

  const contents = validMessages.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  try {
    const ai = new GoogleGenAI({ apiKey: cleanKey });

    if (typeof (ai.models as any).generateContentStream === 'function') {
      const responseStream = await (ai.models as any).generateContentStream({
        model: effectiveModel,
        contents,
        config: {
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          temperature: 0.65,
          maxOutputTokens: 150,
        },
      });

      let accumulated = '';
      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          accumulated += text;
          onChunk?.(accumulated);
        }
      }

      if (accumulated.trim()) {
        return accumulated.trim();
      }
    }

    const response = await ai.models.generateContent({
      model: effectiveModel,
      contents,
      config: {
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        temperature: 0.65,
        maxOutputTokens: 150,
      },
    });

    const text = response.text;
    if (text && text.trim()) {
      onChunk?.(text.trim());
      return text.trim();
    }
  } catch (sdkError: any) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${effectiveModel}:generateContent`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': cleanKey,
        },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          generationConfig: {
            temperature: 0.65,
            maxOutputTokens: 150,
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const message = errorData?.error?.message || `API error ${res.status}: ${res.statusText}`;
        throw new Error(sanitizeErrorMessage(message, cleanKey));
      }

      const data = await res.json();
      const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (candidateText) {
        onChunk?.(candidateText.trim());
        return candidateText.trim();
      }
      throw new Error('No response content returned by Gemini.');
    } catch (fallbackError: any) {
      const originalMessage =
        sdkError?.message || fallbackError?.message || 'Failed to connect to API';
      throw new Error(sanitizeErrorMessage(originalMessage, cleanKey));
    }
  }

  throw new Error('Could not generate response.');
}
