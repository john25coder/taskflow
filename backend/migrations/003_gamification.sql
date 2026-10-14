CREATE TABLE productivity_settings (
  user_id TEXT PRIMARY KEY,
  weekly_goal INTEGER NOT NULL DEFAULT 100 CHECK(weekly_goal BETWEEN 10 AND 10000),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE point_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  task_id TEXT,
  source_key TEXT NOT NULL,
  source_kind TEXT NOT NULL CHECK(source_kind IN ('task', 'habit')),
  task_type TEXT NOT NULL,
  title_snapshot TEXT NOT NULL,
  points INTEGER NOT NULL CHECK(points > 0),
  occurred_on TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
  UNIQUE(user_id, source_key)
);

CREATE INDEX idx_point_events_user_date ON point_events(user_id, occurred_on DESC);
CREATE INDEX idx_point_events_task ON point_events(task_id);
