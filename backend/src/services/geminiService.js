import { GoogleGenAI } from '@google/genai';

export async function generateGeminiReply({
  apiKey,
  modelName = 'gemini-flash-lite-latest',
  messages = [],
  systemInstruction,
}) {
  const cleanKey = apiKey || process.env.GEMINI_API_KEY;
  if (!cleanKey) {
    throw new Error('No Gemini API Key configured on server or in request');
  }

  const effectiveModel =
    !modelName || modelName.includes('llama') || modelName.includes('qwen') || modelName.includes('2.0') || modelName.includes('2.5') || modelName.includes('3.8')
      ? 'gemini-flash-lite-latest'
      : modelName;

  const validMessages = messages.filter((m) => m.role === 'user' || m.role === 'assistant');
  const contents = validMessages.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  try {
    const ai = new GoogleGenAI({ apiKey: cleanKey });
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
      return text.trim();
    }
  } catch (sdkError) {
    // Secure REST fallback with x-goog-api-key header
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
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Gemini API error ${res.status}`);
    }

    const data = await res.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (candidateText) {
      return candidateText.trim();
    }
  }

  throw new Error('No response text returned by Gemini');
}
