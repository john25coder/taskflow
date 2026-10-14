import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { database, transaction } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { getChecklists, saveChecklist, type ChecklistItem } from '../services/checklist.js';
import {
  awardHabitPoints,
  awardTaskPoints,
  removeAllHabitPoints,
  removeHabitPoints,
  removeTaskPoints
} from '../services/productivity.js';

const statusSchema = z.enum(['todo', 'in_progress', 'done']);
const taskTypeSchema = z.enum(['general', 'study', 'meeting', 'work', 'habit']);
const difficultySchema = z.enum(['low', 'medium', 'high']);
const checklistSchema = z.array(z.object({
  id: z.uuid().optional(),
  text: z.string().trim().min(1).max(200)
})).max(50).refine((items) => {
  const ids = items.flatMap((item) => item.id ? [item.id] : []);
  return new Set(ids).size === ids.length;
}, 'Os itens do checklist não podem ter IDs repetidos.');
const httpUrlSchema = z.string().trim().url().refine((value) => {
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}, 'Use um link iniciado por http:// ou https://.');

const detailsSchema = z.object({
  subject: z.string().trim().max(100).default(''),
  usefulLinks: z.array(httpUrlSchema).max(10).default([]),
  reviewLinks: z.array(httpUrlSchema).max(10).default([]),
  participants: z.string().trim().max(300).default(''),
  meetingLink: z.union([httpUrlSchema, z.literal('')]).default(''),
  location: z.string().trim().max(200).default(''),
  project: z.string().trim().max(120).default(''),
  area: z.string().trim().max(120).default(''),
  plannedMinutes: z.number().int().min(0).max(1440).default(0),
  meetingTime: z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), z.literal('')]).default(''),
  agenda: z.string().trim().max(2000).default(''),
  notes: z.string().trim().max(4000).default(''),
  preferredTime: z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), z.literal('')]).default('')
});

const taskSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).default(''),
  status: statusSchema.default('todo'),
  type: taskTypeSchema.default('general'),
  difficulty: difficultySchema.default('medium'),
  details: detailsSchema.default(() => detailsSchema.parse({})),
  checklist: checklistSchema.default([]),
  habitDays: z.array(z.number().int().min(0).max(6)).max(7).default([])
    .transform((days) => [...new Set(days)].sort()),
  dueDate: z.union([z.iso.date(), z.literal(''), z.null()]).optional(),
  completionDate: z.iso.date().optional()
}).superRefine((task, context) => {
  if (task.type === 'habit' && task.habitDays.length === 0) {
    context.addIssue({ code: 'custom', path: ['habitDays'], message: 'Escolha ao menos um dia da semana.' });
  }
  if (task.type !== 'study' && task.checklist.length > 0) {
    context.addIssue({ code: 'custom', path: ['checklist'], message: 'Checklists estão disponíveis para tarefas de estudo.' });
  }
});

const updateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  status: statusSchema.optional(),
  type: taskTypeSchema.optional(),
  difficulty: difficultySchema.optional(),
  details: detailsSchema.optional(),
  checklist: checklistSchema.optional(),
  habitDays: z.array(z.number().int().min(0).max(6)).max(7)
    .transform((days) => [...new Set(days)].sort()).optional(),
  dueDate: z.union([z.iso.date(), z.literal(''), z.null()]).optional(),
  completionDate: z.iso.date().optional()
}).refine((value) => Object.keys(value).length > 0, 'Envie ao menos um campo.');

type TaskType = z.infer<typeof taskTypeSchema>;
type TaskDetails = z.infer<typeof detailsSchema>;
type TaskRow = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  type: TaskType;
  difficulty: 'low' | 'medium' | 'high';
  details_json: string;
  habit_days_json: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

const emptyDetails: TaskDetails = detailsSchema.parse({});

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function detailsFromRow(row: TaskRow): TaskDetails {
  const parsed = detailsSchema.safeParse(parseJson<unknown>(row.details_json, {}));
  return parsed.success ? parsed.data : emptyDetails;
}

function serializeTask(row: TaskRow, habitCompletedToday = false,
  checklist: ChecklistItem[] = getChecklists(row.user_id, row.id).get(row.id) ?? []) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    type: row.type,
    difficulty: row.difficulty,
    details: detailsFromRow(row),
    checklist,
    habitDays: parseJson<number[]>(row.habit_days_json, []),
    habitCompletedToday: row.type === 'habit' && habitCompletedToday,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function taskInputFromRow(row: TaskRow) {
  return {
    title: row.title,
    description: row.description,
    status: row.status,
    type: row.type,
    difficulty: row.difficulty,
    details: detailsFromRow(row),
    habitDays: parseJson<number[]>(row.habit_days_json, []),
    dueDate: row.due_date
  };
}

function getTask(id: string, userId: string) {
  return database.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, userId) as TaskRow | undefined;
}

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

