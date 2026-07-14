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
import FinalResultsScreen from '@/components/player/FinalResultsScreen.vue'
import PlayerLeaderboardScreen from '@/components/player/PlayerLeaderboardScreen.vue'

import { useAuthStore } from '@/stores/authStore'
import { useGameStore } from '@/stores/gameStore'

const authStore = useAuthStore()
const gameStore = useGameStore()

const submittedQuestionId = ref(null)
const submittingAnswer = ref(false)
const submissionError = ref('')

const hasSubmittedCurrentQuestion = computed(() => {
  return Boolean(
    gameStore.currentQuestion &&
    Number(submittedQuestionId.value) ===
      Number(gameStore.currentQuestion.id),
  )
})

async function checkExistingAnswer() {
  if (
    !gameStore.currentQuestion ||
    !authStore.user
  ) {
    submittedQuestionId.value = null
    return
  }

  try {
    const params = new URLSearchParams({
      questionId: String(
        gameStore.currentQuestion.id,
      ),
      userId: String(authStore.user.id),
    })

    const response = await fetch(
      `/api/answers?${params.toString()}`,
    )

    if (!response.ok) {
      throw new Error(
        'Unable to check submitted answer.',
      )
    }

    const answers = await response.json()

    submittedQuestionId.value =
      Array.isArray(answers) &&
      answers.length > 0
        ? gameStore.currentQuestion.id
        : null
  } catch (error) {
    console.error(
      'Failed to check existing answer:',
      error,
    )
  }
}

async function submitAnswer(answer) {
  if (submittingAnswer.value) {
    return
  }

  submissionError.value = ''
  submittingAnswer.value = true

  try {
    const questionId =
      gameStore.currentQuestion?.id

    const result =
      await gameStore.submitAnswer({
        userId: authStore.user.id,
        answer,
      })

    if (!result?.success) {
      submissionError.value =
        result?.error ||
        'Your answer could not be submitted.'

      return
    }

    submittedQuestionId.value =
      questionId
  } finally {
    submittingAnswer.value = false
  }
}

let gameStateInterval

onMounted(async () => {
  await gameStore.loadGameState()
  await checkExistingAnswer()

  gameStateInterval =
    window.setInterval(async () => {
      await gameStore.loadGameState()
    }, 2000)
})

onUnmounted(() => {
  window.clearInterval(
    gameStateInterval,
  )
})

watch(
  () => gameStore.activeQuestionId,
  async (
    newQuestionId,
    previousQuestionId,
  ) => {
    if (
      Number(newQuestionId) !==
      Number(previousQuestionId)
    ) {
      submittedQuestionId.value = null
      submissionError.value = ''

      await checkExistingAnswer()
    }
  },
)
</script>

<template>
  <PlayerShell>
    <WaitingScreen
      v-if="
        gameStore.gameState === 'waiting'
      "
      :next-round="gameStore.nextRound"
    />

    <RoundIntroCard
      v-else-if="
        gameStore.gameState ===
        'roundIntro'
      "
      :round="gameStore.currentRound"
      :questions-count="
        gameStore.currentRoundQuestions
          .length
      "
    />

    <LiveQuestionCard
      v-else-if="
        gameStore.gameState ===
          'question' &&
        !hasSubmittedCurrentQuestion
      "
      :question="
        gameStore.currentQuestion
      "
      :question-number="
        gameStore.currentRoundQuestions.findIndex(
          (question) =>
            Number(question.id) ===
            Number(
              gameStore.currentQuestion?.id,
            ),
        ) + 1
      "
      :total-questions="
        gameStore.currentRoundQuestions
          .length
      "
      :submitting="submittingAnswer"
      :error="submissionError"
      @submit="submitAnswer"
    />

    <SubmittedScreen
      v-else-if="
        gameStore.gameState ===
          'question' &&
        hasSubmittedCurrentQuestion
      "
    />

    <SubmittedScreen
      v-else-if="
        gameStore.gameState ===
        'submitted'
      "
    />

    <RoundCompleteScreen
      v-else-if="
        gameStore.gameState ===
        'roundComplete'
      "
    />

    <PlayerLeaderboardScreen
      v-else-if="
        gameStore.gameState === 'leaderboard'
      "
    />


    <QuestCompleteScreen
      v-else-if="
        gameStore.gameState ===
        'questComplete'
      "
    />

    <FinalResultsScreen
      v-else-if="
        gameStore.gameState === 'finalResults' ||
        gameStore.gameState === 'finalLeaderboard'
      "
      :show-results="
        gameStore.gameState === 'finalResults'
      "
      :show-leaderboard="
        gameStore.gameState === 'finalLeaderboard'
      "
    />

    <WaitingScreen
      v-else
      :next-round="gameStore.nextRound"
    />
  </PlayerShell>
</template>