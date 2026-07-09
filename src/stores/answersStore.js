import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useLiveGameStore } from '@/stores/liveGameStore'
import { useQuestStore } from '@/stores/questStore'

export const useAnswersStore = defineStore('answers', () => {
  const answers = ref([])

  function submitAnswer({ userId, answer }) {
    const liveGameStore = useLiveGameStore()

    if (!liveGameStore.currentRound || !liveGameStore.currentQuestion) return

    answers.value.push({
      id: Date.now(),
      userId,
      roundId: liveGameStore.currentRound.id,
      questionId: liveGameStore.currentQuestion.id,
      answer,
      isCorrect: null,
      pointsAwarded: 0,
      submittedAt: new Date().toISOString(),
    })

    liveGameStore.gameState = 'submitted'
  }

  function markAnswer(answerId, isCorrect) {
    const questStore = useQuestStore()

    const answer = answers.value.find((item) => item.id === answerId)
    if (!answer) return

    const question = questStore.getQuestion(answer.questionId)

    answer.isCorrect = isCorrect
    answer.pointsAwarded = isCorrect ? question.points : 0
  }

  return {
    answers,
    submitAnswer,
    markAnswer,
  }
})