tasksRouter.get('/', (request, response) => {
  const querySchema = z.object({
    status: z.union([statusSchema, z.literal('all')]).default('all'),
    type: z.union([taskTypeSchema, z.literal('all')]).default('all'),
    q: z.string().trim().max(120).default(''),
    date: z.iso.date().default(() => new Date().toISOString().slice(0, 10))
  });
  const parsed = querySchema.safeParse(request.query);
  if (!parsed.success) {
    response.status(400).json({ error: 'Filtros inválidos.' });
    return;
  }

  const conditions = ['user_id = ?'];
  const params: Array<string> = [request.userId!];
  if (parsed.data.status !== 'all') {
    conditions.push('status = ?');
    params.push(parsed.data.status);
  }
  if (parsed.data.type !== 'all') {
    conditions.push('type = ?');
    params.push(parsed.data.type);
  }
  if (parsed.data.q) {
    conditions.push('(title LIKE ? COLLATE NOCASE OR description LIKE ? COLLATE NOCASE)');
    const term = `%${parsed.data.q}%`;
    params.push(term, term);
  }

  const rows = database.prepare(`SELECT * FROM tasks WHERE ${conditions.join(' AND ')} ORDER BY updated_at DESC`)
    .all(...params) as unknown as TaskRow[];
  const completedRows = database.prepare(`SELECT task_id FROM habit_completions
    WHERE completion_date = ? AND task_id IN (SELECT id FROM tasks WHERE user_id = ?)`)
    .all(parsed.data.date, request.userId!) as unknown as Array<{ task_id: string }>;
  const completedIds = new Set(completedRows.map((row) => row.task_id));
  const checklists = getChecklists(request.userId!);

  response.json({ tasks: rows.map((row) => serializeTask(row, completedIds.has(row.id), checklists.get(row.id) ?? [])) });
});

