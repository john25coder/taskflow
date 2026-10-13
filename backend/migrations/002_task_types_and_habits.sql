ALTER TABLE tasks ADD COLUMN type TEXT NOT NULL DEFAULT 'general';
ALTER TABLE tasks ADD COLUMN details_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN habit_days_json TEXT NOT NULL DEFAULT '[]';

CREATE TABLE habit_completions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  completion_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  UNIQUE(task_id, completion_date)
);

CREATE INDEX idx_tasks_user_type ON tasks(user_id, type);
CREATE INDEX idx_habit_completions_task_date ON habit_completions(task_id, completion_date DESC);
