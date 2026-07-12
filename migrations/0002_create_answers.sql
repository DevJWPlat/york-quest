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

export async function onRequestPatch({ request, env }) {
  try {
    const body = await request.json()

    const answerId = Number(body.answerId)
    const isCorrect = Boolean(body.isCorrect)
    const pointsAwarded = Number(body.pointsAwarded ?? 0)

    if (!answerId) {
      return json(
        { error: 'answerId is required.' },
        400,
      )
    }

    await env.DB
      .prepare(`
        UPDATE answers
        SET
          is_correct = ?,
          points_awarded = ?
        WHERE id = ?
      `)
      .bind(
        isCorrect ? 1 : 0,
        isCorrect ? pointsAwarded : 0,
        answerId,
      )
      .run()

    const updatedAnswer = await env.DB
      .prepare(`
        SELECT
          id,
          user_id AS userId,
          round_id AS roundId,
          question_id AS questionId,
          answer,
          is_correct AS isCorrect,
          points_awarded AS pointsAwarded,
          submitted_at AS submittedAt
        FROM answers
        WHERE id = ?
      `)
      .bind(answerId)
      .first()

    if (!updatedAnswer) {
      return json(
        { error: 'Answer not found.' },
        404,
      )
    }

    return json(updatedAnswer)
  } catch (error) {
    console.error('Failed to mark answer:', error)

    return json(
      { error: 'Unable to mark answer.' },
      500,
    )
  }
}