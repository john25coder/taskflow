import type { NextFunction, Request, Response } from 'express';
import { cookieName, readToken } from '../utils/token.js';

export function requireAuth(request: Request, response: Response, next: NextFunction): void {
  const token = request.cookies?.[cookieName];
  if (!token) {
    response.status(401).json({ error: 'Autenticação necessária.' });
    return;
  }

  try {
    request.userId = readToken(token);
    next();
  } catch {
    response.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }
}
