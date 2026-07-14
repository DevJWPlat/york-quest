function json(data, status = 200) {
    return Response.json(data, {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  }
  
  function parseParticipantIds(value) {
    if (!Array.isArray(value)) {
      return []
    }
  
    return [
      ...new Set(
        value
          .map((id) => Number(id))
          .filter(
            (id) =>
              Number.isInteger(id) &&
              id > 0,
          ),
      ),
    ]
  }
  
  function parseOptions(options) {
    if (Array.isArray(options)) {
      return options
    }
  
    if (typeof options !== 'string') {
      return []
    }
  
    try {
      const parsed = JSON.parse(options)
  
      return Array.isArray(parsed)
        ? parsed
        : []
    } catch {
      return []
    }
  }
  
  function formatParticipant(participant) {
    return {
      id: Number(participant.id),
      sessionId: Number(
        participant.sessionId,
      ),
      userId: Number(participant.userId),
      name: participant.name || '',
      username: participant.username || '',
      avatar: participant.avatar || '',
      answer: participant.answer || '',
      hasSubmitted: Boolean(
        participant.submittedAt,
      ),
      submittedAt:
        participant.submittedAt || null,
      createdAt:
        participant.createdAt || null,
      updatedAt:
        participant.updatedAt || null,
    }
  }
  
  function formatSession(
    session,
    participants = [],
  ) {
    if (!session) {
      return null
    }
  
    return {
      id: Number(session.id),
      roundId: Number(session.roundId),
  
      tieBreakerQuestionId: Number(
        session.tieBreakerQuestionId,
      ),
  
      status: session.status,
  
      winnerUserId:
        session.winnerUserId === null ||
        session.winnerUserId === undefined
          ? null
          : Number(session.winnerUserId),
  
      winnerName:
        session.winnerName || '',
  
      roundName:
        session.roundName || '',
  
      question: {
        id: Number(
          session.tieBreakerQuestionId,
        ),
  
        questionText:
          session.questionText || '',
  
        questionType:
          session.questionType || 'text',
  
        correctAnswer:
          session.correctAnswer || '',
  
        options: parseOptions(
          session.options,
        ),
  
        imageUrl:
          session.imageUrl || '',
      },
  
      participants:
        participants.map(
          formatParticipant,
        ),
  
      createdAt:
        session.createdAt || null,
  
      updatedAt:
        session.updatedAt || null,
    }
  }
  
  const sessionSelect = `
    SELECT
      tie_breaker_sessions.id,
      tie_breaker_sessions.round_id
        AS roundId,
      tie_breaker_sessions.tie_breaker_question_id
        AS tieBreakerQuestionId,
      tie_breaker_sessions.status,
      tie_breaker_sessions.winner_user_id
        AS winnerUserId,
      tie_breaker_sessions.created_at
        AS createdAt,
      tie_breaker_sessions.updated_at
        AS updatedAt,
  
      rounds.name AS roundName,
  
      tie_breaker_questions.question_text
        AS questionText,
      tie_breaker_questions.question_type
        AS questionType,
      tie_breaker_questions.correct_answer
        AS correctAnswer,
      tie_breaker_questions.options,
      tie_breaker_questions.image_url
        AS imageUrl,
  
      winner.name AS winnerName
  
    FROM tie_breaker_sessions
  
    INNER JOIN rounds
      ON rounds.id =
        tie_breaker_sessions.round_id
  
    INNER JOIN tie_breaker_questions
      ON tie_breaker_questions.id =
        tie_breaker_sessions.tie_breaker_question_id
  
    LEFT JOIN users AS winner
      ON winner.id =
        tie_breaker_sessions.winner_user_id
  `
  
  const participantSelect = `
    SELECT
      tie_breaker_participants.id,
      tie_breaker_participants.session_id
        AS sessionId,
      tie_breaker_participants.user_id
        AS userId,
      tie_breaker_participants.answer,
      tie_breaker_participants.submitted_at
        AS submittedAt,
      tie_breaker_participants.created_at
        AS createdAt,
      tie_breaker_participants.updated_at
        AS updatedAt,
  
      users.name,
      users.username,
      users.avatar
  
    FROM tie_breaker_participants
  
    INNER JOIN users
      ON users.id =
        tie_breaker_participants.user_id
  `
  
  async function getSessionById(
    env,
    sessionId,
  ) {
    return env.DB
      .prepare(`
        ${sessionSelect}
        WHERE tie_breaker_sessions.id = ?
        LIMIT 1
      `)
      .bind(sessionId)
      .first()
  }
  
  async function getLatestSessionForRound(
    env,
    roundId,
  ) {
    return env.DB
      .prepare(`
        ${sessionSelect}
        WHERE tie_breaker_sessions.round_id = ?
        ORDER BY tie_breaker_sessions.id DESC
        LIMIT 1
      `)
      .bind(roundId)
      .first()
  }
  
  async function getActiveSession(env) {
    return env.DB
      .prepare(`
        ${sessionSelect}
        WHERE tie_breaker_sessions.status = 'active'
        ORDER BY tie_breaker_sessions.id DESC
        LIMIT 1
      `)
      .first()
  }
  
  async function getParticipants(
    env,
    sessionId,
  ) {
    const result = await env.DB
      .prepare(`
        ${participantSelect}
        WHERE
          tie_breaker_participants.session_id = ?
        ORDER BY
          tie_breaker_participants.id ASC
      `)
      .bind(sessionId)
      .all()
  
    return result.results || []
  }
  
  async function getFormattedSession(
    env,
    session,
  ) {
    if (!session) {
      return null
    }
  
    const participants =
      await getParticipants(
        env,
        session.id,
      )
  
    return formatSession(
      session,
      participants,
    )
  }
  
  async function getRound(
    env,
    roundId,
  ) {
    return env.DB
      .prepare(`
        SELECT
          id,
          name,
          is_active AS isActive
        FROM rounds
        WHERE id = ?
        LIMIT 1
      `)
      .bind(roundId)
      .first()
  }
  
  async function getTieBreaker(
    env,
    tieBreakerId,
  ) {
    return env.DB
      .prepare(`
        SELECT
          id,
          round_id AS roundId,
          question_text AS questionText,
          is_active AS isActive
        FROM tie_breaker_questions
        WHERE id = ?
        LIMIT 1
      `)
      .bind(tieBreakerId)
      .first()
  }
  
  async function getValidParticipants(
    env,
    participantUserIds,
  ) {
    if (!participantUserIds.length) {
      return []
    }
  
    const placeholders =
      participantUserIds
        .map(() => '?')
        .join(', ')
  
    const result = await env.DB
      .prepare(`
        SELECT
          id,
          name,
          role,
          is_active AS isActive
        FROM users
        WHERE id IN (${placeholders})
          AND role = 'player'
          AND is_active = 1
      `)
      .bind(...participantUserIds)
      .all()
  
    return result.results || []
  }
  
  export async function onRequestGet({
    request,
    env,
  }) {
    try {
      const url = new URL(request.url)
  
      const sessionIdParam =
        url.searchParams.get('id')
  
      const roundIdParam =
        url.searchParams.get('roundId')
  
      const activeOnly =
        url.searchParams.get('active') ===
        'true'
  
      const userIdParam =
        url.searchParams.get('userId')
  
      let session = null
  
      if (sessionIdParam !== null) {
        const sessionId = Number(
          sessionIdParam,
        )
  
        if (
          !Number.isInteger(sessionId) ||
          sessionId <= 0
        ) {
          return json(
            {
              error:
                'A valid tie-breaker session ID is required.',
            },
            400,
          )
        }
  
        session = await getSessionById(
          env,
          sessionId,
        )
      } else if (roundIdParam !== null) {
        const roundId = Number(
          roundIdParam,
        )
  
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
  
        session =
          await getLatestSessionForRound(
            env,
            roundId,
          )
      } else if (activeOnly) {
        session = await getActiveSession(
          env,
        )
      } else {
        return json(
          {
            error:
              'Provide a session ID, round ID or active=true.',
          },
          400,
        )
      }
  
      if (!session) {
        return json(null)
      }
  
      const formattedSession =
        await getFormattedSession(
          env,
          session,
        )
  
      if (userIdParam !== null) {
        const userId = Number(userIdParam)
  
        if (
          !Number.isInteger(userId) ||
          userId <= 0
        ) {
          return json(
            {
              error:
                'A valid user ID is required.',
            },
            400,
          )
        }
  
        const participant =
          formattedSession.participants.find(
            (item) =>
              Number(item.userId) ===
              userId,
          ) || null
  
        return json({
          ...formattedSession,
          isParticipant:
            Boolean(participant),
          currentParticipant:
            participant,
        })
      }
  
      return json(formattedSession)
    } catch (error) {
      console.error(
        'Failed to load tie-breaker session:',
        error,
      )
  
      return json(
        {
          error:
            'Unable to load the tie-breaker session.',
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
  
      const roundId = Number(
        body.roundId,
      )
  
      const tieBreakerId = Number(
        body.tieBreakerId,
      )
  
      const participantUserIds =
        parseParticipantIds(
          body.participantUserIds,
        )
  
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
  
      if (
        !Number.isInteger(tieBreakerId) ||
        tieBreakerId <= 0
      ) {
        return json(
          {
            error:
              'A valid tie-breaker question ID is required.',
          },
          400,
        )
      }
  
      if (
        participantUserIds.length < 2
      ) {
        return json(
          {
            error:
              'Select at least two players for the tie-breaker.',
          },
          400,
        )
      }
  
      const [round, tieBreaker] =
        await Promise.all([
          getRound(env, roundId),
          getTieBreaker(
            env,
            tieBreakerId,
          ),
        ])
  
      if (!round) {
        return json(
          {
            error: 'Round not found.',
          },
          404,
        )
      }
  
      if (!tieBreaker) {
        return json(
          {
            error:
              'Tie-breaker question not found.',
          },
          404,
        )
      }
  
      if (
        Number(tieBreaker.roundId) !==
        roundId
      ) {
        return json(
          {
            error:
              'This tie-breaker does not belong to the selected round.',
          },
          400,
        )
      }
  
      if (!tieBreaker.isActive) {
        return json(
          {
            error:
              'This tie-breaker is currently disabled.',
          },
          400,
        )
      }
  
      const validParticipants =
        await getValidParticipants(
          env,
          participantUserIds,
        )
  
      if (
        validParticipants.length !==
        participantUserIds.length
      ) {
        return json(
          {
            error:
              'One or more selected players are invalid or disabled.',
          },
          400,
        )
      }
  
      /*
       * Only one active tie-breaker can exist at a time.
       * Any abandoned active session is cancelled before
       * creating the new one.
       */
      await env.DB
        .prepare(`
          UPDATE tie_breaker_sessions
          SET
            status = 'cancelled',
            updated_at = CURRENT_TIMESTAMP
          WHERE status = 'active'
        `)
        .run()
  
      const sessionResult = await env.DB
        .prepare(`
          INSERT INTO tie_breaker_sessions (
            round_id,
            tie_breaker_question_id,
            status
          )
          VALUES (?, ?, 'active')
        `)
        .bind(
          roundId,
          tieBreakerId,
        )
        .run()
  
      const sessionId = Number(
        sessionResult.meta.last_row_id,
      )
  
      const participantStatements =
        participantUserIds.map(
          (userId) =>
            env.DB
              .prepare(`
                INSERT INTO tie_breaker_participants (
                  session_id,
                  user_id
                )
                VALUES (?, ?)
              `)
              .bind(
                sessionId,
                userId,
              ),
        )
  
      await env.DB.batch([
        ...participantStatements,
  
        env.DB
          .prepare(`
            UPDATE game_state
            SET
              status = 'tieBreaker',
              active_tie_breaker_session_id = ?,
              active_round_id = ?,
              active_question_id = NULL,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
          `)
          .bind(
            sessionId,
            roundId,
          ),
      ])
  
      const createdSession =
        await getSessionById(
          env,
          sessionId,
        )
  
      return json(
        await getFormattedSession(
          env,
          createdSession,
        ),
        201,
      )
    } catch (error) {
      console.error(
        'Failed to start tie-breaker:',
        error,
      )
  
      return json(
        {
          error:
            'Unable to start the tie-breaker.',
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
  
      const action = String(
        body.action || '',
      ).trim()
  
      const sessionId = Number(
        body.sessionId,
      )
  
      if (
        !Number.isInteger(sessionId) ||
        sessionId <= 0
      ) {
        return json(
          {
            error:
              'A valid tie-breaker session ID is required.',
          },
          400,
        )
      }
  
      const session =
        await getSessionById(
          env,
          sessionId,
        )
  
      if (!session) {
        return json(
          {
            error:
              'Tie-breaker session not found.',
          },
          404,
        )
      }
  
      if (action === 'submit-answer') {
        if (session.status !== 'active') {
          return json(
            {
              error:
                'This tie-breaker is no longer active.',
            },
            409,
          )
        }
  
        const userId = Number(
          body.userId,
        )
  
        const answer = String(
          body.answer || '',
        ).trim()
  
        if (
          !Number.isInteger(userId) ||
          userId <= 0
        ) {
          return json(
            {
              error:
                'A valid user ID is required.',
            },
            400,
          )
        }
  
        if (!answer) {
          return json(
            {
              error:
                'Enter an answer before submitting.',
            },
            400,
          )
        }
  
        const participant =
          await env.DB
            .prepare(`
              SELECT
                id,
                submitted_at
              FROM tie_breaker_participants
              WHERE session_id = ?
                AND user_id = ?
              LIMIT 1
            `)
            .bind(
              sessionId,
              userId,
            )
            .first()
  
        if (!participant) {
          return json(
            {
              error:
                'This player was not selected for the tie-breaker.',
            },
            403,
          )
        }
  
        if (participant.submitted_at) {
          return json(
            {
              error:
                'An answer has already been submitted.',
            },
            409,
          )
        }
  
        await env.DB
          .prepare(`
            UPDATE tie_breaker_participants
            SET
              answer = ?,
              submitted_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
            WHERE session_id = ?
              AND user_id = ?
          `)
          .bind(
            answer,
            sessionId,
            userId,
          )
          .run()
  
        const updatedSession =
          await getSessionById(
            env,
            sessionId,
          )
  
        return json(
          await getFormattedSession(
            env,
            updatedSession,
          ),
        )
      }
  
      if (action === 'complete') {
        if (session.status !== 'active') {
          return json(
            {
              error:
                'This tie-breaker is no longer active.',
            },
            409,
          )
        }
  
        const winnerUserId = Number(
          body.winnerUserId,
        )
  
        if (
          !Number.isInteger(
            winnerUserId,
          ) ||
          winnerUserId <= 0
        ) {
          return json(
            {
              error:
                'Select a tie-breaker winner.',
            },
            400,
          )
        }
  
        const winnerParticipant =
          await env.DB
            .prepare(`
              SELECT id
              FROM tie_breaker_participants
              WHERE session_id = ?
                AND user_id = ?
              LIMIT 1
            `)
            .bind(
              sessionId,
              winnerUserId,
            )
            .first()
  
        if (!winnerParticipant) {
          return json(
            {
              error:
                'The winner must be one of the selected tie-breaker players.',
            },
            400,
          )
        }
  
        await env.DB.batch([
          env.DB
            .prepare(`
              UPDATE tie_breaker_sessions
              SET
                status = 'complete',
                winner_user_id = ?,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `)
            .bind(
              winnerUserId,
              sessionId,
            ),
  
          env.DB
            .prepare(`
              UPDATE game_state
              SET
                status = 'roundComplete',
                active_tie_breaker_session_id = NULL,
                active_question_id = NULL,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = 1
            `),
        ])
  
        const completedSession =
          await getSessionById(
            env,
            sessionId,
          )
  
        return json(
          await getFormattedSession(
            env,
            completedSession,
          ),
        )
      }
  
      if (action === 'cancel') {
        if (session.status !== 'active') {
          return json(
            {
              error:
                'This tie-breaker is no longer active.',
            },
            409,
          )
        }
  
        await env.DB.batch([
          env.DB
            .prepare(`
              UPDATE tie_breaker_sessions
              SET
                status = 'cancelled',
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `)
            .bind(sessionId),
  
          env.DB
            .prepare(`
              UPDATE game_state
              SET
                status = 'roundComplete',
                active_tie_breaker_session_id = NULL,
                active_question_id = NULL,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = 1
            `),
        ])
  
        const cancelledSession =
          await getSessionById(
            env,
            sessionId,
          )
  
        return json(
          await getFormattedSession(
            env,
            cancelledSession,
          ),
        )
      }
  
      return json(
        {
          error:
            'Action must be submit-answer, complete or cancel.',
        },
        400,
      )
    } catch (error) {
      console.error(
        'Failed to update tie-breaker session:',
        error,
      )
  
      return json(
        {
          error:
            'Unable to update the tie-breaker session.',
        },
        500,
      )
    }
  }