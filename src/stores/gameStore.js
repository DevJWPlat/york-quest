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

  function startRound(roundId) {
    activeRoundId.value = roundId
    activeQuestionId.value = null
    gameState.value = 'roundIntro'

    rounds.value = rounds.value.map((round) => ({
      ...round,
      status: round.id === roundId ? 'live' : round.status,
    }))
  }

  function startQuestion(questionId) {
    activeQuestionId.value = questionId
    gameState.value = 'question'
  }

  function submitAnswer({ userId, answer }) {
    if (!currentRound.value || !currentQuestion.value) return

    answers.value.push({
      id: Date.now(),
      userId,
      roundId: currentRound.value.id,
      questionId: currentQuestion.value.id,
      answer,
      isCorrect: null,
      pointsAwarded: 0,
      submittedAt: new Date().toISOString(),
    })

    gameState.value = 'submitted'
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

  function completeRound() {
    if (!currentRound.value) return

    rounds.value = rounds.value.map((round) => ({
      ...round,
      status: round.id === currentRound.value.id ? 'completed' : round.status,
    }))

    activeRoundId.value = null
    activeQuestionId.value = null
    gameState.value = 'waiting'
  }

  function markAnswer(answerId, isCorrect) {
    const answer = answers.value.find((item) => item.id === answerId)
  
    if (!answer) return
  
    const question = questions.value.find((item) => item.id === answer.questionId)
  
    answer.isCorrect = isCorrect
    answer.pointsAwarded = isCorrect ? question.points : 0
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
  }

  
})