import { GoogleGenAI } from '@google/genai';
import { Message } from '../types';

export const DEFAULT_SYSTEM_INSTRUCTION = `You are "Mira", an intelligent, warm, and highly capable voice AI assistant in an antigravity holographic interface. 
You are speaking directly in a real-time voice conversation with the user.

Key conversational rules:
1. Speak naturally, concisely, and warmly, just like an articulate, thoughtful human companion.
2. Keep responses brief: exactly 2 to 4 sentences maximum unless the user specifically asks for deep technical explanations or a list.
3. Actively drive natural two-way conversation by asking an insightful, relevant follow-up question or offering an engaging next step at the end of your response.
4. Do NOT use markdown symbols, bullet asterisks (*, -), hashes (#), code fences, or URLs, because your response will be read aloud by browser text-to-speech. Spell out abbreviations or acronyms if needed for clear pronunciation.
5. Never be robotic or stiff. Be curious, helpful, and empathetic.`;

export async function generateGeminiReply(
  apiKey: string,
  modelName: string = 'gemini-2.5-flash',
  history: Message[],
  systemInstruction: string = DEFAULT_SYSTEM_INSTRUCTION
): Promise<string> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Please enter your Gemini API Key in Settings to start the conversation.');
  }

  // Format messages for Gemini API
  // Filter out system or interim messages
  const validMessages = history.filter((m) => m.role === 'user' || m.role === 'assistant');

  // Try using @google/genai SDK first
  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Map conversation history
    const contents = validMessages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // If contents is empty, fail early
    if (contents.length === 0) {
      throw new Error('No user prompt found in history');
    }

    const response = await ai.models.generateContent({
      model: modelName || 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        temperature: 0.7,
        maxOutputTokens: 250,
      }
    });

    const text = response.text;
    if (text && text.trim()) {
      return text.trim();
    }
  } catch (sdkError: any) {
    console.warn('SDK call warning, attempting direct endpoint fallback:', sdkError);

    // Fallback directly to REST endpoint in case of bundle/SDK differences
    try {
      const contents = validMessages.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const model = modelName || 'gemini-2.5-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 250,
          }
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const message = errorData?.error?.message || `API error ${res.status}: ${res.statusText}`;
        throw new Error(message);
      }

      const data = await res.json();
      const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (candidateText) {
        return candidateText.trim();
      }
      throw new Error('No response content returned by Gemini.');
    } catch (fallbackError: any) {
      const originalMessage = sdkError?.message || fallbackError?.message || 'Failed to connect to Gemini API';
      throw new Error(originalMessage);
    }
  }

  throw new Error('Could not generate response from Gemini.');
}
