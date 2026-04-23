import { Hono } from 'hono';
import { verifyFirebaseAuth, getFirebaseToken } from '@hono/firebase-auth';

const app = new Hono();

// Middleware to verify Firebase Auth on all API routes
app.use('/api/*', verifyFirebaseAuth({
  projectId: 'zkita-ai',  // your Firebase Project ID
}));

// Middleware to parse JSON body for POST requests
app.use('/api/chat', async (c, next) => {
  if (c.req.method === 'POST') {
    const body = await c.req.json();
    c.set('messages', body.messages || []);
  }
  await next();
});

// GET endpoint to verify authentication is working
app.get('/api/me', (c) => {
  const idToken = getFirebaseToken(c);
  if (!idToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  return c.json({
    message: 'You are authenticated!',
    userId: idToken.uid,
    email: idToken.email
  });
});

// POST endpoint for chat
app.post('/api/chat', async (c) => {
  const idToken = getFirebaseToken(c);
  if (!idToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const messages = c.get('messages');
  if (!messages || !Array.isArray(messages)) {
    return c.json({ error: 'Invalid messages' }, 400);
  }

  const MISTRAL_API_KEY = c.env.MISTRAL_API_KEY;
  if (!MISTRAL_API_KEY) {
    console.error('Mistral API key is missing');
    return c.json({ error: 'Server configuration error' }, 500);
  }

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't process that.";

    return c.json({ reply });
  } catch (error) {
    console.error('Mistral API error:', error);
    return c.json({ error: 'Failed to get response from AI' }, 500);
  }
});

export default app;
