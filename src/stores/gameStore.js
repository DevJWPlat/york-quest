import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useGameStore = defineStore('game', () => {
  const rounds = ref([])
  const questions = ref([])
  const answers = ref([])

  const activeRoundId = ref(null)
  const activeQuestionId = ref(null)

  const gameState = ref('waiting')
  // waiting | roundIntro | question | submitted
  // roundComplete | leaderboard | questComplete

  const isContentLoading = ref(false)
  const contentError = ref('')

  function normaliseRound(round) {
    return {
      ...round,

      id: Number(round.id),

      // Existing game components currently expect these fields.
      title: `Pub ${Number(round.sortOrder ?? 0) + 1}`,
      pubName: round.name || '',
      status: 'locked',

      // Keep the D1/API fields available as well.
      name: round.name || '',
      location: round.location || '',
      description: round.description || '',
      imageUrl: round.imageUrl || '',
      sortOrder: Number(round.sortOrder ?? 0),
      isActive: Boolean(round.isActive),
      questionCount: Number(round.questionCount ?? 0),
    }
  }

  function normaliseQuestion(question) {
    const apiType = question.questionType || 'text'

    const legacyTypeMap = {
      long_text: 'long-text',
      multiple_choice: 'multiple-choice',
    }

    return {
      ...question,

      id: Number(question.id),
      roundId: Number(question.roundId),

      // Existing game components currently expect these fields.
      order: Number(question.sortOrder ?? 0) + 1,
      text: question.questionText || '',
      type: legacyTypeMap[apiType] || apiType,
      image: question.imageUrl || '',

      // Keep the D1/API fields available as well.
      questionText: question.questionText || '',
      questionType: apiType,
      imageUrl: question.imageUrl || '',
      correctAnswer: question.correctAnswer || '',
      options: Array.isArray(question.options)
        ? question.options
        : [],
      points: Number(question.points ?? 1),
      sortOrder: Number(question.sortOrder ?? 0),
      isActive: Boolean(question.isActive),
    }
  }

  const orderedRounds = computed(() => {
    return [...rounds.value]
      .filter((round) => round.isActive)
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder
        }

        return a.id - b.id
      })
  })

  const currentRound = computed(() => {
    return (
      rounds.value.find(
        (round) =>
          Number(round.id) ===
          Number(activeRoundId.value),
      ) || null
    )
  })

  const currentQuestion = computed(() => {
    return (
      questions.value.find(
        (question) =>
          Number(question.id) ===
          Number(activeQuestionId.value),
      ) || null
    )
  })

  const currentRoundQuestions = computed(() => {
    if (!currentRound.value) {
      return []
    }

    return questions.value
      .filter((question) => {
        return (
          Number(question.roundId) ===
            Number(currentRound.value.id) &&
          question.isActive
        )
      })
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder
        }

        return a.id - b.id
      })
  })

  const nextRound = computed(() => {
    if (!orderedRounds.value.length) {
      return null
    }

    if (!currentRound.value) {
      return (
        orderedRounds.value.find(
          (round) => round.status !== 'completed',
        ) || orderedRounds.value[0]
      )
    }

    const currentIndex =
      orderedRounds.value.findIndex(
        (round) =>
          Number(round.id) ===
          Number(currentRound.value.id),
      )

    if (currentIndex === -1) {
      return orderedRounds.value[0]
    }

    return orderedRounds.value[currentIndex + 1] || null
  })

  async function getResponseData(
    response,
    fallbackMessage,
  ) {
    const responseText = await response.text()

    let data = null

    if (responseText) {
      try {
        data = JSON.parse(responseText)
      } catch {
        throw new Error(
          `${fallbackMessage} The server returned an invalid response.`,
        )
      }
    }

    if (!response.ok) {
      throw new Error(
        data?.error || fallbackMessage,
      )
    }

    return data
  }

  async function loadQuizContent() {
    isContentLoading.value = true
    contentError.value = ''

    try {
      const [roundsResponse, questionsResponse] =
        await Promise.all([
          fetch('/api/rounds?active=true', {
            headers: {
              Accept: 'application/json',
            },
          }),

          fetch('/api/questions?active=true', {
            headers: {
              Accept: 'application/json',
            },
          }),
        ])

      const [roundData, questionData] =
        await Promise.all([
          getResponseData(
            roundsResponse,
            'Unable to load rounds.',
          ),

          getResponseData(
            questionsResponse,
            'Unable to load questions.',
          ),
        ])

      const existingStatuses = new Map(
        rounds.value.map((round) => [
          Number(round.id),
          round.status,
        ]),
      )

      rounds.value = (
        Array.isArray(roundData)
          ? roundData
          : []
      ).map((round) => {
        const normalisedRound =
          normaliseRound(round)

        return {
          ...normalisedRound,
          status:
            existingStatuses.get(
              normalisedRound.id,
            ) || 'locked',
        }
      })

      questions.value = (
        Array.isArray(questionData)
          ? questionData
          : []
      ).map(normaliseQuestion)

      restoreRoundStatuses()

      return {
        rounds: rounds.value,
        questions: questions.value,
      }
    } catch (error) {
      console.error(
        'Failed to load quiz content:',
        error,
      )

      contentError.value =
        error.message ||
        'Unable to load quiz content.'

      return {
        rounds: [],
        questions: [],
        error: contentError.value,
      }
    } finally {
      isContentLoading.value = false
    }
  }

  function restoreRoundStatuses() {
    rounds.value = rounds.value.map((round) => {
      if (
        Number(round.id) ===
        Number(activeRoundId.value)
      ) {
        return {
          ...round,
          status:
            gameState.value === 'waiting'
              ? round.status
              : 'live',
        }
      }

      return round
    })
  }

  async function startRound(roundId) {
    const parsedRoundId = Number(roundId)

    const roundExists = rounds.value.some(
      (round) =>
        Number(round.id) === parsedRoundId,
    )

    if (!roundExists) {
      return {
        success: false,
        error: 'Round not found.',
      }
    }

    const previousRoundId =
      activeRoundId.value

    rounds.value = rounds.value.map((round) => {
      if (
        previousRoundId &&
        Number(round.id) ===
          Number(previousRoundId)
      ) {
        return {
          ...round,
          status: 'completed',
        }
      }

      if (
        Number(round.id) === parsedRoundId
      ) {
        return {
          ...round,
          status: 'live',
        }
      }

      return round
    })

    activeRoundId.value = parsedRoundId
    activeQuestionId.value = null
    gameState.value = 'roundIntro'

    return saveGameState()
  }

  async function startQuestion(questionId) {
    const parsedQuestionId =
      Number(questionId)

    const questionExists =
      questions.value.some(
        (question) =>
          Number(question.id) ===
          parsedQuestionId,
      )

    if (!questionExists) {
      return {
        success: false,
        error: 'Question not found.',
      }
    }

    activeQuestionId.value =
      parsedQuestionId
    gameState.value = 'question'

    return saveGameState()
  }

  async function submitAnswer({
    userId,
    answer,
  }) {
    if (
      !activeRoundId.value ||
      !activeQuestionId.value
    ) {
      return {
        success: false,
        error:
          'There is no active question.',
      }
    }

    try {
      const response = await fetch(
        '/api/answers',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            userId,
            roundId: activeRoundId.value,
            questionId:
              activeQuestionId.value,
            answer,
          }),
        },
      )

      const data = await getResponseData(
        response,
        'Unable to submit answer.',
      )

      const existingIndex =
        answers.value.findIndex(
          (item) =>
            Number(item.id) ===
            Number(data.id),
        )

      if (existingIndex === -1) {
        answers.value.push(data)
      } else {
        answers.value.splice(
          existingIndex,
          1,
          data,
        )
      }

      return {
        success: true,
        answer: data,
      }
    } catch (error) {
      console.error(
        'Failed to submit answer:',
        error,
      )

      return {
        success: false,
        error:
          error.message ||
          'The answer could not be submitted.',
      }
    }
  }

  async function startNextQuestion() {
    if (!currentRound.value) {
      return {
        success: false,
        error: 'There is no active round.',
      }
    }

    if (!currentQuestion.value) {
      const firstQuestion =
        currentRoundQuestions.value[0]

      if (!firstQuestion) {
        return {
          success: false,
          error:
            'This round has no active questions.',
        }
      }

      return startQuestion(firstQuestion.id)
    }

    const currentIndex =
      currentRoundQuestions.value.findIndex(
        (question) =>
          Number(question.id) ===
          Number(currentQuestion.value.id),
      )

    const nextQuestion =
      currentRoundQuestions.value[
        currentIndex + 1
      ]

    if (nextQuestion) {
      return startQuestion(nextQuestion.id)
    }

    return endRound()
  }

  async function completeRound() {
    if (!currentRound.value) {
      return {
        success: false,
        error: 'There is no active round.',
      }
    }

    const completedRoundId =
      currentRound.value.id

    rounds.value = rounds.value.map(
      (round) => ({
        ...round,

        status:
          Number(round.id) ===
          Number(completedRoundId)
            ? 'completed'
            : round.status,
      }),
    )

    activeRoundId.value = null
    activeQuestionId.value = null
    gameState.value = 'waiting'

    return saveGameState()
  }

  async function markAnswer(
    answerId,
    isCorrect,
  ) {
    const answer = answers.value.find(
      (item) =>
        Number(item.id) ===
        Number(answerId),
    )

    if (!answer) {
      return {
        success: false,
        error: 'Answer not found.',
      }
    }

    const question =
      questions.value.find(
        (item) =>
          Number(item.id) ===
          Number(answer.questionId),
      )

    const pointsAwarded = isCorrect
      ? Number(question?.points || 1)
      : 0

    try {
      const response = await fetch(
        '/api/answers',
        {
          method: 'PATCH',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            answerId,
            isCorrect,
            pointsAwarded,
          }),
        },
      )

      const data = await getResponseData(
        response,
        'Unable to mark answer.',
      )

      const answerIndex =
        answers.value.findIndex(
          (item) =>
            Number(item.id) ===
            Number(answerId),
        )

      if (answerIndex !== -1) {
        answers.value.splice(
          answerIndex,
          1,
          data,
        )
      }

      return {
        success: true,
        answer: data,
      }
    } catch (error) {
      console.error(
        'Failed to mark answer:',
        error,
      )

      return {
        success: false,
        error: error.message,
      }
    }
  }

  /*
   * Compatibility actions.
   *
   * The admin editor now uses roundsStore directly,
   * but these remain available in case another older
   * component still calls gameStore.addRound etc.
   */

  async function addRound(roundData) {
    try {
      const response = await fetch(
        '/api/rounds',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            name:
              roundData.name ||
              roundData.pubName,
            location:
              roundData.location || '',
            description:
              roundData.description || '',
            imageUrl:
              roundData.imageUrl ||
              roundData.image ||
              '',
            isActive:
              roundData.isActive ?? true,
          }),
        },
      )

      const createdRound =
        await getResponseData(
          response,
          'Unable to add round.',
        )

      await loadQuizContent()

      return {
        success: true,
        round: normaliseRound(
          createdRound,
        ),
      }
    } catch (error) {
      console.error(
        'Failed to add round:',
        error,
      )

      return {
        success: false,
        error: error.message,
      }
    }
  }

  async function updateRound(
    roundId,
    roundData,
  ) {
    try {
      const response = await fetch(
        '/api/rounds',
        {
          method: 'PATCH',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            id: roundId,
            ...roundData,

            name:
              roundData.name ||
              roundData.pubName,
          }),
        },
      )

      const updatedRound =
        await getResponseData(
          response,
          'Unable to update round.',
        )

      await loadQuizContent()

      return {
        success: true,
        round: normaliseRound(
          updatedRound,
        ),
      }
    } catch (error) {
      console.error(
        'Failed to update round:',
        error,
      )

      return {
        success: false,
        error: error.message,
      }
    }
  }

  async function deleteRound(roundId) {
    try {
      const response = await fetch(
        '/api/rounds',
        {
          method: 'DELETE',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            id: roundId,
          }),
        },
      )

      await getResponseData(
        response,
        'Unable to delete round.',
      )

      await loadQuizContent()

      return {
        success: true,
      }
    } catch (error) {
      console.error(
        'Failed to delete round:',
        error,
      )

      return {
        success: false,
        error: error.message,
      }
    }
  }

  async function addQuestion(questionData) {
    try {
      const typeMap = {
        'long-text': 'long_text',
        'multiple-choice':
          'multiple_choice',
      }

      const response = await fetch(
        '/api/questions',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            roundId:
              questionData.roundId,
            questionText:
              questionData.questionText ||
              questionData.text,
            questionType:
              typeMap[
                questionData.questionType ||
                  questionData.type
              ] ||
              questionData.questionType ||
              questionData.type ||
              'text',
            correctAnswer:
              questionData.correctAnswer ||
              '',
            options:
              questionData.options || [],
            imageUrl:
              questionData.imageUrl ||
              questionData.image ||
              '',
            points: Number(
              questionData.points || 1,
            ),
            isActive:
              questionData.isActive ?? true,
          }),
        },
      )

      const createdQuestion =
        await getResponseData(
          response,
          'Unable to add question.',
        )

      await loadQuizContent()

      return {
        success: true,
        question: normaliseQuestion(
          createdQuestion,
        ),
      }
    } catch (error) {
      console.error(
        'Failed to add question:',
        error,
      )

      return {
        success: false,
        error: error.message,
      }
    }
  }

  async function updateQuestion(
    questionId,
    questionData,
  ) {
    try {
      const typeMap = {
        'long-text': 'long_text',
        'multiple-choice':
          'multiple_choice',
      }

      const suppliedType =
        questionData.questionType ||
        questionData.type

      const response = await fetch(
        '/api/questions',
        {
          method: 'PATCH',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            id: questionId,
            ...questionData,

            questionText:
              questionData.questionText ||
              questionData.text,

            questionType:
              suppliedType !== undefined
                ? typeMap[suppliedType] ||
                  suppliedType
                : undefined,

            imageUrl:
              questionData.imageUrl ??
              questionData.image,
          }),
        },
      )

      const updatedQuestion =
        await getResponseData(
          response,
          'Unable to update question.',
        )

      await loadQuizContent()

      return {
        success: true,
        question: normaliseQuestion(
          updatedQuestion,
        ),
      }
    } catch (error) {
      console.error(
        'Failed to update question:',
        error,
      )

      return {
        success: false,
        error: error.message,
      }
    }
  }

  async function deleteQuestion(questionId) {
    try {
      const response = await fetch(
        '/api/questions',
        {
          method: 'DELETE',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            id: questionId,
          }),
        },
      )

      await getResponseData(
        response,
        'Unable to delete question.',
      )

      await loadQuizContent()

      return {
        success: true,
      }
    } catch (error) {
      console.error(
        'Failed to delete question:',
        error,
      )

      return {
        success: false,
        error: error.message,
      }
    }
  }

  async function loadGameState() {
    try {
      /*
       * Content is loaded here so every existing screen
       * that already calls loadGameState also receives
       * the current D1 rounds and questions.
       */
      await loadQuizContent()

      const response = await fetch(
        '/api/game-state',
        {
          headers: {
            Accept: 'application/json',
          },
        },
      )

      const state = await getResponseData(
        response,
        'Could not load game state.',
      )

      gameState.value =
        state.status || 'waiting'

      activeRoundId.value =
        state.activeRoundId !== null &&
        state.activeRoundId !== undefined
          ? Number(state.activeRoundId)
          : null

      activeQuestionId.value =
        state.activeQuestionId !== null &&
        state.activeQuestionId !== undefined
          ? Number(state.activeQuestionId)
          : null

      restoreRoundStatuses()

      return {
        success: true,
        state,
      }
    } catch (error) {
      console.error(
        'Failed to load game state:',
        error,
      )

      return {
        success: false,
        error: error.message,
      }
    }
  }

  async function saveGameState() {
    try {
      const response = await fetch(
        '/api/game-state',
        {
          method: 'PUT',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            status: gameState.value,
            activeRoundId:
              activeRoundId.value,
            activeQuestionId:
              activeQuestionId.value,
          }),
        },
      )

      const state = await getResponseData(
        response,
        'Could not save game state.',
      )

      return {
        success: true,
        state,
      }
    } catch (error) {
      console.error(
        'Failed to save game state:',
        error,
      )

      return {
        success: false,
        error: error.message,
      }
    }
  }

  async function loadAnswers(
    filters = {},
  ) {
    try {
      const params =
        new URLSearchParams()

      if (filters.questionId) {
        params.set(
          'questionId',
          filters.questionId,
        )
      }

      if (filters.roundId) {
        params.set(
          'roundId',
          filters.roundId,
        )
      }

      if (filters.userId) {
        params.set(
          'userId',
          filters.userId,
        )
      }

      const query = params.toString()

      const url = query
        ? `/api/answers?${query}`
        : '/api/answers'

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      })

      const data = await getResponseData(
        response,
        'Could not load answers.',
      )

      answers.value = Array.isArray(data)
        ? data
        : []

      return answers.value
    } catch (error) {
      console.error(
        'Failed to load answers:',
        error,
      )

      return []
    }
  }

  async function endRound() {
    if (!currentRound.value) {
      return {
        success: false,
        error: 'There is no active round.',
      }
    }

    activeQuestionId.value = null
    gameState.value = 'roundComplete'

    return saveGameState()
  }

  async function endQuest() {
    activeRoundId.value = null
    activeQuestionId.value = null
    gameState.value = 'questComplete'

    return saveGameState()
  }

  async function showLeaderboard() {
    gameState.value = 'leaderboard'

    return saveGameState()
  }

  async function hideLeaderboard() {
    gameState.value = 'roundComplete'

    return saveGameState()
  }

  return {
    rounds,
    questions,
    answers,

    activeRoundId,
    activeQuestionId,
    gameState,

    isContentLoading,
    contentError,

    orderedRounds,
    currentRound,
    currentQuestion,
    currentRoundQuestions,
    nextRound,

    loadQuizContent,
    loadGameState,
    saveGameState,
    loadAnswers,

    startRound,
    startQuestion,
    startNextQuestion,
    submitAnswer,
    markAnswer,
    completeRound,
    endRound,
    endQuest,
    showLeaderboard,
    hideLeaderboard,

    addRound,
    updateRound,
    deleteRound,
    addQuestion,
    updateQuestion,
    deleteQuestion,
  }
})