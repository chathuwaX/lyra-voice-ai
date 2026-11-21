/**
 * Netlify Serverless Function for Mira Voice AI
 * Native ES module using built-in fetch (Node 18/20).
 * Features:
 * - 6s/7.5s AbortSignal timeouts to prevent Netlify 10s 504 Gateway Timeouts
 * - Automatic dual-engine failover: Gemini <-> Groq
 * - Ultra-fast sub-second responses using Qwen 3.8 / GPT-OSS on Groq
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

async function queryGroq(apiKey, messages, systemInstruction, modelName) {
  const model = modelName && (modelName.includes('gpt-oss') || modelName.includes('qwen'))
    ? modelName
    : 'qwen/qwen3.8-27b';

  const formattedMessages = [
    ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
    ...messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
  ];

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(7500), // Max 7.5s to ensure response before Netlify 10s timeout
    body: JSON.stringify({
      model,
      messages: formattedMessages,
      max_tokens: 180,
      temperature: 0.65,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Groq API returned HTTP ${res.status}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Groq returned empty completion text');
  return text;
}

async function queryGemini(apiKey, messages, systemInstruction, modelName) {
  const model = !modelName || modelName.includes('llama') ? 'gemini-2.5-flash' : modelName;
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const payload = {
    contents,
    generationConfig: {
      temperature: 0.65,
      maxOutputTokens: 180,
    },
  };
  if (systemInstruction) {
    payload.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(6000), // 6s timeout so we can seamlessly fail over if Google hangs
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API returned HTTP ${res.status}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('Gemini returned empty text');
  return text;
}

export async function handler(event, context) {
  // 1. Handle Preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  const rawPath = event.path || '';
  const normalizedPath = rawPath.replace(/^\/\.netlify\/functions\/api/, '').replace(/^\/api/, '');

  // 2. Health Check
  if (event.httpMethod === 'GET' && (normalizedPath === '' || normalizedPath === '/' || normalizedPath === '/health')) {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        hasGeminiKey: !!process.env.GEMINI_API_KEY,
        hasGroqKey: !!process.env.GROQ_API_KEY,
      }),
    };
  }

  // 3. Models Endpoint
  if (event.httpMethod === 'GET' && normalizedPath === '/models') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        models: [
          { id: 'qwen/qwen3.8-27b', provider: 'groq', name: 'Qwen 3.8 27B (Ultra-Fast ~400ms)' },
          { id: 'openai/gpt-oss-20b', provider: 'groq', name: 'GPT-OSS 20B (Groq Fast)' },
          { id: 'gemini-2.5-flash', provider: 'google', name: 'Gemini 2.5 Flash' },
        ],
      }),
    };
  }

  // 4. Chat Endpoint
  if (event.httpMethod === 'POST' && (normalizedPath === '/chat' || normalizedPath === '/chat/')) {
    try {
      let body = {};
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
      } catch (e) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: 'Invalid JSON request body.' }),
        };
      }

      const { messages = [], modelName = 'qwen/qwen3.8-27b', systemInstruction } = body;

      if (!Array.isArray(messages) || messages.length === 0) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: 'Messages array cannot be empty.' }),
        };
      }

      // Check API Keys
      const headerKey =
        event.headers['x-api-key'] ||
        event.headers['X-Api-Key'] ||
        (event.headers['authorization'] || '').replace(/^Bearer\s+/i, '');

      const clientIsGroq = headerKey && headerKey.startsWith('gsk_');
      const geminiKey = !clientIsGroq && headerKey ? headerKey : process.env.GEMINI_API_KEY;
      const groqKey = clientIsGroq ? headerKey : process.env.GROQ_API_KEY;

      if (!geminiKey && !groqKey) {
        return {
          statusCode: 500,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            success: false,
            error:
              'No API key configured. Please set GEMINI_API_KEY or GROQ_API_KEY in your Netlify Environment Variables.',
          }),
        };
      }

      let replyText = '';
      let lastError = null;

      // Prioritize Groq if available (sub-second latency ~400ms is ideal for digital human voice chat)
      if (groqKey) {
        try {
          replyText = await queryGroq(groqKey, messages, systemInstruction, modelName);
        } catch (groqErr) {
          console.warn('Groq query failed, trying Gemini fallback:', groqErr.message);
          lastError = groqErr;
          if (geminiKey) {
            try {
              replyText = await queryGemini(geminiKey, messages, systemInstruction, modelName);
            } catch (geminiErr) {
              lastError = geminiErr;
            }
          }
        }
      } else if (geminiKey) {
        try {
          replyText = await queryGemini(geminiKey, messages, systemInstruction, modelName);
        } catch (geminiErr) {
          lastError = geminiErr;
        }
      }

      if (!replyText) {
        return {
          statusCode: 500,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            success: false,
            error: lastError?.message || 'AI engine failed to generate a response.',
          }),
        };
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          reply: replyText,
          timestamp: new Date().toISOString(),
        }),
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          error: err.message || 'Server error processing AI response.',
        }),
      };
    }
  }

  // Fallback for unhandled paths
  return {
    statusCode: 404,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: `Path not found: ${normalizedPath}` }),
  };
}
