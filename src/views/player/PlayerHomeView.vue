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
import TieBreakerQuestionScreen from '@/components/player/TieBreakerQuestionScreen.vue'
import TieBreakerWaitingScreen from '@/components/player/TieBreakerWaitingScreen.vue'

import { useAuthStore } from '@/stores/authStore'
import { useGameStore } from '@/stores/gameStore'

const authStore = useAuthStore()
const gameStore = useGameStore()

const submittedQuestionId = ref(null)
const submittingAnswer = ref(false)
const submissionError = ref('')

const submittingTieBreaker = ref(false)
const tieBreakerSubmissionError = ref('')

let gameStateInterval
let refreshingPlayerState = false

const hasSubmittedCurrentQuestion = computed(() => {
  return Boolean(
    gameStore.currentQuestion &&
    Number(submittedQuestionId.value) ===
      Number(gameStore.currentQuestion.id),
  )
})

const currentTieBreakerParticipant = computed(() => {
  if (!authStore.user) {
    return null
  }

  return (
    gameStore.tieBreakerSession
      ?.currentParticipant ||
    gameStore.getTieBreakerParticipant(
      authStore.user.id,
    )
  )
})

const isTieBreakerParticipant = computed(() => {
  return Boolean(
    currentTieBreakerParticipant.value ||
    gameStore.tieBreakerSession
      ?.isParticipant,
  )
})

const hasSubmittedTieBreaker = computed(() => {
  return Boolean(
    currentTieBreakerParticipant.value
      ?.hasSubmitted,
  )
})

