ALTER TABLE tasks ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'medium'
  CHECK(difficulty IN ('low', 'medium', 'high'));

CREATE INDEX idx_tasks_user_difficulty ON tasks(user_id, difficulty);
