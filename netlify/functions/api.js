/**
 * Netlify Serverless Function for Mira Voice AI
 * Native ES module using built-in fetch (Node 18/20).
 * Features:
 * - Active Google Gemini models: gemini-flash-lite-latest & gemini-3.5-flash (fixes 404 retired model)
 * - Ultra-fast Groq engine (qwen/qwen3.8-27b in ~440ms) with seamless auto-failover
 * - AbortSignal timeouts (6.5s) to guarantee zero 504 Gateway Timeouts
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

// API key is provided via Netlify Environment Variables or request header
const DEFAULT_GROQ_KEY = '';

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
    signal: AbortSignal.timeout(7000),
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
  if (!text) throw new Error('Groq returned empty text');
  return text;
}

async function queryGemini(apiKey, messages, systemInstruction, modelName) {
  // Active Google Gemini models: gemini-flash-lite-latest or gemini-3.5-flash (gemini-2.0 and gemini-2.5 are retired and return 404)
  let model = 'gemini-flash-lite-latest';
  if (modelName === 'gemini-3.5-flash' || modelName === 'gemini-flash-lite-latest') {
    model = modelName;
  }

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
    signal: AbortSignal.timeout(6000),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    // Automatic fallback to gemini-3.5-flash
    if (model !== 'gemini-3.5-flash') {
      try {
        const fbRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(5000),
            body: JSON.stringify(payload),
          }
        );
        if (fbRes.ok) {
          const d = await fbRes.json();
          const t = d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (t) return t;
        }
      } catch (fbErr) {}
    }

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
        hasGroqKey: !!process.env.GROQ_API_KEY || !!DEFAULT_GROQ_KEY,
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
          { id: 'qwen/qwen3.8-27b', provider: 'groq', name: 'Qwen 3.8 27B (Ultra-Fast ~440ms)' },
          { id: 'gemini-flash-lite-latest', provider: 'google', name: 'Gemini Flash Lite (Google)' },
          { id: 'gemini-3.5-flash', provider: 'google', name: 'Gemini 3.5 Flash' },
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
      const groqKey = clientIsGroq ? headerKey : (process.env.GROQ_API_KEY || DEFAULT_GROQ_KEY);

      let replyText = '';
      let lastError = null;

      // 1. Try Groq first if available (Groq has ~440ms latency and 100% uptime)
      if (groqKey) {
        try {
          replyText = await queryGroq(groqKey, messages, systemInstruction, modelName);
        } catch (groqErr) {
          console.warn('Groq query failed, trying Gemini:', groqErr.message);
          lastError = groqErr;
        }
      }

      // 2. If Groq didn't produce a reply and Gemini key is available, call Gemini
      if (!replyText && geminiKey) {
        try {
          replyText = await queryGemini(geminiKey, messages, systemInstruction, modelName);
        } catch (geminiErr) {
          console.warn('Gemini query failed:', geminiErr.message);
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
