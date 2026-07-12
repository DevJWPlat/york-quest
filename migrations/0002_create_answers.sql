-- Migration number: 0002 	 2026-07-12T17:03:31.958Z
CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  round_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  answer TEXT NOT NULL,
  is_correct INTEGER,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_answers_question_id
ON answers(question_id);

CREATE INDEX IF NOT EXISTS idx_answers_user_id
ON answers(user_id);

CREATE INDEX IF NOT EXISTS idx_answers_round_id
ON answers(round_id);