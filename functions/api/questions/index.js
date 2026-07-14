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
  
  function formatQuestion(question) {
    if (!question) return null
  
    return {
      id: question.id,
      roundId: question.roundId,
      questionText: question.questionText,
      questionType: question.questionType,
      correctAnswer: question.correctAnswer || '',
      options: parseOptions(question.options),
      imageUrl: question.imageUrl || '',
      points: Number(question.points ?? 1),
      sortOrder: Number(question.sortOrder ?? 0),
      isActive: Boolean(question.isActive),
      roundName: question.roundName || '',
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    }
  }
  
  const questionSelect = `
    SELECT
      questions.id,
      questions.round_id AS roundId,
      questions.question_text AS questionText,
      questions.question_type AS questionType,
      questions.correct_answer AS correctAnswer,
      questions.options,
      questions.image_url AS imageUrl,
      questions.points,
      questions.sort_order AS sortOrder,
      questions.is_active AS isActive,
      questions.created_at AS createdAt,
      questions.updated_at AS updatedAt,
      rounds.name AS roundName
    FROM questions
    INNER JOIN rounds
      ON rounds.id = questions.round_id
  `
  
  async function getQuestionById(env, questionId) {
    return env.DB
      .prepare(`
        ${questionSelect}
        WHERE questions.id = ?
      `)
      .bind(questionId)
      .first()
  }
  
  async function getNextSortOrder(env, roundId) {
    const result = await env.DB
      .prepare(`
        SELECT
          COALESCE(MAX(sort_order), -1) + 1 AS nextSortOrder
        FROM questions
        WHERE round_id = ?
      `)
      .bind(roundId)
      .first()
  
    return Number(result?.nextSortOrder ?? 0)
  }
  
  async function getRound(env, roundId) {
    return env.DB
      .prepare(`
        SELECT
          id,
          name,
          is_active
        FROM rounds
        WHERE id = ?
      `)
      .bind(roundId)
      .first()
  }
  
  function validateQuestionType(questionType) {
    return allowedQuestionTypes.includes(questionType)
  }
  
  function validateOptions(questionType, options) {
    if (questionType !== 'multiple_choice') {
      return null
    }
  
    if (options.length < 2) {
      return 'Multiple-choice questions require at least two options.'
    }
  
    return null
  }
  
  export async function onRequestGet({ request, env }) {
    try {
      const url = new URL(request.url)
  
      const questionIdParam = url.searchParams.get('id')
      const roundIdParam = url.searchParams.get('roundId')
      const activeOnly = url.searchParams.get('active') === 'true'
  
      if (questionIdParam !== null) {
        const questionId = Number(questionIdParam)
  
        if (
          !Number.isInteger(questionId) ||
          questionId <= 0
        ) {
          return json(
            { error: 'A valid question ID is required.' },
            400,
          )
        }
  
        const question = await getQuestionById(
          env,
          questionId,
        )
  
        if (!question) {
          return json(
            { error: 'Question not found.' },
            404,
          )
        }
  
        return json(formatQuestion(question))
      }
  
      let roundId = null
  
      if (roundIdParam !== null) {
        roundId = Number(roundIdParam)
  
        if (
          !Number.isInteger(roundId) ||
          roundId <= 0
        ) {
          return json(
            { error: 'A valid round ID is required.' },
            400,
          )
        }
      }
  
      const conditions = []
      const bindings = []
  
      if (roundId !== null) {
        conditions.push('questions.round_id = ?')
        bindings.push(roundId)
      }
  
      if (activeOnly) {
        conditions.push('questions.is_active = 1')
        conditions.push('rounds.is_active = 1')
      }
  
      const whereClause =
        conditions.length > 0
          ? `WHERE ${conditions.join(' AND ')}`
          : ''
  
      const statement = env.DB.prepare(`
        ${questionSelect}
        ${whereClause}
        ORDER BY
          rounds.sort_order ASC,
          rounds.id ASC,
          questions.sort_order ASC,
          questions.id ASC
      `)
  
      const result =
        bindings.length > 0
          ? await statement.bind(...bindings).all()
          : await statement.all()
  
      return json(
        (result.results || []).map(formatQuestion),
      )
    } catch (error) {
      console.error('Failed to load questions:', error)
  
      return json(
        { error: 'Unable to load questions.' },
        500,
      )
    }
  }
  
  export async function onRequestPost({ request, env }) {
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
          ? String(body.correctAnswer).trim()
          : ''
  
      const options = parseOptions(body.options)
  
      const imageUrl =
        String(body.imageUrl || '').trim() || null
  
      const points =
        body.points === undefined ||
        body.points === null ||
        body.points === ''
          ? 1
          : Number(body.points)
  
      if (
        !Number.isInteger(roundId) ||
        roundId <= 0
      ) {
        return json(
          { error: 'A valid round ID is required.' },
          400,
        )
      }
  
      if (!questionText) {
        return json(
          { error: 'Question text is required.' },
          400,
        )
      }
  
      if (!validateQuestionType(questionType)) {
        return json(
          {
            error:
              'Question type must be text, long_text, number, multiple_choice or image.',
          },
          400,
        )
      }
  
      if (
        !Number.isInteger(points) ||
        points < 0
      ) {
        return json(
          {
            error:
              'Points must be a whole number of zero or greater.',
          },
          400,
        )
      }
  
      const optionsError = validateOptions(
        questionType,
        options,
      )
  
      if (optionsError) {
        return json(
          { error: optionsError },
          400,
        )
      }
  
      const round = await getRound(env, roundId)
  
      if (!round) {
        return json(
          { error: 'Round not found.' },
          404,
        )
      }
  
      let sortOrder
  
      if (
        body.sortOrder !== undefined &&
        body.sortOrder !== null &&
        body.sortOrder !== ''
      ) {
        sortOrder = Number(body.sortOrder)
  
        if (
          !Number.isInteger(sortOrder) ||
          sortOrder < 0
        ) {
          return json(
            {
              error:
                'sortOrder must be a whole number of zero or greater.',
            },
            400,
          )
        }
      } else {
        sortOrder = await getNextSortOrder(
          env,
          roundId,
        )
      }
  
      const isActive =
        body.isActive === undefined
          ? 1
          : body.isActive
            ? 1
            : 0
  
      const storedOptions =
        questionType === 'multiple_choice'
          ? JSON.stringify(options)
          : '[]'
  
      const result = await env.DB
        .prepare(`
          INSERT INTO questions (
            round_id,
            question_text,
            question_type,
            correct_answer,
            options,
            image_url,
            points,
            sort_order,
            is_active
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          roundId,
          questionText,
          questionType,
          correctAnswer || null,
          storedOptions,
          imageUrl,
          points,
          sortOrder,
          isActive,
        )
        .run()
  
      const createdQuestion = await getQuestionById(
        env,
        result.meta.last_row_id,
      )
  
      return json(
        formatQuestion(createdQuestion),
        201,
      )
    } catch (error) {
      console.error('Failed to create question:', error)
  
      return json(
        { error: 'Unable to create the question.' },
        500,
      )
    }
  }
  
  export async function onRequestPatch({ request, env }) {
    try {
      const body = await request.json()
      const questionId = Number(body.id)
  
      if (
        !Number.isInteger(questionId) ||
        questionId <= 0
      ) {
        return json(
          { error: 'A valid question ID is required.' },
          400,
        )
      }
  
      const existingQuestion = await env.DB
        .prepare(`
          SELECT
            id,
            round_id,
            question_text,
            question_type,
            correct_answer,
            options,
            image_url,
            points,
            sort_order,
            is_active
          FROM questions
          WHERE id = ?
        `)
        .bind(questionId)
        .first()
  
      if (!existingQuestion) {
        return json(
          { error: 'Question not found.' },
          404,
        )
      }
  
      const roundId =
        body.roundId !== undefined
          ? Number(body.roundId)
          : existingQuestion.round_id
  
      const questionText =
        body.questionText !== undefined
          ? String(body.questionText).trim()
          : existingQuestion.question_text
  
      const questionType =
        body.questionType !== undefined
          ? String(body.questionType).trim()
          : existingQuestion.question_type
  
      const correctAnswer =
        body.correctAnswer !== undefined
          ? String(body.correctAnswer).trim()
          : existingQuestion.correct_answer || ''
  
      const options =
        body.options !== undefined
          ? parseOptions(body.options)
          : parseOptions(existingQuestion.options)
  
      const imageUrl =
        body.imageUrl !== undefined
          ? String(body.imageUrl || '').trim() || null
          : existingQuestion.image_url
  
      const points =
        body.points !== undefined
          ? Number(body.points)
          : Number(existingQuestion.points)
  
      const sortOrder =
        body.sortOrder !== undefined
          ? Number(body.sortOrder)
          : Number(existingQuestion.sort_order)
  
      const isActive =
        body.isActive !== undefined
          ? body.isActive
            ? 1
            : 0
          : existingQuestion.is_active
  
      if (
        !Number.isInteger(roundId) ||
        roundId <= 0
      ) {
        return json(
          { error: 'A valid round ID is required.' },
          400,
        )
      }
  
      if (!questionText) {
        return json(
          {
            error:
              'Question text cannot be empty.',
          },
          400,
        )
      }
  
      if (!validateQuestionType(questionType)) {
        return json(
          {
            error:
              'Question type must be text, long_text, number, multiple_choice or image.',
          },
          400,
        )
      }
  
      if (
        !Number.isInteger(points) ||
        points < 0
      ) {
        return json(
          {
            error:
              'Points must be a whole number of zero or greater.',
          },
          400,
        )
      }
  
      if (
        !Number.isInteger(sortOrder) ||
        sortOrder < 0
      ) {
        return json(
          {
            error:
              'sortOrder must be a whole number of zero or greater.',
          },
          400,
        )
      }
  
      const optionsError = validateOptions(
        questionType,
        options,
      )
  
      if (optionsError) {
        return json(
          { error: optionsError },
          400,
        )
      }
  
      const round = await getRound(env, roundId)
  
      if (!round) {
        return json(
          { error: 'Round not found.' },
          404,
        )
      }
  
      const storedOptions =
        questionType === 'multiple_choice'
          ? JSON.stringify(options)
          : '[]'
  
      await env.DB
        .prepare(`
          UPDATE questions
          SET
            round_id = ?,
            question_text = ?,
            question_type = ?,
            correct_answer = ?,
            options = ?,
            image_url = ?,
            points = ?,
            sort_order = ?,
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
          points,
          sortOrder,
          isActive,
          questionId,
        )
        .run()
  
      const updatedQuestion = await getQuestionById(
        env,
        questionId,
      )
  
      return json(
        formatQuestion(updatedQuestion),
      )
    } catch (error) {
      console.error('Failed to update question:', error)
  
      return json(
        { error: 'Unable to update the question.' },
        500,
      )
    }
  }
  
  export async function onRequestDelete({ request, env }) {
    try {
      const body = await request.json()
      const questionId = Number(body.id)
  
      if (
        !Number.isInteger(questionId) ||
        questionId <= 0
      ) {
        return json(
          { error: 'A valid question ID is required.' },
          400,
        )
      }
  
      const existingQuestion = await env.DB
        .prepare(`
          SELECT
            id,
            round_id,
            question_text
          FROM questions
          WHERE id = ?
        `)
        .bind(questionId)
        .first()
  
      if (!existingQuestion) {
        return json(
          { error: 'Question not found.' },
          404,
        )
      }
  
      await env.DB.batch([
        env.DB
          .prepare(`
            UPDATE game_state
            SET
              status = 'roundIntro',
              active_question_id = NULL,
              updated_at = CURRENT_TIMESTAMP
            WHERE active_question_id = ?
          `)
          .bind(questionId),
  
        env.DB
          .prepare(`
            DELETE FROM answers
            WHERE question_id = ?
          `)
          .bind(questionId),
  
        env.DB
          .prepare(`
            DELETE FROM questions
            WHERE id = ?
          `)
          .bind(questionId),
      ])
  
      return json({
        success: true,
        message: 'Question deleted successfully.',
      })
    } catch (error) {
      console.error('Failed to delete question:', error)
  
      return json(
        { error: 'Unable to delete the question.' },
        500,
      )
    }
  }