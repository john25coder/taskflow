CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');
CREATE TYPE task_type AS ENUM ('general', 'study', 'meeting', 'work', 'habit');

CREATE TABLE users (
  id UUID PRIMARY KEY,
  name VARCHAR(80) NOT NULL CHECK(char_length(name) BETWEEN 2 AND 80),
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL,
  description VARCHAR(1000) NOT NULL DEFAULT '',
  status task_status NOT NULL DEFAULT 'todo',
  type task_type NOT NULL DEFAULT 'general',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  habit_days SMALLINT[] NOT NULL DEFAULT '{}',
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_user_type ON tasks(user_id, type);
CREATE INDEX idx_tasks_user_updated ON tasks(user_id, updated_at DESC);

CREATE TABLE habit_completions (
  id UUID PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, completion_date)
);

CREATE INDEX idx_habit_completions_task_date ON habit_completions(task_id, completion_date DESC);
