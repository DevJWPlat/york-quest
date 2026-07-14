-- Migration number: 0006
-- Created: 2026-07-14
--
-- Tie-breakers are deliberately stored separately from
-- normal questions and answers.
--
-- They decide the official round winner but award no
-- leaderboard points.

PRAGMA foreign_keys = ON;


-- One optional tie-breaker question per round.
CREATE TABLE IF NOT EXISTS tie_breaker_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  round_id INTEGER NOT NULL UNIQUE,

  question_text TEXT NOT NULL,

  question_type TEXT NOT NULL DEFAULT 'text'
    CHECK (
      question_type IN (
        'text',
        'long_text',
        'number',
        'multiple_choice',
        'image'
      )
    ),

  correct_answer TEXT,

  options TEXT NOT NULL DEFAULT '[]',

  image_url TEXT,

  is_active INTEGER NOT NULL DEFAULT 1
    CHECK (is_active IN (0, 1)),

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (round_id)
    REFERENCES rounds(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tie_breaker_questions_round_id
ON tie_breaker_questions(round_id);

CREATE INDEX IF NOT EXISTS idx_tie_breaker_questions_is_active
ON tie_breaker_questions(is_active);


-- Each time Elise starts a tie-breaker, a session is created.
--
-- Keeping sessions separate allows the selected players,
-- submissions and official winner to survive refreshes.
CREATE TABLE IF NOT EXISTS tie_breaker_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  round_id INTEGER NOT NULL,
  tie_breaker_question_id INTEGER NOT NULL,

  status TEXT NOT NULL DEFAULT 'active'
    CHECK (
      status IN (
        'active',
        'complete',
        'cancelled'
      )
    ),

  winner_user_id INTEGER,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (round_id)
    REFERENCES rounds(id)
    ON DELETE CASCADE,

  FOREIGN KEY (tie_breaker_question_id)
    REFERENCES tie_breaker_questions(id)
    ON DELETE CASCADE,

  FOREIGN KEY (winner_user_id)
    REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tie_breaker_sessions_round_id
ON tie_breaker_sessions(round_id);

CREATE INDEX IF NOT EXISTS idx_tie_breaker_sessions_status
ON tie_breaker_sessions(status);

CREATE INDEX IF NOT EXISTS idx_tie_breaker_sessions_winner
ON tie_breaker_sessions(winner_user_id);


-- The players chosen by Elise for a particular tie-breaker.
--
-- Players not in this table remain on the waiting screen.
-- Their answers never enter the normal answers table.
CREATE TABLE IF NOT EXISTS tie_breaker_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  session_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,

  answer TEXT,
  submitted_at TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(session_id, user_id),

  FOREIGN KEY (session_id)
    REFERENCES tie_breaker_sessions(id)
    ON DELETE CASCADE,

  FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tie_breaker_participants_session
ON tie_breaker_participants(session_id);

CREATE INDEX IF NOT EXISTS idx_tie_breaker_participants_user
ON tie_breaker_participants(user_id);


-- The shared game state needs to know which tie-breaker
-- session is currently active.
ALTER TABLE game_state
ADD COLUMN active_tie_breaker_session_id INTEGER;