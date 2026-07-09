import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { rounds as seedRounds } from '@/data/rounds'
import { questions as seedQuestions } from '@/data/questions'

export const useQuestStore = defineStore('quest', () => {
  const rounds = ref(seedRounds)
  const questions = ref(seedQuestions)

  function getRoundQuestions(roundId) {
    return questions.value
      .filter((question) => question.roundId === roundId)
      .sort((a, b) => a.order - b.order)
  }

  function getQuestion(questionId) {
    return questions.value.find((question) => question.id === questionId) || null
  }

  function getRound(roundId) {
    return rounds.value.find((round) => round.id === roundId) || null
  }

  const nextRound = computed(() => {
    return rounds.value.find((round) => round.status !== 'completed') || null
  })

  return {
    rounds,
    questions,
    nextRound,
    getRoundQuestions,
    getQuestion,
    getRound,
  }
})