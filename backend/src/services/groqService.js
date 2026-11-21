export async function generateGroqReply({
  apiKey,
  modelName = 'openai/gpt-oss-20b',
  messages = [],
  systemInstruction,
}) {
  const cleanKey = apiKey || process.env.GROQ_API_KEY;
  if (!cleanKey) {
    throw new Error('No Groq API Key configured on server or in request');
  }

  const validGroqModels = ['openai/gpt-oss-20b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b'];
  const groqModel = validGroqModels.includes(modelName) ? modelName : 'openai/gpt-oss-20b';

  const validMessages = messages.filter((m) => m.role === 'user' || m.role === 'assistant');

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
    throw new Error(errJson?.error?.message || `Groq error: ${res.statusText}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('No completion returned from Groq');
  }

  return content;
}
