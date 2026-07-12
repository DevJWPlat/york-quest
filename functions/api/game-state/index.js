function jsonResponse(data, status = 200) {
    return Response.json(data, {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  }
  
  export async function onRequestGet(context) {
    try {
      const state = await context.env.DB
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
  
      if (!state) {
        return jsonResponse(
          { error: 'Game state was not found.' },
          404,
        )
      }
  
      return jsonResponse(state)
    } catch (error) {
      console.error('Failed to load game state:', error)
  
      return jsonResponse(
        { error: 'Unable to load the game state.' },
        500,
      )
    }
  }
  
  export async function onRequestPut(context) {
    try {
      const body = await context.request.json()
  
      const allowedStatuses = [
        'waiting',
        'roundIntro',
        'question',
        'submitted',
        'roundComplete',
        'questComplete',
      ]
  
      if (!allowedStatuses.includes(body.status)) {
        return jsonResponse(
          { error: 'Invalid game status.' },
          400,
        )
      }
  
      const activeRoundId = body.activeRoundId ?? null
      const activeQuestionId = body.activeQuestionId ?? null
  
      await context.env.DB
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
          activeRoundId,
          activeQuestionId,
        )
        .run()
  
      const updatedState = await context.env.DB
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
  
      return jsonResponse(updatedState)
    } catch (error) {
      console.error('Failed to update game state:', error)
  
      return jsonResponse(
        { error: 'Unable to update the game state.' },
        500,
      )
    }
  }