tasksRouter.post('/', (request, response) => {
  const parsed = taskSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: 'Dados da tarefa inválidos.', details: parsed.error.flatten().fieldErrors });
    return;
  }

  if (parsed.data.checklist.some((item) => item.id) ||
    (parsed.data.status === 'done' && parsed.data.checklist.length > 0)) {
    response.status(400).json({ error: 'Crie o checklist com itens novos e conclua os itens antes de finalizar a tarefa.' });
    return;
  }

  const now = new Date().toISOString();
  const task = {
    id: randomUUID(),
    userId: request.userId!,
    ...parsed.data,
    status: parsed.data.type === 'habit' ? 'in_progress' as const : parsed.data.status,
    habitDays: parsed.data.type === 'habit' ? parsed.data.habitDays : [],
    dueDate: parsed.data.type === 'habit' ? null : (parsed.data.dueDate || null),
    createdAt: now,
    updatedAt: now
  };
  transaction(() => {
    database.prepare(`INSERT INTO tasks
      (id, user_id, title, description, status, type, difficulty, details_json, habit_days_json, due_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(task.id, task.userId, task.title, task.description, task.status, task.type, task.difficulty,
        JSON.stringify(task.details), JSON.stringify(task.habitDays), task.dueDate, task.createdAt, task.updatedAt);
    saveChecklist(task.id, task.checklist, [], now);

    if (task.type !== 'habit' && task.status === 'done') {
      awardTaskPoints({
        userId: request.userId!, taskId: task.id, title: task.title, taskType: task.type,
        occurredOn: parsed.data.completionDate ?? new Date().toISOString().slice(0, 10)
      });
    }
  });
  response.status(201).json({ task: serializeTask(getTask(task.id, request.userId!)!) });
});

tasksRouter.patch('/:id', (request, response) => {
  const parsed = updateSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: 'Dados da tarefa inválidos.', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const current = getTask(request.params.id, request.userId!);
  if (!current) {
    response.status(404).json({ error: 'Tarefa não encontrada.' });
    return;
  }

  const currentChecklist = getChecklists(request.userId!, current.id).get(current.id) ?? [];
  const nextType = parsed.data.type ?? current.type;
  const validated = taskSchema.safeParse({
    ...taskInputFromRow(current), ...parsed.data,
    checklist: parsed.data.checklist ?? (nextType === 'study' ? currentChecklist : [])
  });
  if (!validated.success) {
    response.status(400).json({ error: 'Dados da tarefa inválidos.', details: validated.error.flatten().fieldErrors });
    return;
  }

  const existingItems = new Map(currentChecklist.map((item) => [item.id, item]));
  if (validated.data.checklist.some((item) => item.id && !existingItems.has(item.id))) {
    response.status(400).json({ error: 'O checklist contém um item que não pertence a esta tarefa.' });
    return;
  }
  if (validated.data.status === 'done' && validated.data.checklist.some((item) =>
    !item.id || !existingItems.get(item.id)?.completedAt)) {
    response.status(400).json({ error: 'Conclua todos os itens do checklist antes de finalizar a tarefa.' });
    return;
  }

  const updated = {
    ...validated.data,
    status: validated.data.type === 'habit' ? 'in_progress' as const : validated.data.status,
    habitDays: validated.data.type === 'habit' ? validated.data.habitDays : [],
    dueDate: validated.data.type === 'habit' ? null : (validated.data.dueDate || null),
    updatedAt: new Date().toISOString()
  };
  transaction(() => {
    database.prepare(`UPDATE tasks SET title = ?, description = ?, status = ?, type = ?, difficulty = ?, details_json = ?,
      habit_days_json = ?, due_date = ?, updated_at = ? WHERE id = ? AND user_id = ?`)
      .run(updated.title, updated.description, updated.status, updated.type, updated.difficulty, JSON.stringify(updated.details),
        JSON.stringify(updated.habitDays), updated.dueDate, updated.updatedAt, request.params.id, request.userId!);
    if (parsed.data.checklist !== undefined || updated.type !== 'study') {
      saveChecklist(current.id, updated.checklist, currentChecklist, updated.updatedAt);
    }

    if (updated.type !== 'habit') {
      database.prepare('DELETE FROM habit_completions WHERE task_id = ?').run(request.params.id);
      removeAllHabitPoints(request.userId!, request.params.id);
    }

    if (updated.type !== 'habit' && updated.status === 'done') {
      awardTaskPoints({
        userId: request.userId!, taskId: request.params.id, title: updated.title, taskType: updated.type,
        occurredOn: parsed.data.completionDate ?? new Date().toISOString().slice(0, 10)
      });
    } else {
      removeTaskPoints(request.userId!, request.params.id);
    }
  });

  response.json({ task: serializeTask(getTask(request.params.id, request.userId!)!) });
});

tasksRouter.patch('/:id/checklist/:itemId', (request, response) => {
  const parsed = z.object({ completed: z.boolean() }).strict().safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: 'Informe se o item está concluído.' });
    return;
  }

  const task = getTask(request.params.id, request.userId!);
  const items = task?.type === 'study' ? getChecklists(request.userId!, task.id).get(task.id) ?? [] : [];
  const item = items.find((entry) => entry.id === request.params.itemId);
  if (!task || !item) {
    response.status(404).json({ error: 'Item do checklist não encontrado.' });
    return;
  }
  if (task.status === 'done') {
    response.status(409).json({ error: 'Reabra a tarefa antes de alterar o checklist.' });
    return;
  }

  if (Boolean(item.completedAt) !== parsed.data.completed) {
    const now = new Date().toISOString();
    transaction(() => {
      database.prepare('UPDATE task_checklist_items SET completed_at = ? WHERE id = ? AND task_id = ?')
        .run(parsed.data.completed ? now : null, item.id, task.id);
      database.prepare('UPDATE tasks SET updated_at = ? WHERE id = ?').run(now, task.id);
    });
  }
  response.json({ task: serializeTask(getTask(task.id, request.userId!)!) });
});

tasksRouter.post('/:id/habit-completions', (request, response) => {
  const parsed = z.object({ date: z.iso.date() }).safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: 'Data da conclusão inválida.' });
    return;
  }

  const task = getTask(request.params.id, request.userId!);
  if (!task || task.type !== 'habit') {
    response.status(404).json({ error: 'Hábito não encontrado.' });
    return;
  }

  const days = parseJson<number[]>(task.habit_days_json, []);
  const weekDay = new Date(`${parsed.data.date}T00:00:00Z`).getUTCDay();
  if (!days.includes(weekDay)) {
    response.status(400).json({ error: 'Este hábito não está programado para o dia escolhido.' });
    return;
  }

  const now = new Date().toISOString();
  database.prepare(`INSERT OR IGNORE INTO habit_completions (id, task_id, completion_date, created_at)
    VALUES (?, ?, ?, ?)`)
    .run(randomUUID(), task.id, parsed.data.date, now);
  database.prepare('UPDATE tasks SET updated_at = ? WHERE id = ?').run(now, task.id);
  awardHabitPoints({
    userId: request.userId!, taskId: task.id, title: task.title, occurredOn: parsed.data.date
  });
  response.json({ task: serializeTask(getTask(task.id, request.userId!)!, true) });
});

tasksRouter.delete('/:id/habit-completions/:date', (request, response) => {
  const parsedDate = z.iso.date().safeParse(request.params.date);
  if (!parsedDate.success) {
    response.status(400).json({ error: 'Data da conclusão inválida.' });
    return;
  }

  const task = getTask(request.params.id, request.userId!);
  if (!task || task.type !== 'habit') {
    response.status(404).json({ error: 'Hábito não encontrado.' });
    return;
  }

  database.prepare('DELETE FROM habit_completions WHERE task_id = ? AND completion_date = ?')
    .run(task.id, parsedDate.data);
  removeHabitPoints(request.userId!, task.id, parsedDate.data);
  database.prepare('UPDATE tasks SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), task.id);
  response.json({ task: serializeTask(getTask(task.id, request.userId!)!, false) });
});

tasksRouter.delete('/:id', (request, response) => {
  const result = database.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(request.params.id, request.userId!);
  if (result.changes === 0) {
    response.status(404).json({ error: 'Tarefa não encontrada.' });
    return;
  }
  response.status(204).send();
});
