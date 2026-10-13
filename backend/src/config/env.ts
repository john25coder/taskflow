import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3333),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_PATH: z.string().min(1).default('./data/taskflow.db'),
  JWT_SECRET: z.string().min(32).default('development-only-secret-change-this-now'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development')
});

export const env = schema.parse(process.env);
