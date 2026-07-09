import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useQuestStore } from '@/stores/questStore'

export const useLiveGameStore = defineStore('liveGame', () => {
  const questStore = useQuestStore()

  const activeRoundId = ref(null)
  const activeQuestionId = ref(null)

  const gameState = ref('waiting')
  // waiting | roundIntro | question | submitted | roundComplete | questComplete

  const currentRound = computed(() => {
    return questStore.getRound(activeRoundId.value)
  })

  const currentQuestion = computed(() => {
    return questStore.getQuestion(activeQuestionId.value)
  })

  const currentRoundQuestions = computed(() => {
    if (!activeRoundId.value) return []
    return questStore.getRoundQuestions(activeRoundId.value)
  })

  function startRound(roundId) {
    activeRoundId.value = roundId
    activeQuestionId.value = null
    gameState.value = 'roundIntro'

    questStore.rounds = questStore.rounds.map((round) => ({
      ...round,
      status: round.id === roundId ? 'live' : round.status,
    }))
  }

  function startQuestion(questionId) {
    activeQuestionId.value = questionId
    gameState.value = 'question'
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

  function endRound() {
    if (!currentRound.value) return

    questStore.rounds = questStore.rounds.map((round) => ({
      ...round,
      status: round.id === currentRound.value.id ? 'completed' : round.status,
    }))

    activeRoundId.value = null
    activeQuestionId.value = null
    gameState.value = 'waiting'
  }

  function endQuest() {
    activeRoundId.value = null
    activeQuestionId.value = null
    gameState.value = 'questComplete'
  }

  return {
    activeRoundId,
    activeQuestionId,
    gameState,
    currentRound,
    currentQuestion,
    currentRoundQuestions,
    startRound,
    startQuestion,
    startNextQuestion,
    endRound,
    endQuest,
  }
})