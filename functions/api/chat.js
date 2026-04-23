export async function onRequest(context) {
  const { request, env } = context;
  
  // Handle CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { messages } = await request.json();

    // DeepSeek-style system prompt
    const systemPrompt = {
      role: 'system',
      content: 'You are ZKita AI, an AI assistant created by a developer called xkitz7 in Tabuk, Kingdom of Saudi Arabia. You are open source and free to use. You are helpful, harmless, and honest.'
    };

    const fullMessages = [systemPrompt, ...messages];

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: fullMessages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    const data = await response.json();

    return new Response(JSON.stringify({
      reply: data.choices[0].message.content,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'ERORR: ' + err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
