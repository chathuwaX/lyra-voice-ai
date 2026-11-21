/**
 * Netlify Serverless Function for Mira Voice AI
 * Native ES module using built-in fetch (Node 18/20).
 * Zero external dependencies required for Netlify bundling.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

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
  // Normalize path (handle /api/chat, /.netlify/functions/api/chat, /chat)
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
          { id: 'gemini-3.8-flash', provider: 'google', name: 'Gemini 3.8 Flash (Recommended)' },
          { id: 'gemini-2.0-flash', provider: 'google', name: 'Gemini 2.0 Flash' },
          { id: 'openai/gpt-oss-20b', provider: 'groq', name: 'GPT-OSS 20B (Groq)' },
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

      const { messages = [], modelName = 'gemini-3.8-flash', systemInstruction } = body;

      if (!Array.isArray(messages) || messages.length === 0) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: 'Messages array cannot be empty.' }),
        };
      }

      // Check API Key: Request header override > Netlify environment variable
      const headerKey =
        event.headers['x-api-key'] ||
        event.headers['X-Api-Key'] ||
        (event.headers['authorization'] || '').replace(/^Bearer\s+/i, '');

      const geminiKey = headerKey && !headerKey.startsWith('gsk_') ? headerKey : process.env.GEMINI_API_KEY;
      const groqKey = headerKey && headerKey.startsWith('gsk_') ? headerKey : process.env.GROQ_API_KEY;

      const isGroq =
        (headerKey && headerKey.startsWith('gsk_')) ||
        (!geminiKey && groqKey) ||
        (modelName && (modelName.includes('gpt') || modelName.includes('qwen')));

      // Fallback: If neither key is available
      if (!geminiKey && !groqKey) {
        return {
          statusCode: 500,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            success: false,
            error:
              'GEMINI_API_KEY is not configured in Netlify Environment Variables. Please go to Netlify Dashboard -> Site configuration -> Environment variables and add GEMINI_API_KEY.',
          }),
        };
      }

      let replyText = '';

      if (isGroq && groqKey) {
        // --- GROQ API CALL ---
        const groqModel = modelName.includes('gpt') || modelName.includes('qwen') ? modelName : 'openai/gpt-oss-20b';
        const formattedMessages = [
          ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
          ...messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
        ];

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: groqModel,
            messages: formattedMessages,
            max_tokens: 200,
            temperature: 0.65,
          }),
        });

        if (!groqRes.ok) {
          const errData = await groqRes.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `Groq API error ${groqRes.status}`);
        }

        const data = await groqRes.json();
        replyText = data?.choices?.[0]?.message?.content?.trim() || '';
      } else {
        // --- GEMINI REST API CALL ---
        const effectiveModel = !modelName || modelName.includes('llama') ? 'gemini-3.8-flash' : modelName;
        const contents = messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

        const payload = {
          contents,
          generationConfig: {
            temperature: 0.65,
            maxOutputTokens: 200,
          },
        };

        if (systemInstruction) {
          payload.systemInstruction = {
            parts: [{ text: systemInstruction }],
          };
        }

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${effectiveModel}:generateContent?key=${geminiKey}`;

        const geminiRes = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!geminiRes.ok) {
          const errData = await geminiRes.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `Google Gemini API returned status ${geminiRes.status}`);
        }

        const data = await geminiRes.json();
        replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      }

      if (!replyText) {
        return {
          statusCode: 500,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: 'AI returned an empty response.' }),
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
