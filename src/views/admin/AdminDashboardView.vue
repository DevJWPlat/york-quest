<script setup>
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from 'vue'



import AdminShell from '@/components/layout/AdminShell.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppCard from '@/components/base/AppCard.vue'
import AppConfirmModal from '@/components/base/AppConfirmModal.vue'
import AdminMarkAnswersModal from '@/components/admin/AdminMarkAnswersModal.vue'
import AdminRoundResultsModal from '@/components/admin/AdminRoundResultsModal.vue'

import { useGameStore } from '@/stores/gameStore'
import { users } from '@/data/users'

const gameStore = useGameStore()
const showMarkAnswersModal = ref(false)
const showEndRoundWarning = ref(false)
const showUnmarkedWarning = ref(false)
const showRoundResultsModal = ref(false)
const showUnmarkedResultsWarning = ref(false)

const players = computed(() => {
  return users.filter((user) => user.role === 'player')
})

const currentQuestionNumber = computed(() => {
  if (!gameStore.currentQuestion) return null

  return (
    gameStore.currentRoundQuestions.findIndex(
      (question) => question.id === gameStore.currentQuestion.id,
    ) + 1
  )
})

const submittedAnswers = computed(() => {
  if (!gameStore.currentQuestion) return []

  return gameStore.answers.filter(
    (answer) => answer.questionId === gameStore.currentQuestion.id,
  )
})

const submittedPlayerIds = computed(() => {
  return submittedAnswers.value.map((answer) => answer.userId)
})

const submittedPlayers = computed(() => {
  return players.value.filter((player) =>
    submittedPlayerIds.value.includes(player.id),
  )
})

const waitingPlayers = computed(() => {
  return players.value.filter(
    (player) => !submittedPlayerIds.value.includes(player.id),
  )
})

const allAnswered = computed(() => {
  return Boolean(
    gameStore.currentQuestion &&
      players.value.length > 0 &&
      submittedPlayers.value.length === players.value.length,
  )
})

function startNextAvailableRound() {
  const nextRound = gameStore.rounds.find(
    (round) => round.status !== 'completed',
  )

  if (!nextRound) return

  gameStore.startRound(nextRound.id)
}

let answersInterval
let gameStateInterval
let loadingAnswers = false

async function refreshAnswers() {
  if (loadingAnswers) return

  if (!gameStore.currentQuestion) {
    gameStore.answers = []
    return
  }

  loadingAnswers = true

  try {
    await gameStore.loadAnswers({
      questionId: gameStore.currentQuestion.id,
    })
  } finally {
    loadingAnswers = false
  }
}

const showNextQuestionWarning = ref(false)

const waitingPlayerNames = computed(() => {
  return waitingPlayers.value.map((player) => player.name)
})

const waitingPlayersMessage = computed(() => {
  const names = waitingPlayerNames.value

  if (!names.length) {
    return ''
  }

  if (names.length === 1) {
    return `${names[0]} has not submitted an answer yet. Are you sure you want to continue?`
  }

  const lastName = names[names.length - 1]
  const otherNames = names.slice(0, -1).join(', ')

  return `${otherNames} and ${lastName} have not submitted answers yet. Are you sure you want to continue?`
})

const isLastQuestion = computed(() => {
  if (!gameStore.currentQuestion) return false

  const questions = gameStore.currentRoundQuestions
  const currentIndex = questions.findIndex(
    (question) => question.id === gameStore.currentQuestion.id,
  )

  return currentIndex === questions.length - 1
})

const currentRoundAnswers = computed(() => {
  if (!gameStore.currentRound) return []

  return gameStore.answers.filter(
    (answer) => answer.roundId === gameStore.currentRound.id,
  )
})

const unmarkedRoundAnswers = computed(() => {
  return currentRoundAnswers.value.filter(
    (answer) => answer.isCorrect === null,
  )
})

async function openRoundResults() {
  if (!gameStore.currentRound) return

  await gameStore.loadAnswers({
    roundId: gameStore.currentRound.id,
  })

  const unmarked = gameStore.answers.filter(
    (answer) =>
      Number(answer.roundId) === Number(gameStore.currentRound.id) &&
      answer.isCorrect === null,
  )

  if (unmarked.length > 0) {
    showMarkAnswersModal.value = true
    return
  }

  showRoundResultsModal.value = true
}

