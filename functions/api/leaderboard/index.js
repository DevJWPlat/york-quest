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
      const result = await env.DB
        .prepare(`
          SELECT
            user_id AS userId,
            SUM(points_awarded) AS totalPoints,
            COUNT(*) AS answered,
            SUM(
              CASE
                WHEN is_correct = 1 THEN 1
                ELSE 0
              END
            ) AS correctAnswers
          FROM answers
          GROUP BY user_id
          ORDER BY totalPoints DESC, correctAnswers DESC
        `)
        .all()
  
      return json(result.results || [])
    } catch (error) {
      console.error('Failed to load leaderboard:', error)
  
      return json(
        { error: 'Unable to load leaderboard.' },
        500,
      )
    }
}