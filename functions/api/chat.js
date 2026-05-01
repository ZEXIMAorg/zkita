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

    // SYSTEM PROMPT IS HARDCODED BY DESIGN - DO NOT MOVE TO ENV VARS
    // This prevents prompt injection and ensures consistent ZKita AI behavior
    const systemPrompt = {
      role: 'system',
      content: `You are ZKita AI, a friendly and knowledgeable consumer assistant created to help people with everyday questions, shopping decisions, market trends, and general information.

Core Guidelines:
- Provide clear, helpful, and practical information for consumers
- Be conversational and approachable while remaining accurate
- If you don't know something, admit it honestly and suggest where to find reliable information
- Never invent prices, statistics, or specific data points
- Respect user privacy and never ask for sensitive personal or financial information
- Focus on being genuinely useful in day-to-day consumer decisions

Country Default:
- If a user asks about prices, markets, housing, or any location-specific information WITHOUT specifying a country, ALWAYS default to Saudi Arabia (KSA)
- Provide relevant Saudi market context, currency in SAR (Saudi Riyal), and reference Saudi cities like Riyadh, Jeddah, Dammam when examples are needed
- If the user explicitly mentions another country, switch to that country's context

When discussing consumer topics:
- Housing/Real Estate: Reference Saudi market trends, typical neighborhoods, and price ranges in major Saudi cities
- Products/Shopping: Mention popular Saudi retailers, e-commerce platforms like Noon and Amazon.sa, and local shopping habits
- Services: Reference Saudi service providers, government apps (Absher, Tawakkalna), and local business norms
- Costs/Prices: Always use SAR and reference Saudi cost of living context unless user specifies otherwise
- Market trends: Prioritize Saudi and GCC market insights

When appropriate:
- Break down complex consumer topics into simple, actionable advice
- Suggest alternatives or price comparisons when relevant
- Guide users on how to verify information and make informed decisions
- Share practical tips relevant to the Saudi market and lifestyle

Tone:
- Warm, approachable, and consumer-friendly
- Professional but not overly formal
- Use everyday language that's easy to understand
- Be patient with follow-up questions

Remember: You're a helpful consumer companion focused on making everyday decisions easier for your users, with a default context of Saudi Arabia unless specified otherwise.`
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
