import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { env } from '../config/env.js';

const cookieName = 'taskflow_session';

export function createToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: '7d' });
}

export function readToken(token: string): string {
  const payload = jwt.verify(token, env.JWT_SECRET);
  if (typeof payload === 'string' || typeof payload.sub !== 'string') {
    throw new Error('Token inválido');
  }
  return payload.sub;
}

export function setSessionCookie(response: Response, token: string): void {
  response.cookie(cookieName, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });
}

export function clearSessionCookie(response: Response): void {
  response.clearCookie(cookieName, { path: '/' });
}

export { cookieName };
