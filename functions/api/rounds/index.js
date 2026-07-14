function json(data, status = 200) {
    return Response.json(data, {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  }
  
  function formatRound(round) {
    if (!round) return null
  
    return {
      id: round.id,
      name: round.name,
      location: round.location || '',
      description: round.description || '',
      imageUrl: round.imageUrl || '',
      sortOrder: Number(round.sortOrder ?? 0),
      isActive: Boolean(round.isActive),
      questionCount: Number(round.questionCount ?? 0),
      createdAt: round.createdAt,
      updatedAt: round.updatedAt,
    }
  }
  
  const roundSelect = `
    SELECT
      rounds.id,
      rounds.name,
      rounds.location,
      rounds.description,
      rounds.image_url AS imageUrl,
      rounds.sort_order AS sortOrder,
      rounds.is_active AS isActive,
      rounds.created_at AS createdAt,
      rounds.updated_at AS updatedAt,
      COUNT(questions.id) AS questionCount
    FROM rounds
    LEFT JOIN questions
      ON questions.round_id = rounds.id
  `
  
  async function getRoundById(env, roundId) {
    return env.DB
      .prepare(`
        ${roundSelect}
        WHERE rounds.id = ?
        GROUP BY rounds.id
      `)
      .bind(roundId)
      .first()
  }
  
  async function getNextSortOrder(env) {
    const result = await env.DB
      .prepare(`
        SELECT COALESCE(MAX(sort_order), -1) + 1 AS nextSortOrder
        FROM rounds
      `)
      .first()
  
    return Number(result?.nextSortOrder ?? 0)
  }
  
  export async function onRequestGet({ request, env }) {
    try {
      const url = new URL(request.url)
      const roundIdParam = url.searchParams.get('id')
      const activeOnly = url.searchParams.get('active') === 'true'
  
      if (roundIdParam !== null) {
        const roundId = Number(roundIdParam)
  
        if (!Number.isInteger(roundId) || roundId <= 0) {
          return json(
            { error: 'A valid round ID is required.' },
            400,
          )
        }
  
        const round = await getRoundById(env, roundId)
  
        if (!round) {
          return json(
            { error: 'Round not found.' },
            404,
          )
        }
  
        return json(formatRound(round))
      }
  
      let statement
  
      if (activeOnly) {
        statement = env.DB.prepare(`
          ${roundSelect}
          WHERE rounds.is_active = 1
          GROUP BY rounds.id
          ORDER BY
            rounds.sort_order ASC,
            rounds.id ASC
        `)
      } else {
        statement = env.DB.prepare(`
          ${roundSelect}
          GROUP BY rounds.id
          ORDER BY
            rounds.sort_order ASC,
            rounds.id ASC
        `)
      }
  
      const result = await statement.all()
  
      return json(
        (result.results || []).map(formatRound),
      )
    } catch (error) {
      console.error('Failed to load rounds:', error)
  
      return json(
        { error: 'Unable to load rounds.' },
        500,
      )
    }
  }
  
  export async function onRequestPost({ request, env }) {
    try {
      const body = await request.json()
  
      const name = String(body.name || '').trim()
      const location = String(body.location || '').trim() || null
      const description =
        String(body.description || '').trim() || null
      const imageUrl =
        String(body.imageUrl || '').trim() || null
  
      if (!name) {
        return json(
          { error: 'Round name is required.' },
          400,
        )
      }
  
      let sortOrder
  
      if (
        body.sortOrder !== undefined &&
        body.sortOrder !== null &&
        body.sortOrder !== ''
      ) {
        sortOrder = Number(body.sortOrder)
  
        if (!Number.isInteger(sortOrder) || sortOrder < 0) {
          return json(
            {
              error:
                'sortOrder must be a whole number of zero or greater.',
            },
            400,
          )
        }
      } else {
        sortOrder = await getNextSortOrder(env)
      }
  
      const isActive =
        body.isActive === undefined
          ? 1
          : body.isActive
            ? 1
            : 0
  
      const result = await env.DB
        .prepare(`
          INSERT INTO rounds (
            name,
            location,
            description,
            image_url,
            sort_order,
            is_active
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        .bind(
          name,
          location,
          description,
          imageUrl,
          sortOrder,
          isActive,
        )
        .run()
  
      const createdRound = await getRoundById(
        env,
        result.meta.last_row_id,
      )
  
      return json(formatRound(createdRound), 201)
    } catch (error) {
      console.error('Failed to create round:', error)
  
      return json(
        { error: 'Unable to create the round.' },
        500,
      )
    }
  }
  
  export async function onRequestPatch({ request, env }) {
    try {
      const body = await request.json()
      const roundId = Number(body.id)
  
      if (!Number.isInteger(roundId) || roundId <= 0) {
        return json(
          { error: 'A valid round ID is required.' },
          400,
        )
      }
  
      const existingRound = await env.DB
        .prepare(`
          SELECT
            id,
            name,
            location,
            description,
            image_url,
            sort_order,
            is_active
          FROM rounds
          WHERE id = ?
        `)
        .bind(roundId)
        .first()
  
      if (!existingRound) {
        return json(
          { error: 'Round not found.' },
          404,
        )
      }
  
      const name =
        body.name !== undefined
          ? String(body.name).trim()
          : existingRound.name
  
      const location =
        body.location !== undefined
          ? String(body.location || '').trim() || null
          : existingRound.location
  
      const description =
        body.description !== undefined
          ? String(body.description || '').trim() || null
          : existingRound.description
  
      const imageUrl =
        body.imageUrl !== undefined
          ? String(body.imageUrl || '').trim() || null
          : existingRound.image_url
  
      const isActive =
        body.isActive !== undefined
          ? body.isActive
            ? 1
            : 0
          : existingRound.is_active
  
      let sortOrder = existingRound.sort_order
  
      if (body.sortOrder !== undefined) {
        sortOrder = Number(body.sortOrder)
  
        if (!Number.isInteger(sortOrder) || sortOrder < 0) {
          return json(
            {
              error:
                'sortOrder must be a whole number of zero or greater.',
            },
            400,
          )
        }
      }
  
      if (!name) {
        return json(
          { error: 'Round name cannot be empty.' },
          400,
        )
      }
  
      await env.DB
        .prepare(`
          UPDATE rounds
          SET
            name = ?,
            location = ?,
            description = ?,
            image_url = ?,
            sort_order = ?,
            is_active = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        .bind(
          name,
          location,
          description,
          imageUrl,
          sortOrder,
          isActive,
          roundId,
        )
        .run()
  
      const updatedRound = await getRoundById(env, roundId)
  
      return json(formatRound(updatedRound))
    } catch (error) {
      console.error('Failed to update round:', error)
  
      return json(
        { error: 'Unable to update the round.' },
        500,
      )
    }
  }
  
  export async function onRequestDelete({ request, env }) {
    try {
      const body = await request.json()
      const roundId = Number(body.id)
  
      if (!Number.isInteger(roundId) || roundId <= 0) {
        return json(
          { error: 'A valid round ID is required.' },
          400,
        )
      }
  
      const existingRound = await env.DB
        .prepare(`
          SELECT id, name
          FROM rounds
          WHERE id = ?
        `)
        .bind(roundId)
        .first()
  
      if (!existingRound) {
        return json(
          { error: 'Round not found.' },
          404,
        )
      }
  
      /*
       * We delete dependent records explicitly rather than relying only
       * on SQLite foreign-key cascades. This protects existing answers
       * because the original answers table does not have foreign keys.
       */
      await env.DB.batch([
        env.DB
          .prepare(`
            UPDATE game_state
            SET
              status = 'waiting',
              active_round_id = NULL,
              active_question_id = NULL,
              updated_at = CURRENT_TIMESTAMP
            WHERE active_round_id = ?
          `)
          .bind(roundId),
  
        env.DB
          .prepare(`
            DELETE FROM answers
            WHERE round_id = ?
          `)
          .bind(roundId),
  
        env.DB
          .prepare(`
            DELETE FROM questions
            WHERE round_id = ?
          `)
          .bind(roundId),
  
        env.DB
          .prepare(`
            DELETE FROM rounds
            WHERE id = ?
          `)
          .bind(roundId),
      ])
  
      return json({
        success: true,
        message: 'Round deleted successfully.',
      })
    } catch (error) {
      console.error('Failed to delete round:', error)
  
      return json(
        { error: 'Unable to delete the round.' },
        500,
      )
    }
  }