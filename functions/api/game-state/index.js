function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

export async function onRequestGet({ env }) {
  try {
    const state = await env.DB
      .prepare(`
        SELECT
          id,
          status,
          active_round_id AS activeRoundId,
          active_question_id AS activeQuestionId,
          updated_at AS updatedAt
        FROM game_state
        WHERE id = 1
      `)
      .first()

    return state
      ? json(state)
      : json(
          { error: 'Game state not found.' },
          404,
        )
  } catch (error) {
    console.error(
      'Failed to load game state:',
      error,
    )

    return json(
      { error: 'Unable to load game state.' },
      500,
    )
  }
}

export async function onRequestPut({
  request,
  env,
}) {
  try {
    const body = await request.json()

    const allowedStatuses = [
      'waiting',
      'roundIntro',
      'question',
      'submitted',
      'roundComplete',
      'leaderboard',
      'questComplete',
      'finalLeaderboard',
      'finalResults',
    ]

    if (
      !allowedStatuses.includes(body.status)
    ) {
      return json(
        { error: 'Invalid status.' },
        400,
      )
    }

    await env.DB
      .prepare(`
        UPDATE game_state
        SET
          status = ?,
          active_round_id = ?,
          active_question_id = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `)
      .bind(
        body.status,
        body.activeRoundId ?? null,
        body.activeQuestionId ?? null,
      )
      .run()

    const updatedState = await env.DB
      .prepare(`
        SELECT
          id,
          status,
          active_round_id AS activeRoundId,
          active_question_id AS activeQuestionId,
          updated_at AS updatedAt
        FROM game_state
        WHERE id = 1
      `)
      .first()

    return json(updatedState)
  } catch (error) {
    console.error(
      'Failed to update game state:',
      error,
    )

    return json(
      {
        error:
          'Unable to update game state.',
      },
      500,
    )
  }
}