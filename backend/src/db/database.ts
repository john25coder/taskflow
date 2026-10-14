import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const databasePath = env.DATABASE_PATH === ':memory:' ? ':memory:' : resolve(process.cwd(), env.DATABASE_PATH);

if (databasePath !== ':memory:') {
  mkdirSync(dirname(databasePath), { recursive: true });
}

export const database = new DatabaseSync(databasePath);
database.exec('PRAGMA foreign_keys = ON;');
database.exec('PRAGMA journal_mode = WAL;');

database.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);`);

for (const migrationId of [
  '001_initial',
  '002_task_types_and_habits',
  '003_gamification',
  '004_task_difficulty',
  '005_study_checklists'
]) {
  const applied = database.prepare('SELECT id FROM schema_migrations WHERE id = ?').get(migrationId);
  if (applied) continue;

  const migrationPath = resolve(currentDirectory, `../../migrations/${migrationId}.sql`);
  database.exec('BEGIN;');
  try {
    database.exec(readFileSync(migrationPath, 'utf8'));
    database.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)')
      .run(migrationId, new Date().toISOString());
    database.exec('COMMIT;');
  } catch (error) {
    database.exec('ROLLBACK;');
    throw error;
  }
}

export function transaction<T>(action: () => T): T {
  database.exec('BEGIN;');
  try {
    const result = action();
    database.exec('COMMIT;');
    return result;
  } catch (error) {
    database.exec('ROLLBACK;');
    throw error;
  }
}
