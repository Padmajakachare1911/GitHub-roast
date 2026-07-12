import { generateChatReply } from '../../shared/roastLogic.js';

export async function onRequestPost(context) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const body = await context.request.json();
    const { message, stats, roast, history = [] } = body;

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'Message is required.' }), {
        status: 400,
        headers: cors,
      });
    }
    if (!stats || !roast) {
      return new Response(JSON.stringify({ error: 'Roast a profile first, then chat.' }), {
        status: 400,
        headers: cors,
      });
    }

    const apiKey = context.env.GROQ_API_KEY || context.env.OPENROUTER_API_KEY;
    const reply = await generateChatReply(stats, roast, history, message.trim(), apiKey);

    if (reply.error) {
      return new Response(JSON.stringify({ error: reply.error }), { status: 502, headers: cors });
    }

    return new Response(JSON.stringify({ reply: reply.text }), { status: 200, headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Chat failed.' }), {
      status: 500,
      headers: cors,
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
