import { randomUUID } from 'node:crypto';
import { database } from '../db/database.js';

export type ChecklistItem = {
  id: string;
  text: string;
  completedAt: string | null;
  createdAt: string;
};

export type ChecklistInput = { id?: string; text: string };

export function getChecklists(userId: string, taskId?: string): Map<string, ChecklistItem[]> {
  const rows = database.prepare(`SELECT item.id, item.task_id, item.text, item.completed_at, item.created_at
    FROM task_checklist_items item JOIN tasks task ON task.id = item.task_id
    WHERE task.user_id = ? ${taskId ? 'AND task.id = ?' : ''}
    ORDER BY item.position`)
    .all(...(taskId ? [userId, taskId] : [userId])) as unknown as Array<{
      id: string; task_id: string; text: string; completed_at: string | null; created_at: string;
    }>;
  const checklists = new Map<string, ChecklistItem[]>();
  for (const row of rows) {
    const items = checklists.get(row.task_id) ?? [];
    items.push({ id: row.id, text: row.text, completedAt: row.completed_at, createdAt: row.created_at });
    checklists.set(row.task_id, items);
  }
  return checklists;
}

// Called inside the task transaction: edits preserve IDs and completion dates.
export function saveChecklist(taskId: string, input: ChecklistInput[], current: ChecklistItem[], now: string) {
  const existing = new Map(current.map((item) => [item.id, item]));
  database.prepare('DELETE FROM task_checklist_items WHERE task_id = ?').run(taskId);
  const insert = database.prepare(`INSERT INTO task_checklist_items
    (id, task_id, text, position, completed_at, created_at) VALUES (?, ?, ?, ?, ?, ?)`);
  input.forEach((item, position) => {
    insert.run(item.id ?? randomUUID(), taskId, item.text, position,
      item.id ? existing.get(item.id)?.completedAt ?? null : null,
      item.id ? existing.get(item.id)?.createdAt ?? now : now);
  });
}
