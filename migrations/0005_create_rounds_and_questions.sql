-- Migration number: 0005
-- Created: 2026-07-14

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS rounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  image_url TEXT,

  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
    CHECK (is_active IN (0, 1)),

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rounds_sort_order
ON rounds(sort_order);

CREATE INDEX IF NOT EXISTS idx_rounds_is_active
ON rounds(is_active);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  round_id INTEGER NOT NULL,

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

  points INTEGER NOT NULL DEFAULT 1
    CHECK (points >= 0),

  sort_order INTEGER NOT NULL DEFAULT 0,

  is_active INTEGER NOT NULL DEFAULT 1
    CHECK (is_active IN (0, 1)),

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (round_id)
    REFERENCES rounds(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_questions_round_id
ON questions(round_id);

CREATE INDEX IF NOT EXISTS idx_questions_round_sort_order
ON questions(round_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_questions_is_active
ON questions(is_active);