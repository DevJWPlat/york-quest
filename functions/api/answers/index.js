function json(data, status = 200) {
    return Response.json(data, {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  }
  
  export async function onRequestGet({ request, env }) {
    try {
      const url = new URL(request.url)
  
      const questionId = url.searchParams.get('questionId')
      const roundId = url.searchParams.get('roundId')
      const userId = url.searchParams.get('userId')
  
      const conditions = []
      const values = []
  
      if (questionId) {
        conditions.push('question_id = ?')
        values.push(Number(questionId))
      }
  
      if (roundId) {
        conditions.push('round_id = ?')
        values.push(Number(roundId))
      }
  
      if (userId) {
        conditions.push('user_id = ?')
        values.push(Number(userId))
      }
  
      const whereClause = conditions.length
        ? `WHERE ${conditions.join(' AND ')}`
        : ''
  
      const statement = env.DB.prepare(`
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
        ${whereClause}
        ORDER BY submitted_at ASC
      `)
  
      const result = values.length
        ? await statement.bind(...values).all()
        : await statement.all()
  
      return json(result.results)
    } catch (error) {
      console.error('Failed to load answers:', error)
  
      return json(
        { error: 'Unable to load answers.' },
        500,
      )
    }
  }

  export async function onRequestPost({ request, env }) {
    try {
      const body = await request.json()
  
      const userId = Number(body.userId)
      const roundId = Number(body.roundId)
      const questionId = Number(body.questionId)
      const answer = String(body.answer ?? '').trim()
  
      if (!userId || !roundId || !questionId || !answer) {
        return json(
          {
            error: 'userId, roundId, questionId and answer are required.',
          },
          400,
        )
      }
  
      const existingAnswer = await env.DB
        .prepare(`
          SELECT id
          FROM answers
          WHERE user_id = ?
            AND question_id = ?
        `)
        .bind(userId, questionId)
        .first()
  
      if (existingAnswer) {
        return json(
          { error: 'You have already answered this question.' },
          409,
        )
      }
  
      const result = await env.DB
        .prepare(`
          INSERT INTO answers (
            user_id,
            round_id,
            question_id,
            answer
          )
          VALUES (?, ?, ?, ?)
        `)
        .bind(
          userId,
          roundId,
          questionId,
          answer,
        )
        .run()
  
      const createdAnswer = await env.DB
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
        .bind(result.meta.last_row_id)
        .first()
  
      return json(createdAnswer, 201)
    } catch (error) {
      console.error('Failed to submit answer:', error)
  
      return json(
        { error: 'Unable to submit answer.' },
        500,
      )
    }
  }
  
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

    