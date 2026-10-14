import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { getProductivitySummary, updateWeeklyGoal } from '../services/productivity.js';

export const productivityRouter = Router();
productivityRouter.use(requireAuth);

productivityRouter.get('/', (request, response) => {
  const parsed = z.object({
    date: z.iso.date().default(() => new Date().toISOString().slice(0, 10))
  }).safeParse(request.query);
  if (!parsed.success) {
    response.status(400).json({ error: 'Data de referência inválida.' });
    return;
  }
  response.json({ productivity: getProductivitySummary(request.userId!, parsed.data.date) });
});

productivityRouter.patch('/settings', (request, response) => {
  const parsed = z.object({ weeklyGoal: z.number().int().min(10).max(10000) }).safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: 'A meta semanal deve estar entre 10 e 10.000 pontos.' });
    return;
  }
  updateWeeklyGoal(request.userId!, parsed.data.weeklyGoal);
  const date = new Date().toISOString().slice(0, 10);
  response.json({ productivity: getProductivitySummary(request.userId!, date) });
});
