import { Router } from 'express';
import { SUBJECTS } from '../services/retrievalService.js';
import { answerQuestion } from '../services/tutorService.js';

export function createAskRouter(answer = answerQuestion) {
  const router = Router();
  router.post('/', async (req, res) => {
    const body = req.body;
    if (!body || Array.isArray(body) || typeof body.question !== 'string'
      || !body.question.trim() || body.question.length > 2000
      || (body.subject != null && body.subject !== '' && !SUBJECTS.includes(body.subject))
      || (body.previousQuestion !== undefined && (typeof body.previousQuestion !== 'string' || body.previousQuestion.length > 2000))
      || (body.verifiedOnly !== undefined && typeof body.verifiedOnly !== 'boolean')) {
      return res.status(400).json({ error: 'Provide a question of 1–2,000 characters, a supported subject, and a boolean verifiedOnly.' });
    }
    const result = await answer({
      question: body.question.trim(), previousQuestion: body.previousQuestion, subject: body.subject || undefined,
      verifiedOnly: body.verifiedOnly ?? true,
    });
    res.json(result);
  });
  return router;
}
