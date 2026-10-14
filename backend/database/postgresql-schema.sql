CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');
CREATE TYPE task_type AS ENUM ('general', 'study', 'meeting', 'work', 'habit');
CREATE TYPE task_difficulty AS ENUM ('low', 'medium', 'high');

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
  difficulty task_difficulty NOT NULL DEFAULT 'medium',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  habit_days SMALLINT[] NOT NULL DEFAULT '{}',
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_user_type ON tasks(user_id, type);
CREATE INDEX idx_tasks_user_difficulty ON tasks(user_id, difficulty);
CREATE INDEX idx_tasks_user_updated ON tasks(user_id, updated_at DESC);

CREATE TABLE task_checklist_items (
  id UUID PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  text VARCHAR(200) NOT NULL CHECK(char_length(text) BETWEEN 1 AND 200),
  position INTEGER NOT NULL CHECK(position >= 0),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, position)
);

CREATE TABLE habit_completions (
  id UUID PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, completion_date)
);

CREATE INDEX idx_habit_completions_task_date ON habit_completions(task_id, completion_date DESC);

CREATE TABLE productivity_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  weekly_goal INTEGER NOT NULL DEFAULT 100 CHECK(weekly_goal BETWEEN 10 AND 10000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE point_events (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  source_key TEXT NOT NULL,
  source_kind TEXT NOT NULL CHECK(source_kind IN ('task', 'habit')),
  task_type task_type NOT NULL,
  title_snapshot VARCHAR(120) NOT NULL,
  points INTEGER NOT NULL CHECK(points > 0),
  occurred_on DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, source_key)
);

CREATE INDEX idx_point_events_user_date ON point_events(user_id, occurred_on DESC);
CREATE INDEX idx_point_events_task ON point_events(task_id);
