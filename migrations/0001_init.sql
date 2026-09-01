CREATE TABLE problems (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('long', 'code')),
  source TEXT NOT NULL,
  display_text TEXT NOT NULL,
  typing_text TEXT NOT NULL,
  segments TEXT
);

CREATE TABLE results (
  id TEXT PRIMARY KEY,
  anon_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('long', 'code')),
  duration INTEGER NOT NULL CHECK (duration IN (180, 300)),
  score INTEGER NOT NULL,
  max_combo INTEGER NOT NULL,
  perfect_count INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  miss_count INTEGER NOT NULL,
  name TEXT,
  registered_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_results_ranking
  ON results (mode, duration, registered_at, score);
