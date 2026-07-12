CREATE TABLE IF NOT EXISTS game_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  status TEXT NOT NULL DEFAULT 'waiting',
  active_round_id INTEGER,
  active_question_id INTEGER,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO game_state (
  id,
  status,
  active_round_id,
  active_question_id
)
VALUES (
  1,
  'waiting',
  NULL,
  NULL
);