function json(data, status = 200) {
    return Response.json(data, {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  }
  
  export async function onRequestPost({ env }) {
    try {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM answers'),
  
        env.DB.prepare(`
          UPDATE game_state
          SET
            status = 'waiting',
            active_round_id = NULL,
            active_question_id = NULL,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = 1
        `),
      ])
  
      return json({
        success: true,
        message: 'Live game reset successfully.',
      })
    } catch (error) {
      console.error('Failed to reset live game:', error)
  
      return json(
        {
          success: false,
          error: 'Unable to reset the live game.',
        },
        500,
      )
    }
}