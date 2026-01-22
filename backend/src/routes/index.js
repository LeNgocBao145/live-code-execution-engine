import languageRoute from './languageRoute.js';
import sessionRoute from './sessionRoute.js';
import executionRoute from './executionRoute.js';

export default function route(app) {
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mount route handlers
  app.use('/languages', languageRoute);
  app.use('/code-sessions', sessionRoute);
  app.use('/executions', executionRoute);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}