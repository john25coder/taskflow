import { randomUUID } from 'node:crypto';
import { database } from '../db/database.js';

export type ScoredTaskType = 'general' | 'study' | 'meeting' | 'work' | 'habit';

const pointsByType: Record<ScoredTaskType, number> = {
  general: 10,
  study: 15,
  meeting: 10,
  work: 10,
  habit: 5
};

type PointEventRow = {
  id: string;
  source_kind: 'task' | 'habit';
  task_type: ScoredTaskType;
  title_snapshot: string;
  points: number;
  occurred_on: string;
};

type ProductivityMessage = {
  code: 'goal_reached' | 'goal_close' | 'study_momentum' | 'streak' | 'low_difficulty_suggestion' | 'first_step';
  tone: 'success' | 'progress' | 'focus' | 'encouragement';
  title: string;
  body: string;
  taskId?: string;
};

function addDays(value: string, amount: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function startOfWeek(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  return addDays(value, -daysSinceMonday);
}

function ensureSettings(userId: string) {
  const now = new Date().toISOString();
  database.prepare(`INSERT OR IGNORE INTO productivity_settings
    (user_id, weekly_goal, created_at, updated_at) VALUES (?, 100, ?, ?)`)
    .run(userId, now, now);
}

export function awardTaskPoints(input: {
  userId: string;
  taskId: string;
  title: string;
  taskType: Exclude<ScoredTaskType, 'habit'>;
  occurredOn: string;
}) {
  const now = new Date().toISOString();
  database.prepare(`INSERT INTO point_events
    (id, user_id, task_id, source_key, source_kind, task_type, title_snapshot, points, occurred_on, created_at)
    VALUES (?, ?, ?, ?, 'task', ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, source_key) DO UPDATE SET
      task_id = excluded.task_id,
      task_type = excluded.task_type,
      title_snapshot = excluded.title_snapshot,
      points = excluded.points`)
    .run(randomUUID(), input.userId, input.taskId, `task:${input.taskId}`, input.taskType,
      input.title, pointsByType[input.taskType], input.occurredOn, now);
}

export function removeTaskPoints(userId: string, taskId: string) {
  database.prepare('DELETE FROM point_events WHERE user_id = ? AND source_key = ?')
    .run(userId, `task:${taskId}`);
}

export function awardHabitPoints(input: {
  userId: string;
  taskId: string;
  title: string;
  occurredOn: string;
}) {
  database.prepare(`INSERT OR IGNORE INTO point_events
    (id, user_id, task_id, source_key, source_kind, task_type, title_snapshot, points, occurred_on, created_at)
    VALUES (?, ?, ?, ?, 'habit', 'habit', ?, ?, ?, ?)`)
    .run(randomUUID(), input.userId, input.taskId, `habit:${input.taskId}:${input.occurredOn}`,
      input.title, pointsByType.habit, input.occurredOn, new Date().toISOString());
}

export function removeHabitPoints(userId: string, taskId: string, occurredOn: string) {
  database.prepare('DELETE FROM point_events WHERE user_id = ? AND source_key = ?')
    .run(userId, `habit:${taskId}:${occurredOn}`);
}

export function removeAllHabitPoints(userId: string, taskId: string) {
  database.prepare(`DELETE FROM point_events
    WHERE user_id = ? AND task_id = ? AND source_kind = 'habit'`)
    .run(userId, taskId);
}

export function updateWeeklyGoal(userId: string, weeklyGoal: number) {
  ensureSettings(userId);
  database.prepare('UPDATE productivity_settings SET weekly_goal = ?, updated_at = ? WHERE user_id = ?')
    .run(weeklyGoal, new Date().toISOString(), userId);
}

export function getProductivitySummary(userId: string, date: string) {
  ensureSettings(userId);
  const settings = database.prepare('SELECT weekly_goal FROM productivity_settings WHERE user_id = ?')
    .get(userId) as { weekly_goal: number };
  const total = database.prepare('SELECT COALESCE(SUM(points), 0) AS points FROM point_events WHERE user_id = ?')
    .get(userId) as { points: number };
  const weekStart = startOfWeek(date);
  const weekEnd = addDays(weekStart, 6);
  const week = database.prepare(`SELECT COALESCE(SUM(points), 0) AS points FROM point_events
    WHERE user_id = ? AND occurred_on BETWEEN ? AND ?`)
    .get(userId, weekStart, weekEnd) as { points: number };
  const activeDates = database.prepare(`SELECT DISTINCT occurred_on FROM point_events
    WHERE user_id = ? AND occurred_on <= ? ORDER BY occurred_on DESC`)
    .all(userId, date) as unknown as Array<{ occurred_on: string }>;
  const dateSet = new Set(activeDates.map((row) => row.occurred_on));
  let cursor = dateSet.has(date) ? date : addDays(date, -1);
  let currentStreak = 0;
  while (dateSet.has(cursor)) {
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }
  const recentRows = database.prepare(`SELECT id, source_kind, task_type, title_snapshot, points, occurred_on
    FROM point_events WHERE user_id = ? ORDER BY occurred_on DESC, created_at DESC LIMIT 5`)
    .all(userId) as unknown as PointEventRow[];
  const studyCompletions = database.prepare(`SELECT COUNT(*) AS count FROM point_events
    WHERE user_id = ? AND source_kind = 'task' AND task_type = 'study' AND occurred_on BETWEEN ? AND ?`)
    .get(userId, weekStart, weekEnd) as { count: number };
  const easyTask = database.prepare(`SELECT id, title FROM tasks
    WHERE user_id = ? AND difficulty = 'low' AND status != 'done' AND type != 'habit'
    ORDER BY CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date ASC, updated_at DESC LIMIT 1`)
    .get(userId) as { id: string; title: string } | undefined;
  const level = Math.floor(total.points / 100) + 1;
  const messages: ProductivityMessage[] = [];
  const remainingPoints = Math.max(0, settings.weekly_goal - week.points);

  if (week.points >= settings.weekly_goal) {
    messages.push({
      code: 'goal_reached', tone: 'success', title: 'Meta da semana alcançada',
      body: `Você já somou ${week.points} pontos nesta semana. Excelente ritmo!`
    });
  } else if (remainingPoints <= 15) {
    messages.push({
      code: 'goal_close', tone: 'progress', title: 'Sua meta está bem perto',
      body: `Faltam apenas ${remainingPoints} pontos para atingir sua meta semanal.`
    });
  }

  if (studyCompletions.count >= 3) {
    messages.push({
      code: 'study_momentum', tone: 'success', title: 'Bom ritmo de estudos',
      body: `Você concluiu ${studyCompletions.count} tarefas de estudo nesta semana.`
    });
  }

  if (currentStreak >= 3) {
    messages.push({
      code: 'streak', tone: 'progress', title: 'Sequência em andamento',
      body: `${currentStreak} dias produtivos em sequência. Continue assim!`
    });
  }

  if (easyTask) {
    messages.push({
      code: 'low_difficulty_suggestion', tone: 'focus', title: 'Um próximo passo leve',
      body: `Que tal começar por “${easyTask.title}”? Ela está marcada como baixa dificuldade.`,
      taskId: easyTask.id
    });
  }

  if (messages.length === 0) {
    messages.push({
      code: 'first_step', tone: 'encouragement', title: 'Comece pelo próximo passo',
      body: 'Cada tarefa concluída aproxima você da meta da semana.'
    });
  }

  return {
    totalPoints: total.points,
    weeklyPoints: week.points,
    weeklyGoal: settings.weekly_goal,
    weeklyProgress: Math.min(100, Math.round((week.points / settings.weekly_goal) * 100)),
    level,
    levelProgress: total.points % 100,
    nextLevelAt: level * 100,
    currentStreak,
    weekStart,
    weekEnd,
    messages: messages.slice(0, 3),
    recentEvents: recentRows.map((row) => ({
      id: row.id,
      sourceKind: row.source_kind,
      taskType: row.task_type,
      title: row.title_snapshot,
      points: row.points,
      occurredOn: row.occurred_on
    }))
  };
}
