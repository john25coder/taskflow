CREATE TABLE task_checklist_items (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK(length(text) BETWEEN 1 AND 200),
  position INTEGER NOT NULL CHECK(position >= 0),
  completed_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(task_id, position)
);
