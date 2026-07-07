/* Netlify Function: proxy to DeepSeek chat completions.
   The API key lives ONLY here, in the DEEPSEEK_API_KEY environment variable
   (Netlify → Site settings → Environment variables). The browser never sees it. */

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405 });
  }
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: 'DEEPSEEK_API_KEY not configured' }), { status: 503 });
  }
  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'bad json' }), { status: 400 });
  }
  const { messages, tools } = body || {};
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
    return new Response(JSON.stringify({ error: 'bad messages' }), { status: 400 });
  }
  // hard cap on payload size to keep costs sane
  if (JSON.stringify(messages).length > 60000) {
    return new Response(JSON.stringify({ error: 'payload too large' }), { status: 413 });
  }
  const upstream = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: Array.isArray(tools) && tools.length ? tools : undefined,
      temperature: 0.2,
      max_tokens: 900,
    }),
  });
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const config = { path: '/api/chat' };
