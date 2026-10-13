import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { database } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { clearSessionCookie, createToken, setSessionCookie } from '../utils/token.js';

type UserRow = { id: string; name: string; email: string; password_hash: string };

const credentialsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos.' }
});

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(72).regex(/[A-Za-z]/, 'Inclua uma letra.').regex(/\d/, 'Inclua um número.')
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(72)
});

export const authRouter = Router();

authRouter.post('/register', credentialsLimiter, async (request, response) => {
  const parsed = registerSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: 'Dados inválidos.', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const exists = database.prepare('SELECT id FROM users WHERE email = ?').get(parsed.data.email);
  if (exists) {
    response.status(409).json({ error: 'Já existe uma conta com este e-mail.' });
    return;
  }

  const user = { id: randomUUID(), name: parsed.data.name, email: parsed.data.email };
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  database.prepare('INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(user.id, user.name, user.email, passwordHash, new Date().toISOString());

  setSessionCookie(response, createToken(user.id));
  response.status(201).json({ user });
});

authRouter.post('/login', credentialsLimiter, async (request, response) => {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: 'E-mail ou senha inválidos.' });
    return;
  }

  const user = database.prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?')
    .get(parsed.data.email) as UserRow | undefined;
  const validPassword = user ? await bcrypt.compare(parsed.data.password, user.password_hash) : false;

  if (!user || !validPassword) {
    response.status(401).json({ error: 'E-mail ou senha inválidos.' });
    return;
  }

  setSessionCookie(response, createToken(user.id));
  response.json({ user: { id: user.id, name: user.name, email: user.email } });
});

authRouter.post('/logout', (_request, response) => {
  clearSessionCookie(response);
  response.status(204).send();
});

authRouter.get('/me', requireAuth, (request, response) => {
  const user = database.prepare('SELECT id, name, email FROM users WHERE id = ?').get(request.userId!);
  if (!user) {
    clearSessionCookie(response);
    response.status(401).json({ error: 'Usuário não encontrado.' });
    return;
  }
  response.json({ user });
});
