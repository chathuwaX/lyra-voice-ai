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
  modelName: string = 'gemini-3.8-flash',
  history: Message[],
  systemInstruction: string = DEFAULT_SYSTEM_INSTRUCTION,
  onChunk?: (partialText: string) => void
): Promise<string> {
  const cleanKey = apiKey?.trim() || '';
  if (!cleanKey) {
    throw new Error('Please enter your free API Key in Settings to start the conversation.');
  }

  // Filter out system or interim messages
  const validMessages = history.filter((m) => m.role === 'user' || m.role === 'assistant');
  if (validMessages.length === 0) {
    throw new Error('No user prompt found in history');
  }

  // 1. Check if user provided an ultra-fast Groq API key (starts with "gsk_")
  if (cleanKey.startsWith('gsk_')) {
    try {
      // Active Groq models
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

  // 2. Google Gemini Engine (with SDK + fast secure REST fallback)
  const effectiveModel =
    !modelName || modelName === 'gemini-2.5-flash'
      ? 'gemini-3.8-flash'
      : modelName.includes('llama')
      ? 'gemini-3.8-flash'
      : modelName;

  const contents = validMessages.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  try {
    const ai = new GoogleGenAI({ apiKey: cleanKey });

    // Try generateContentStream for real-time streaming
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

    // Direct generateContent call
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
    // Direct REST fallback - uses secure x-goog-api-key header instead of URL query parameter
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
