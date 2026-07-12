import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { rounds as seedRounds } from '@/data/rounds'
import { questions as seedQuestions } from '@/data/questions'

export const useGameStore = defineStore('game', () => {
  const rounds = ref(seedRounds)
  const questions = ref(seedQuestions)
  const answers = ref([])

  const activeRoundId = ref(null)
  const activeQuestionId = ref(null)

  const gameState = ref('waiting')
  // waiting | roundIntro | question | submitted | roundComplete | questComplete

  const currentRound = computed(() => {
    return rounds.value.find((round) => round.id === activeRoundId.value) || null
  })

  const currentQuestion = computed(() => {
    return questions.value.find((question) => question.id === activeQuestionId.value) || null
  })

  const currentRoundQuestions = computed(() => {
    if (!currentRound.value) return []

    return questions.value
      .filter((question) => question.roundId === currentRound.value.id)
      .sort((a, b) => a.order - b.order)
  })

  const nextRound = computed(() => {
    return rounds.value.find((round) => round.status !== 'completed') || null
  })

  async function startRound(roundId) {
    activeRoundId.value = roundId
    activeQuestionId.value = null
    gameState.value = 'roundIntro'
  
    rounds.value = rounds.value.map((round) => ({
      ...round,
      status: round.id === roundId ? 'live' : round.status,
    }))
  
    await saveGameState()
  }

  async function startQuestion(questionId) {
    activeQuestionId.value = questionId
    gameState.value = 'question'
  
    await saveGameState()
  }

  async function submitAnswer({ userId, answer }) {
    if (!activeRoundId.value || !activeQuestionId.value) {
      return {
        success: false,
        error: 'There is no active question.',
      }
    }
  
    try {
      const response = await fetch('/api/answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          roundId: activeRoundId.value,
          questionId: activeQuestionId.value,
          answer,
        }),
      })
  
      const data = await response.json()
  
      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Unable to submit answer.',
        }
      }
  
      const existingIndex = answers.value.findIndex(
        (item) => item.id === data.id,
      )
  
      if (existingIndex === -1) {
        answers.value.push(data)
      }
  
      return {
        success: true,
        answer: data,
      }
    } catch (error) {
      console.error('Failed to submit answer:', error)
  
      return {
        success: false,
        error: 'The answer could not be submitted. Please try again.',
      }
    }
  }

  function startNextQuestion() {
    if (!currentQuestion.value) {
      const firstQuestion = currentRoundQuestions.value[0]
      if (firstQuestion) startQuestion(firstQuestion.id)
      return
    }

    const currentIndex = currentRoundQuestions.value.findIndex(
      (question) => question.id === currentQuestion.value.id,
    )

    const nextQuestion = currentRoundQuestions.value[currentIndex + 1]

    if (nextQuestion) {
      startQuestion(nextQuestion.id)
      return
    }

    gameState.value = 'roundComplete'
  }

  async function completeRound() {
    if (!currentRound.value) return
  
    const completedRoundId = currentRound.value.id
  
    rounds.value = rounds.value.map((round) => ({
      ...round,
      status: round.id === completedRoundId
        ? 'completed'
        : round.status,
    }))
  
    activeRoundId.value = null
    activeQuestionId.value = null
    gameState.value = 'waiting'
  
    await saveGameState()
  }

  async function markAnswer(answerId, isCorrect) {
    const answer = answers.value.find((item) => item.id === answerId)
  
    if (!answer) {
      return {
        success: false,
        error: 'Answer not found.',
      }
    }
  
    const question = questions.value.find(
      (item) => item.id === answer.questionId,
    )
  
    const pointsAwarded = isCorrect
      ? Number(question?.points || 1)
      : 0
  
    try {
      const response = await fetch('/api/answers', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answerId,
          isCorrect,
          pointsAwarded,
        }),
      })
  
      const data = await response.json()
  
      if (!response.ok) {
        throw new Error(data.error || 'Unable to mark answer.')
      }
  
      const answerIndex = answers.value.findIndex(
        (item) => item.id === answerId,
      )
  
      if (answerIndex !== -1) {
        answers.value[answerIndex] = data
      }
  
      return {
        success: true,
        answer: data,
      }
    } catch (error) {
      console.error('Failed to mark answer:', error)
  
      return {
        success: false,
        error: error.message,
      }
    }
  }

  function addRound(roundData) {
    rounds.value.push({
      id: Date.now(),
      title: roundData.title,
      pubName: roundData.pubName,
      status: 'locked',
    })
  }
  
  function updateRound(roundId, roundData) {
    rounds.value = rounds.value.map((round) => {
      if (round.id !== roundId) return round
  
      return {
        ...round,
        ...roundData,
      }
    })
  }
  
  function deleteRound(roundId) {
    rounds.value = rounds.value.filter((round) => round.id !== roundId)
    questions.value = questions.value.filter((question) => question.roundId !== roundId)
  }
  
  function addQuestion(questionData) {
    questions.value.push({
      id: Date.now(),
      roundId: questionData.roundId,
      order: questionData.order,
      text: questionData.text,
      type: questionData.type,
      points: Number(questionData.points || 1),
      correctAnswer: questionData.correctAnswer,
      image: questionData.image || '',
      options: questionData.options || [],
    })
  }
  
  function updateQuestion(questionId, questionData) {
    questions.value = questions.value.map((question) => {
      if (question.id !== questionId) return question
  
      return {
        ...question,
        ...questionData,
        points: Number(questionData.points || 1),
      }
    })
  }
  
  function deleteQuestion(questionId) {
    questions.value = questions.value.filter((question) => question.id !== questionId)
  }

  async function loadGameState() {
    try {
      const response = await fetch('/api/game-state')
  
      if (!response.ok) {
        throw new Error('Could not load game state')
      }
  
      const state = await response.json()
  
      gameState.value = state.status
      activeRoundId.value = state.activeRoundId
      activeQuestionId.value = state.activeQuestionId
    } catch (error) {
      console.error('Failed to load game state:', error)
    }
  }
  
  async function saveGameState() {
    try {
      const response = await fetch('/api/game-state', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: gameState.value,
          activeRoundId: activeRoundId.value,
          activeQuestionId: activeQuestionId.value,
        }),
      })
  
      if (!response.ok) {
        throw new Error('Could not save game state')
      }
    } catch (error) {
      console.error('Failed to save game state:', error)
    }
  }

  async function loadAnswers(filters = {}) {
    try {
      const params = new URLSearchParams()
  
      if (filters.questionId) {
        params.set('questionId', filters.questionId)
      }
  
      if (filters.roundId) {
        params.set('roundId', filters.roundId)
      }
  
      if (filters.userId) {
        params.set('userId', filters.userId)
      }
  
      const query = params.toString()
      const url = query ? `/api/answers?${query}` : '/api/answers'
  
      const response = await fetch(url)
  
      if (!response.ok) {
        throw new Error('Could not load answers.')
      }
  
      answers.value = await response.json()
  
      return answers.value
    } catch (error) {
      console.error('Failed to load answers:', error)
      return []
    }
  }

  async function endRound() {
    if (!currentRound.value) return
  
    activeQuestionId.value = null
    gameState.value = 'roundComplete'
  
    await saveGameState()
  }

  return {
    rounds,
    questions,
    answers,
    activeRoundId,
    activeQuestionId,
    gameState,
    currentRound,
    currentQuestion,
    currentRoundQuestions,
    nextRound,
    startRound,
    startQuestion,
    submitAnswer,
    startNextQuestion,
    completeRound,
    markAnswer,
    addRound,
    updateRound,
    deleteRound,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    loadGameState,
    saveGameState,
    loadAnswers,
    endRound,
  }

  
})