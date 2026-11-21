import { generateGeminiReply } from '../services/geminiService.js';
import { generateGroqReply } from '../services/groqService.js';

export async function handleChat(req, res, next) {
  try {
    const { messages, modelName, systemInstruction } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'A valid non-empty messages array is required.',
      });
    }

    // Determine API Key: Client header override > Server environment variable
    const clientKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    const isGroq =
      (clientKey && clientKey.startsWith('gsk_')) ||
      (!clientKey && (modelName?.includes('gpt') || modelName?.includes('qwen') || (!process.env.GEMINI_API_KEY && process.env.GROQ_API_KEY)));

    let reply = '';

    if (isGroq) {
      reply = await generateGroqReply({
        apiKey: clientKey,
        modelName,
        messages,
        systemInstruction,
      });
    } else {
      reply = await generateGeminiReply({
        apiKey: clientKey,
        modelName,
        messages,
        systemInstruction,
      });
    }

    return res.status(200).json({
      success: true,
      reply,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export function getModels(req, res) {
  res.status(200).json({
    success: true,
    models: [
      { id: 'gemini-flash-lite-latest', provider: 'google', name: 'Gemini Flash Lite (Google)' },
      { id: 'qwen/qwen3.8-27b', provider: 'groq', name: 'Qwen 3.8 27B (Ultra-Fast ~440ms)' },
      { id: 'gemini-3.5-flash', provider: 'google', name: 'Gemini 3.5 Flash' },
    ],
  });
}