const tieBreakerReady = computed(() => {
  return Boolean(
    gameStore.gameState ===
      'tieBreaker' &&
    gameStore.tieBreakerQuestion &&
    gameStore.tieBreakerSession,
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

      userId: String(
        authStore.user.id,
      ),
    })

    const response = await fetch(
      `/api/answers?${params.toString()}`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
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

async function loadPlayerTieBreaker() {
  if (
    gameStore.gameState !==
      'tieBreaker' ||
    !gameStore
      .activeTieBreakerSessionId ||
    !authStore.user
  ) {
    return
  }

  await gameStore.loadTieBreakerSession(
    authStore.user.id,
  )
}

async function refreshPlayerState() {
  if (refreshingPlayerState) {
    return
  }

  refreshingPlayerState = true

  try {
    const result =
      await gameStore.loadGameState()

    if (!result?.success) {
      return
    }

    if (
      gameStore.gameState ===
        'tieBreaker' &&
      gameStore
        .activeTieBreakerSessionId &&
      authStore.user
    ) {
      await gameStore.loadTieBreakerSession(
        authStore.user.id,
      )
    }
  } catch (error) {
    console.error(
      'Failed to refresh player state:',
      error,
    )
  } finally {
    refreshingPlayerState = false
  }
}

async function submitAnswer(answer) {
  if (
    submittingAnswer.value ||
    !authStore.user
  ) {
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

async function submitTieBreakerAnswer(
  answer,
) {
  if (
    submittingTieBreaker.value ||
    !authStore.user
  ) {
    return
  }

  tieBreakerSubmissionError.value = ''
  submittingTieBreaker.value = true

  try {
    const result =
      await gameStore
        .submitTieBreakerAnswer({
          userId: authStore.user.id,
          answer,
        })

    if (!result?.success) {
      tieBreakerSubmissionError.value =
        result?.error ||
        'Your tie-breaker answer could not be submitted.'

      return
    }

    await gameStore.loadTieBreakerSession(
      authStore.user.id,
    )
  } finally {
    submittingTieBreaker.value = false
  }
}

function handleWindowFocus() {
  refreshPlayerState()
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    refreshPlayerState()
  }
}

onMounted(async () => {
  await refreshPlayerState()
  await checkExistingAnswer()

  gameStateInterval = window.setInterval(
    refreshPlayerState,
    1500,
  )

  window.addEventListener(
    'focus',
    handleWindowFocus,
  )

  document.addEventListener(
    'visibilitychange',
    handleVisibilityChange,
  )
})

onUnmounted(() => {
  window.clearInterval(
    gameStateInterval,
  )

  window.removeEventListener(
    'focus',
    handleWindowFocus,
  )

  document.removeEventListener(
    'visibilitychange',
    handleVisibilityChange,
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

watch(
  () =>
    gameStore
      .activeTieBreakerSessionId,
  async (
    newSessionId,
    previousSessionId,
  ) => {
    if (
      Number(newSessionId) !==
      Number(previousSessionId)
    ) {
      tieBreakerSubmissionError.value =
        ''

      await loadPlayerTieBreaker()
    }
  },
)

watch(
  () => gameStore.gameState,
  async (
    newState,
    previousState,
  ) => {
    if (
      newState === 'tieBreaker' &&
      previousState !== 'tieBreaker'
    ) {
      tieBreakerSubmissionError.value =
        ''

      await loadPlayerTieBreaker()
    }
  },
)
</script>

<template>
  <PlayerShell>
    <div
      v-if="
        gameStore.gameState ===
          'tieBreaker' &&
        gameStore.tieBreakerError
      "
      class="player-error"
    >
      {{ gameStore.tieBreakerError }}
    </div>

    <div
      v-if="
        gameStore.gameState ===
          'tieBreaker' &&
        gameStore.tieBreakerLoading &&
        !gameStore.tieBreakerSession
      "
      class="loading-state"
    >
      Loading tie-breaker...
    </div>

    <TieBreakerQuestionScreen
      v-else-if="
        tieBreakerReady &&
        isTieBreakerParticipant &&
        !hasSubmittedTieBreaker
      "
      :question="
        gameStore.tieBreakerQuestion
      "
      :participant="
        currentTieBreakerParticipant
      "
      :submitting="
        submittingTieBreaker
      "
      :error="
        tieBreakerSubmissionError
      "
      @submit="
        submitTieBreakerAnswer
      "
    />

    <TieBreakerWaitingScreen
      v-else-if="
        gameStore.gameState ===
        'tieBreaker'
      "
      :is-participant="
        isTieBreakerParticipant
      "
      :has-submitted="
        hasSubmittedTieBreaker
      "
    />

    <WaitingScreen
      v-else-if="
        gameStore.gameState ===
        'waiting'
      "
      :next-round="
        gameStore.nextRound
      "
    />

    <RoundIntroCard
      v-else-if="
        gameStore.gameState ===
        'roundIntro'
      "
      :round="
        gameStore.currentRound
      "
      :questions-count="
        gameStore
          .currentRoundQuestions.length
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
        gameStore
          .currentRoundQuestions
          .findIndex(
            (question) =>
              Number(question.id) ===
              Number(
                gameStore
                  .currentQuestion?.id,
              ),
          ) + 1
      "
      :total-questions="
        gameStore
          .currentRoundQuestions.length
      "
      :submitting="
        submittingAnswer
      "
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
        gameStore.gameState ===
        'leaderboard'
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
        gameStore.gameState ===
          'finalResults' ||
        gameStore.gameState ===
          'finalLeaderboard'
      "
      :show-results="
        gameStore.gameState ===
        'finalResults'
      "
      :show-leaderboard="
        gameStore.gameState ===
        'finalLeaderboard'
      "
    />

    <WaitingScreen
      v-else
      :next-round="
        gameStore.nextRound
      "
    />
  </PlayerShell>
</template>

<style scoped>
.loading-state,
.player-error {
  margin-top: 24px;
  border-radius: 14px;
  padding: 18px;
  text-align: center;
  font-weight: 700;
}

.loading-state {
  border: 1px solid var(--border);
  background: var(--bg-soft);
  color: var(--muted);
}

.player-error {
  border: 1px solid
    rgba(239, 68, 68, 0.4);
  background:
    rgba(239, 68, 68, 0.12);
  color: #fecaca;
}
</style>