function openMarkingFromResultsWarning() {
  showUnmarkedResultsWarning.value = false
  showMarkAnswersModal.value = true
}

const canViewRoundResults = computed(() => {
  return (
    currentRoundAnswers.value.length > 0 &&
    unmarkedRoundAnswers.value.length === 0
  )
})

const currentQuestionAnswers = computed(() => {
  if (!gameStore.currentQuestion) return []

  return gameStore.answers.filter(
    (answer) => answer.questionId === gameStore.currentQuestion.id,
  )
})

const unmarkedAnswers = computed(() => {
  return currentQuestionAnswers.value.filter(
    (answer) => answer.isCorrect === null,
  )
})

function requestNextQuestion() {
  if (unmarkedAnswers.value.length > 0) {
    showMarkAnswersModal.value = true
    return
  }

  if (waitingPlayers.value.length > 0) {
    showNextQuestionWarning.value = true
    return
  }

  gameStore.startNextQuestion()
}

function confirmContinueWithUnmarked() {
  showUnmarkedWarning.value = false
  gameStore.startNextQuestion()
}

function confirmNextQuestion() {
  showNextQuestionWarning.value = false
  gameStore.startNextQuestion()
}

function requestEndRound() {
  showEndRoundWarning.value = true
}

async function confirmEndRound() {
  showEndRoundWarning.value = false
  await gameStore.endRound()
}

async function handleEndRoundFromResults() {
  showRoundResultsModal.value = false
  await gameStore.endRound()
}

onMounted(async () => {
  // Restore the active round, question and game state from D1
  await gameStore.loadGameState()

  // Load answers for the active question
  await refreshAnswers()

  // Keep the admin game state synced
  gameStateInterval = window.setInterval(() => {
    gameStore.loadGameState()
  }, 2000)

  // Keep submitted answers synced
  answersInterval = window.setInterval(() => {
    refreshAnswers()
  }, 2000)
})

onUnmounted(() => {
  window.clearInterval(gameStateInterval)
  window.clearInterval(answersInterval)
})


watch(
  () => gameStore.currentQuestion?.id,
  async () => {
    await refreshAnswers()
  },
)
</script>

