import express from 'express';
import { loadedKnowledge, safeFile, DATA_ROOT } from './services/knowledgeService.js';
import { createAskRouter } from './routes/ask.js';
import { knowledgeBase, SUBJECTS } from './services/retrievalService.js';
import { aiConfigured } from './services/aiService.js';

export function createApp({ answer } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const origin = req.get('origin');
    if (origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173') {
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Vary', 'Origin');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      if (req.method === 'OPTIONS') return res.sendStatus(204);
    }
    next();
  });
  app.use(express.json({ limit: '12kb' }));
  app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'MaturaAI' });
  });
  app.get('/api/status', (req, res) => {
    res.json({
      aiConfigured: aiConfigured(),
      knowledgeCount: knowledgeBase.length,
      verifiedCount: knowledgeBase.filter(chunk => chunk.verified).length,
      subjects: SUBJECTS.map(name => ({
        name, verifiedCount: knowledgeBase.filter(chunk => chunk.subject === name && chunk.verified).length,
      })),
      sourceNote: 'Limited curated coverage: Kosovo educational materials, 2016 curriculum, historical Matura 2014 and distinct external references.',
    });
  });
  app.get('/api/sources/:id/file', (req, res) => {
    const source = loadedKnowledge.sources.find(s => s.id === req.params.id);
    if (!source?.originalFile) return res.status(404).json({ error: 'Local source not found.' });
    res.set('X-Content-Type-Options', 'nosniff');
    res.sendFile(safeFile(DATA_ROOT, source.originalFile));
  });
  app.use('/api/ask', createAskRouter(answer));
  app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
  app.use((error, req, res, next) => {
    const status = error.type === 'entity.parse.failed' ? 400 : error.type === 'entity.too.large' ? 413 : 500;
    res.status(status).json({ error: status === 400 ? 'Invalid JSON request.' : status === 413 ? 'Request is too large.' : 'The tutor could not process your question. Please try again.' });
  });
  return app;
}
export const app = createApp();
