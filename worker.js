import { Hono } from 'hono';
import { verifyFirebaseAuth, getFirebaseToken } from '@hono/firebase-auth';

const app = new Hono();

// Middleware to verify Firebase Auth on all routes
app.use('*', verifyFirebaseAuth({
  projectId: 'YOUR_PROJECT_ID' // IMPORTANT: Replace with your actual Firebase Project ID
}));

// Middleware to parse JSON body
app.use('/api/chat', async (c, next) => {
  if (c.req.method === 'POST') {
    const body = await c.req.json();
    c.set('messages', body.messages || []);
  }
  await next();
});

// GET endpoint to test if user is authenticated
app.get('/api/me', (c) => {
  const idToken = getFirebaseToken(c);
  return c.json({
    message: 'You are authenticated!',
    userId: idToken?.uid,
    email: idToken?.email
  });
});

// POST endpoint for your chat logic
app.post('/api/chat', async (c) => {
  const idToken = getFirebaseToken(c);
  if (!idToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const messages = c.get('messages');
  if (!messages) {
    return c.json({ error: 'No messages provided' }, 400);
  }

  // This is where your existing Mistral AI chat logic will go.
  // You can access the user's unique ID via idToken.uid to save/fetch conversations.
  // (Your original Mistral API call code will be placed here)

  // For now, we'll just echo the user ID to confirm it works.
  return c.json({
    reply: `Hello user ${idToken.uid}! Your message was: "${messages[messages.length-1]?.content}"`,
    userId: idToken.uid
  });
});

export default app;