<template>
  <AdminShell>
    <AppCard class="admin-card hero-card">
      <small>Current Game</small>

      <template v-if="gameStore.currentRound">
        <h2>{{ gameStore.currentRound.title }}</h2>
        <p>{{ gameStore.currentRound.pubName }}</p>

        <div class="status-pill">
          {{ gameStore.gameState }}
        </div>
      </template>

      <template v-else>
        <h2>No active round</h2>
        <p>Start the next round when everyone is ready.</p>
      </template>
    </AppCard>

    <AppCard class="admin-card">
      <small>Round Control</small>

      <div v-if="!gameStore.currentRound" class="control-grid">
        <AppButton full @click="startNextAvailableRound">
          Start Next Round
        </AppButton>
      </div>

      <div v-else class="control-grid">
        <AppButton
          v-if="gameStore.gameState === 'roundIntro'"
          full
          @click="gameStore.startNextQuestion()"
        >
          Start Question 1
        </AppButton>

        <AppButton
          v-else-if="
            gameStore.gameState === 'question' &&
            !isLastQuestion
          "
          full
          :class="{ glow: allAnswered }"
          @click="requestNextQuestion"
        >
          Start Next Question
        </AppButton>
        <AppButton
          v-if="
            gameStore.gameState === 'question' &&
            isLastQuestion
          "
          full
          @click="openRoundResults"
        >
          View Round Results
        </AppButton>
        <AppButton
          v-if="gameStore.currentQuestion"
          variant="secondary"
          full
          :class="{ glow: unmarkedAnswers.length > 0 }"
          @click="showMarkAnswersModal = true"
        >
          Mark Answers
          <span v-if="unmarkedAnswers.length">
            ({{ unmarkedAnswers.length }})
          </span>
        </AppButton>

        <AppButton
          v-else-if="gameStore.gameState === 'roundComplete'"
          full
          @click="gameStore.completeRound()"
        >
          Return Players to Waiting
        </AppButton>

        <AppButton
          variant="dark"
          full
          @click="requestEndRound"
        >
          End Round
        </AppButton>
      </div>
    </AppCard>

    <AppCard v-if="gameStore.currentRound" class="admin-card">
      <small>Questions</small>

      <div class="question-list">
        <button
          v-for="question in gameStore.currentRoundQuestions"
          :key="question.id"
          type="button"
          class="question-row"
          :class="{ active: gameStore.activeQuestionId === question.id }"
          @click="gameStore.startQuestion(question.id)"
        >
          <span>Question {{ question.order }}</span>
          <strong>{{ question.text }}</strong>
        </button>
      </div>
    </AppCard>

    <AppCard v-if="gameStore.currentQuestion" class="admin-card">
      <small>Current Question Progress</small>

      <h2>
        {{ submittedPlayers.length }} / {{ players.length }} answered
      </h2>

      <p v-if="allAnswered" class="all-answered">
        Everyone has answered.
      </p>

      <div class="player-status-list">
        <div
          v-for="player in submittedPlayers"
          :key="player.id"
          class="player-status submitted"
        >
          {{ player.name }}
        </div>

        <div
          v-for="player in waitingPlayers"
          :key="player.id"
          class="player-status waiting"
        >
          {{ player.name }}
        </div>
      </div>
    </AppCard>
    <AppConfirmModal
      :show="showNextQuestionWarning"
      title="Continue Without Everyone?"
      :message="waitingPlayersMessage"
      confirm-label="Continue"
      @cancel="showNextQuestionWarning = false"
      @confirm="confirmNextQuestion"
    />
    <AppConfirmModal
      :show="showEndRoundWarning"
      title="End This Round?"
      message="Are you sure? Any players who have not submitted an answer will no longer be able to answer this question."
      confirm-label="End Round"
      @cancel="showEndRoundWarning = false"
      @confirm="confirmEndRound"
    />
    <AdminMarkAnswersModal
      :show="showMarkAnswersModal"
      @close="showMarkAnswersModal = false"
    />
    <AppConfirmModal
      :show="showUnmarkedWarning"
      title="Unmarked Answers"
      :message="`${unmarkedAnswers.length} submitted answer${
        unmarkedAnswers.length === 1 ? ' has' : 's have'
      } not been marked. Are you sure you want to continue?`"
      confirm-label="Continue"
      @cancel="showUnmarkedWarning = false"
      @confirm="confirmContinueWithUnmarked"
    />
    <AdminRoundResultsModal
      :show="showRoundResultsModal"
      @close="showRoundResultsModal = false"
      @end-round="handleEndRoundFromResults"
    />
    <AppConfirmModal
      :show="showUnmarkedResultsWarning"
      title="Unmarked Answers"
      :message="`${unmarkedRoundAnswers.length} answer${
        unmarkedRoundAnswers.length === 1 ? ' has' : 's have'
      } not been marked yet.`"
      confirm-label="Mark Answers"
      @cancel="showUnmarkedResultsWarning = false"
      @confirm="openMarkingFromResultsWarning"
    />
  </AdminShell>
</template>

<style scoped>
.admin-card {
  padding: 18px;
}

.hero-card {
  text-align: center;
}

small {
  display: block;
  margin-bottom: 12px;
  color: var(--gold);
  font-weight: 800;
  text-transform: uppercase;
}

h2 {
  margin: 0;
  color: var(--cream);
  font-size: 26px;
}

p {
  margin: 8px 0 0;
  color: var(--muted);
}

.status-pill {
  display: inline-block;
  margin-top: 16px;
  border: 1px solid var(--gold);
  border-radius: 999px;
  color: var(--gold-light);
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.control-grid {
  display: grid;
  gap: 12px;
}

.glow {
  box-shadow: 0 0 24px rgba(214, 179, 106, 0.25);
}

.question-list,
.player-status-list {
  display: grid;
  gap: 10px;
}

.question-row {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card);
  color: var(--cream);
  padding: 14px;
  text-align: left;
}

.question-row span {
  display: block;
  margin-bottom: 4px;
  color: var(--gold);
  font-size: 12px;
  font-weight: 800;
}

.question-row.active {
  border-color: var(--gold);
  box-shadow: 0 0 18px rgba(214, 179, 106, 0.14);
}

.all-answered {
  color: var(--success);
  font-weight: 800;
}

.player-status {
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 14px;
}

.player-status.submitted {
  background: rgba(79, 138, 91, 0.15);
  color: #8fd19e;
}

.player-status.waiting {
  background: rgba(214, 179, 106, 0.08);
  color: var(--muted);
}
</style>