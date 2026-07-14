function json(data, status = 200) {
    return Response.json(data, {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  }
  
  const allowedQuestionTypes = [
    'text',
    'long_text',
    'number',
    'multiple_choice',
    'image',
  ]
  
  function parseOptions(options) {
    if (Array.isArray(options)) {
      return options
        .map((option) => String(option).trim())
        .filter(Boolean)
    }
  
    if (typeof options === 'string') {
      try {
        const parsed = JSON.parse(options)
  
        if (!Array.isArray(parsed)) {
          return []
        }
  
        return parsed
          .map((option) => String(option).trim())
          .filter(Boolean)
      } catch {
        return []
      }
    }
  
    return []
  }
  
  function formatTieBreaker(question) {
    if (!question) {
      return null
    }
  
    return {
      id: Number(question.id),
      roundId: Number(question.roundId),
      questionText: question.questionText,
      questionType: question.questionType,
      correctAnswer: question.correctAnswer || '',
      options: parseOptions(question.options),
      imageUrl: question.imageUrl || '',
      isActive: Boolean(question.isActive),
      roundName: question.roundName || '',
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    }
  }
  
  const tieBreakerSelect = `
    SELECT
      tie_breaker_questions.id,
      tie_breaker_questions.round_id AS roundId,
      tie_breaker_questions.question_text AS questionText,
      tie_breaker_questions.question_type AS questionType,
      tie_breaker_questions.correct_answer AS correctAnswer,
      tie_breaker_questions.options,
      tie_breaker_questions.image_url AS imageUrl,
      tie_breaker_questions.is_active AS isActive,
      tie_breaker_questions.created_at AS createdAt,
      tie_breaker_questions.updated_at AS updatedAt,
      rounds.name AS roundName
    FROM tie_breaker_questions
    INNER JOIN rounds
      ON rounds.id = tie_breaker_questions.round_id
  `
  
  async function getTieBreakerById(env, tieBreakerId) {
    return env.DB
      .prepare(`
        ${tieBreakerSelect}
        WHERE tie_breaker_questions.id = ?
      `)
      .bind(tieBreakerId)
      .first()
  }
  
  async function getTieBreakerByRoundId(env, roundId) {
    return env.DB
      .prepare(`
        ${tieBreakerSelect}
        WHERE tie_breaker_questions.round_id = ?
      `)
      .bind(roundId)
      .first()
  }
  
  async function getRound(env, roundId) {
    return env.DB
      .prepare(`
        SELECT
          id,
          name,
          is_active AS isActive
        FROM rounds
        WHERE id = ?
      `)
      .bind(roundId)
      .first()
  }
  
  function validateQuestionType(questionType) {
    return allowedQuestionTypes.includes(
      questionType,
    )
  }
  
  function validateOptions(
    questionType,
    options,
  ) {
    if (
      questionType !== 'multiple_choice'
    ) {
      return ''
    }
  
    if (options.length < 2) {
      return 'Multiple-choice tie-breakers require at least two options.'
    }
  
    return ''
  }
  
  export async function onRequestGet({
    request,
    env,
  }) {
    try {
      const url = new URL(request.url)
  
      const tieBreakerIdParam =
        url.searchParams.get('id')
  
      const roundIdParam =
        url.searchParams.get('roundId')
  
      const activeOnly =
        url.searchParams.get('active') ===
        'true'
  
      if (tieBreakerIdParam !== null) {
        const tieBreakerId = Number(
          tieBreakerIdParam,
        )
  
        if (
          !Number.isInteger(tieBreakerId) ||
          tieBreakerId <= 0
        ) {
          return json(
            {
              error:
                'A valid tie-breaker ID is required.',
            },
            400,
          )
        }
  
        const tieBreaker =
          await getTieBreakerById(
            env,
            tieBreakerId,
          )
  
        if (!tieBreaker) {
          return json(
            {
              error:
                'Tie-breaker question not found.',
            },
            404,
          )
        }
  
        return json(
          formatTieBreaker(tieBreaker),
        )
      }
  
      if (roundIdParam !== null) {
        const roundId = Number(roundIdParam)
  
        if (
          !Number.isInteger(roundId) ||
          roundId <= 0
        ) {
          return json(
            {
              error:
                'A valid round ID is required.',
            },
            400,
          )
        }
  
        const tieBreaker =
          await getTieBreakerByRoundId(
            env,
            roundId,
          )
  
        /*
         * Returning null is useful for the editor.
         * A round without a tie-breaker is not an error.
         */
        return json(
          tieBreaker
            ? formatTieBreaker(tieBreaker)
            : null,
        )
      }
  
      const conditions = []
  
      if (activeOnly) {
        conditions.push(
          'tie_breaker_questions.is_active = 1',
        )
  
        conditions.push(
          'rounds.is_active = 1',
        )
      }
  
      const whereClause =
        conditions.length > 0
          ? `WHERE ${conditions.join(
              ' AND ',
            )}`
          : ''
  
      const result = await env.DB
        .prepare(`
          ${tieBreakerSelect}
          ${whereClause}
          ORDER BY
            rounds.sort_order ASC,
            rounds.id ASC,
            tie_breaker_questions.id ASC
        `)
        .all()
  
      return json(
        (result.results || []).map(
          formatTieBreaker,
        ),
      )
    } catch (error) {
      console.error(
        'Failed to load tie-breakers:',
        error,
      )
  
      return json(
        {
          error:
            'Unable to load tie-breaker questions.',
        },
        500,
      )
    }
  }
  
  export async function onRequestPost({
    request,
    env,
  }) {
    try {
      const body = await request.json()
  
      const roundId = Number(body.roundId)
  
      const questionText = String(
        body.questionText || '',
      ).trim()
  
      const questionType = String(
        body.questionType || 'text',
      ).trim()
  
      const correctAnswer =
        body.correctAnswer !== undefined
          ? String(
              body.correctAnswer || '',
            ).trim()
          : ''
  
      const options = parseOptions(
        body.options,
      )
  
      const imageUrl =
        String(
          body.imageUrl || '',
        ).trim() || null
  
      const isActive =
        body.isActive === undefined
          ? 1
          : body.isActive
            ? 1
            : 0
  
      if (
        !Number.isInteger(roundId) ||
        roundId <= 0
      ) {
        return json(
          {
            error:
              'A valid round ID is required.',
          },
          400,
        )
      }
  
      if (!questionText) {
        return json(
          {
            error:
              'Tie-breaker question text is required.',
          },
          400,
        )
      }
  
      if (
        !validateQuestionType(
          questionType,
        )
      ) {
        return json(
          {
            error:
              'Tie-breaker type must be text, long_text, number, multiple_choice or image.',
          },
          400,
        )
      }
  
      const optionsError =
        validateOptions(
          questionType,
          options,
        )
  
      if (optionsError) {
        return json(
          {
            error: optionsError,
          },
          400,
        )
      }
  
      if (
        questionType === 'image' &&
        !imageUrl
      ) {
        return json(
          {
            error:
              'Image tie-breakers require an uploaded image.',
          },
          400,
        )
      }
  
      const round = await getRound(
        env,
        roundId,
      )
  
      if (!round) {
        return json(
          {
            error: 'Round not found.',
          },
          404,
        )
      }
  
      const existingTieBreaker =
        await getTieBreakerByRoundId(
          env,
          roundId,
        )
  
      if (existingTieBreaker) {
        return json(
          {
            error:
              'This round already has a tie-breaker question.',
          },
          409,
        )
      }
  
      const storedOptions =
        questionType ===
        'multiple_choice'
          ? JSON.stringify(options)
          : '[]'
  
      const result = await env.DB
        .prepare(`
          INSERT INTO tie_breaker_questions (
            round_id,
            question_text,
            question_type,
            correct_answer,
            options,
            image_url,
            is_active
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          roundId,
          questionText,
          questionType,
          correctAnswer || null,
          storedOptions,
          imageUrl,
          isActive,
        )
        .run()
  
      const createdTieBreaker =
        await getTieBreakerById(
          env,
          result.meta.last_row_id,
        )
  
      return json(
        formatTieBreaker(
          createdTieBreaker,
        ),
        201,
      )
    } catch (error) {
      console.error(
        'Failed to create tie-breaker:',
        error,
      )
  
      return json(
        {
          error:
            'Unable to create the tie-breaker question.',
        },
        500,
      )
    }
  }
  
  export async function onRequestPatch({
    request,
    env,
  }) {
    try {
      const body = await request.json()
      const tieBreakerId = Number(body.id)
  
      if (
        !Number.isInteger(tieBreakerId) ||
        tieBreakerId <= 0
      ) {
        return json(
          {
            error:
              'A valid tie-breaker ID is required.',
          },
          400,
        )
      }
  
      const existingTieBreaker =
        await env.DB
          .prepare(`
            SELECT
              id,
              round_id,
              question_text,
              question_type,
              correct_answer,
              options,
              image_url,
              is_active
            FROM tie_breaker_questions
            WHERE id = ?
          `)
          .bind(tieBreakerId)
          .first()
  
      if (!existingTieBreaker) {
        return json(
          {
            error:
              'Tie-breaker question not found.',
          },
          404,
        )
      }
  
      const roundId =
        body.roundId !== undefined
          ? Number(body.roundId)
          : Number(
              existingTieBreaker.round_id,
            )
  
      const questionText =
        body.questionText !== undefined
          ? String(
              body.questionText || '',
            ).trim()
          : existingTieBreaker.question_text
  
      const questionType =
        body.questionType !== undefined
          ? String(
              body.questionType || '',
            ).trim()
          : existingTieBreaker.question_type
  
      const correctAnswer =
        body.correctAnswer !== undefined
          ? String(
              body.correctAnswer || '',
            ).trim()
          : existingTieBreaker.correct_answer ||
            ''
  
      const options =
        body.options !== undefined
          ? parseOptions(body.options)
          : parseOptions(
              existingTieBreaker.options,
            )
  
      const imageUrl =
        body.imageUrl !== undefined
          ? String(
              body.imageUrl || '',
            ).trim() || null
          : existingTieBreaker.image_url
  
      const isActive =
        body.isActive !== undefined
          ? body.isActive
            ? 1
            : 0
          : existingTieBreaker.is_active
  
      if (
        !Number.isInteger(roundId) ||
        roundId <= 0
      ) {
        return json(
          {
            error:
              'A valid round ID is required.',
          },
          400,
        )
      }
  
      if (!questionText) {
        return json(
          {
            error:
              'Tie-breaker question text cannot be empty.',
          },
          400,
        )
      }
  
      if (
        !validateQuestionType(
          questionType,
        )
      ) {
        return json(
          {
            error:
              'Tie-breaker type must be text, long_text, number, multiple_choice or image.',
          },
          400,
        )
      }
  
      const optionsError =
        validateOptions(
          questionType,
          options,
        )
  
      if (optionsError) {
        return json(
          {
            error: optionsError,
          },
          400,
        )
      }
  
      if (
        questionType === 'image' &&
        !imageUrl
      ) {
        return json(
          {
            error:
              'Image tie-breakers require an uploaded image.',
          },
          400,
        )
      }
  
      const round = await getRound(
        env,
        roundId,
      )
  
      if (!round) {
        return json(
          {
            error: 'Round not found.',
          },
          404,
        )
      }
  
      const roundTieBreaker =
        await getTieBreakerByRoundId(
          env,
          roundId,
        )
  
      if (
        roundTieBreaker &&
        Number(roundTieBreaker.id) !==
          tieBreakerId
      ) {
        return json(
          {
            error:
              'The selected round already has another tie-breaker question.',
          },
          409,
        )
      }
  
      const storedOptions =
        questionType ===
        'multiple_choice'
          ? JSON.stringify(options)
          : '[]'
  
      await env.DB
        .prepare(`
          UPDATE tie_breaker_questions
          SET
            round_id = ?,
            question_text = ?,
            question_type = ?,
            correct_answer = ?,
            options = ?,
            image_url = ?,
            is_active = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        .bind(
          roundId,
          questionText,
          questionType,
          correctAnswer || null,
          storedOptions,
          imageUrl,
          isActive,
          tieBreakerId,
        )
        .run()
  
      const updatedTieBreaker =
        await getTieBreakerById(
          env,
          tieBreakerId,
        )
  
      return json(
        formatTieBreaker(
          updatedTieBreaker,
        ),
      )
    } catch (error) {
      console.error(
        'Failed to update tie-breaker:',
        error,
      )
  
      return json(
        {
          error:
            'Unable to update the tie-breaker question.',
        },
        500,
      )
    }
  }
  
  export async function onRequestDelete({
    request,
    env,
  }) {
    try {
      const body = await request.json()
      const tieBreakerId = Number(body.id)
  
      if (
        !Number.isInteger(tieBreakerId) ||
        tieBreakerId <= 0
      ) {
        return json(
          {
            error:
              'A valid tie-breaker ID is required.',
          },
          400,
        )
      }
  
      const existingTieBreaker =
        await env.DB
          .prepare(`
            SELECT
              id,
              round_id AS roundId,
              image_url AS imageUrl
            FROM tie_breaker_questions
            WHERE id = ?
          `)
          .bind(tieBreakerId)
          .first()
  
      if (!existingTieBreaker) {
        return json(
          {
            error:
              'Tie-breaker question not found.',
          },
          404,
        )
      }
  
      /*
       * Sessions and participants are removed through
       * the foreign-key cascades from the migration.
       */
      await env.DB
        .prepare(`
          DELETE FROM tie_breaker_questions
          WHERE id = ?
        `)
        .bind(tieBreakerId)
        .run()
  
      return json({
        success: true,
        message:
          'Tie-breaker question deleted successfully.',
        imageUrl:
          existingTieBreaker.imageUrl || '',
      })
    } catch (error) {
      console.error(
        'Failed to delete tie-breaker:',
        error,
      )
  
      return json(
        {
          error:
            'Unable to delete the tie-breaker question.',
        },
        500,
      )
    }
  }