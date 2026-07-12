<script setup>
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from 'vue'

import PlayerShell from '@/components/layout/PlayerShell.vue'
import WaitingScreen from '@/components/player/WaitingScreen.vue'
import RoundIntroCard from '@/components/player/RoundIntroCard.vue'
import LiveQuestionCard from '@/components/player/LiveQuestionCard.vue'
import SubmittedScreen from '@/components/player/SubmittedScreen.vue'
import RoundCompleteScreen from '@/components/player/RoundCompleteScreen.vue'
import QuestCompleteScreen from '@/components/player/QuestCompleteScreen.vue'

import { useAuthStore } from '@/stores/authStore'
import { useGameStore } from '@/stores/gameStore'

const authStore = useAuthStore()
const gameStore = useGameStore()

const submittedQuestionId = ref(null)
const submittingAnswer = ref(false)
const submissionError = ref('')

const hasSubmittedCurrentQuestion = computed(() => {
  return (
    gameStore.currentQuestion &&
    submittedQuestionId.value === gameStore.currentQuestion.id
  )
})

async function checkExistingAnswer() {
  if (!gameStore.currentQuestion || !authStore.user) {
    submittedQuestionId.value = null
    return
  }

  try {
    const params = new URLSearchParams({
      questionId: gameStore.currentQuestion.id,
      userId: authStore.user.id,
    })

    const response = await fetch(`/api/answers?${params.toString()}`)

    if (!response.ok) {
      throw new Error('Unable to check submitted answer.')
    }

    const answers = await response.json()

    submittedQuestionId.value = answers.length
      ? gameStore.currentQuestion.id
      : null
  } catch (error) {
    console.error('Failed to check existing answer:', error)
  }
}

async function submitAnswer(answer) {
  if (submittingAnswer.value) return

  submissionError.value = ''
  submittingAnswer.value = true

  try {
    const questionId = gameStore.currentQuestion?.id

    const result = await gameStore.submitAnswer({
      userId: authStore.user.id,
      answer,
    })

    if (!result?.success) {
      submissionError.value =
        result?.error || 'Your answer could not be submitted.'

      return
    }

    submittedQuestionId.value = questionId
  } finally {
    submittingAnswer.value = false
  }
}

let gameStateInterval

onMounted(async () => {
  await gameStore.loadGameState()
  await checkExistingAnswer()

  gameStateInterval = window.setInterval(async () => {
    await gameStore.loadGameState()
  }, 2000)
})

onUnmounted(() => {
  window.clearInterval(gameStateInterval)
})

watch(
  () => gameStore.activeQuestionId,
  async (newQuestionId, previousQuestionId) => {
    if (newQuestionId !== previousQuestionId) {
      submittedQuestionId.value = null
      await checkExistingAnswer()
    }
  },
)
</script>

<template>
  <PlayerShell>
    <WaitingScreen
      v-if="gameStore.gameState === 'waiting'"
      :next-round="gameStore.nextRound"
    />

    <RoundIntroCard
      v-else-if="gameStore.gameState === 'roundIntro'"
      :round="gameStore.currentRound"
      :questions-count="gameStore.currentRoundQuestions.length"
    />

    <LiveQuestionCard
      v-else-if="
        gameStore.gameState === 'question' &&
        !hasSubmittedCurrentQuestion
      "
      :question="gameStore.currentQuestion"
      :question-number="
        gameStore.currentRoundQuestions.findIndex(
          (question) => question.id === gameStore.currentQuestion.id,
        ) + 1
      "
      :total-questions="gameStore.currentRoundQuestions.length"
      :submitting="submittingAnswer"
      :error="submissionError"
      @submit="submitAnswer"
    />

    <SubmittedScreen
      v-else-if="
        gameStore.gameState === 'question' &&
        hasSubmittedCurrentQuestion
      "
    />

    <SubmittedScreen v-else-if="gameStore.gameState === 'submitted'" />
    <RoundCompleteScreen v-else-if="gameStore.gameState === 'roundComplete'" />
  
    <QuestCompleteScreen v-else-if="gameStore.gameState === 'questComplete'" />

    <div class="dev-controls">
      <button @click="gameStore.startRound(1)">Start Round</button>
      <button @click="gameStore.startNextQuestion()">Next Question</button>
      <button @click="gameStore.completeRound()">Complete Round</button>
    </div>
    
  </PlayerShell>


</template>

<style scoped>
.dev-controls {
  position: fixed;
  z-index: 99;
  right: 12px;
  bottom: 12px;
  display: flex;
  gap: 8px;
}

.dev-controls button {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card);
  color: var(--cream);
  padding: 8px;
  font-size: 12px;
}


</style>