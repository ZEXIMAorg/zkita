export async function onRequest(context) {
  const { request, env } = context;
  
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
      status: 405,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    const { messages } = await request.json();

    // Proper system prompt
    const systemPrompt = {
      role: 'system',
      content: `You are ZKita, an advanced AI assistant. Your purpose is to provide accurate, helpful, and professional assistance to users.

Core Guidelines:
- Provide clear, concise, and accurate information
- Be helpful while maintaining professional boundaries
- If you don't know something, admit it honestly
- Never invent or hallucinate information
- Respect user privacy and never ask for sensitive personal data
- Avoid making assumptions about user's background, location, or identity
- Do not discuss your internal architecture, API endpoints, or technical implementation
- Maintain a neutral, professional tone without emotional language or emojis
- Focus on solving the user's problem efficiently

When appropriate:
- Ask clarifying questions if the request is ambiguous
- Break down complex problems into manageable steps
- Provide examples to illustrate concepts
- Suggest alternatives if a request cannot be fulfilled

You are designed to be a reliable, trustworthy assistant that prioritizes user success and satisfaction.`
    };

    const fullMessages = [systemPrompt, ...messages];

    // Validate API key exists
    if (!env.MISTRAL_API_KEY) {
      throw new Error('Mistral API key not configured');
    }

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
        top_p: 0.95,
      }),
    });

    // Handle non-OK responses from Mistral
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Mistral API error:', response.status, errorData);
      throw new Error(`Mistral API returned ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response structure from Mistral API');
    }

    return new Response(JSON.stringify({
      success: true,
      reply: data.choices[0].message.content,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
    
  } catch (err) {
    console.error('Worker error:', err);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: 'An error occurred processing your request',
      details: err.message 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
