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
import { useUsersStore } from '@/stores/usersStore'

const gameStore = useGameStore()
const usersStore = useUsersStore()

const showMarkAnswersModal = ref(false)
const showEndRoundWarning = ref(false)
const showRoundResultsModal = ref(false)
const showNextQuestionWarning = ref(false)
const showFinishQuestWarning = ref(false)

const players = computed(() => {
  return usersStore.players
})

const submittedAnswers = computed(() => {
  if (!gameStore.currentQuestion) return []

  return gameStore.answers.filter(
    (answer) =>
      Number(answer.questionId) ===
      Number(gameStore.currentQuestion.id),
  )
})

const submittedPlayerIds = computed(() => {
  return submittedAnswers.value.map((answer) =>
    Number(answer.userId),
  )
})

const submittedPlayers = computed(() => {
  return players.value.filter((player) =>
    submittedPlayerIds.value.includes(Number(player.id)),
  )
})

const waitingPlayers = computed(() => {
  return players.value.filter(
    (player) =>
      !submittedPlayerIds.value.includes(Number(player.id)),
  )
})

const allAnswered = computed(() => {
  return Boolean(
    gameStore.currentQuestion &&
      players.value.length > 0 &&
      submittedPlayers.value.length === players.value.length,
  )
})

const currentQuestionAnswers = computed(() => {
  if (!gameStore.currentQuestion) return []

  return gameStore.answers.filter(
    (answer) =>
      Number(answer.questionId) ===
      Number(gameStore.currentQuestion.id),
  )
})

const unmarkedAnswers = computed(() => {
  return currentQuestionAnswers.value.filter(
    (answer) => answer.isCorrect === null,
  )
})

const waitingPlayerNames = computed(() => {
  return waitingPlayers.value.map((player) => player.name)
})

const waitingPlayersMessage = computed(() => {
  const names = waitingPlayerNames.value

  if (!names.length) return ''

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
    (question) =>
      Number(question.id) ===
      Number(gameStore.currentQuestion.id),
  )

  return (
    currentIndex !== -1 &&
    currentIndex === questions.length - 1
  )
})

const currentRoundIndex = computed(() => {
  if (!gameStore.currentRound) return -1

  return gameStore.rounds.findIndex(
    (round) =>
      Number(round.id) ===
      Number(gameStore.currentRound.id),
  )
})

const nextRound = computed(() => {
  if (currentRoundIndex.value === -1) return null

  return gameStore.rounds[currentRoundIndex.value + 1] || null
})

const isFinalRound = computed(() => {
  return Boolean(
    gameStore.currentRound &&
      currentRoundIndex.value === gameStore.rounds.length - 1,
  )
})

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

function startFirstAvailableRound() {
  const firstRound = gameStore.rounds[0]

  if (!firstRound) return

  gameStore.startRound(firstRound.id)
}

function requestNextQuestion() {
  // Submitted answers must always be marked first.
  if (unmarkedAnswers.value.length > 0) {
    showMarkAnswersModal.value = true
    return
  }

  // Players who never submitted can still be skipped after confirmation.
  if (waitingPlayers.value.length > 0) {
    showNextQuestionWarning.value = true
    return
  }

  gameStore.startNextQuestion()
}

function confirmNextQuestion() {
  showNextQuestionWarning.value = false
  gameStore.startNextQuestion()
}

async function openRoundResults() {
  if (!gameStore.currentRound) return

  await gameStore.loadAnswers({
    roundId: gameStore.currentRound.id,
  })

  const unmarkedRoundAnswers = gameStore.answers.filter(
    (answer) =>
      Number(answer.roundId) ===
        Number(gameStore.currentRound.id) &&
      answer.isCorrect === null,
  )

  if (unmarkedRoundAnswers.length > 0) {
    showMarkAnswersModal.value = true
    return
  }

  showRoundResultsModal.value = true
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

async function handleNextQuestionFromMarking() {
  showMarkAnswersModal.value = false
  await gameStore.startNextQuestion()
}

async function handleResultsFromMarking() {
  showMarkAnswersModal.value = false
  await openRoundResults()
}

async function startNextRound() {
  if (!nextRound.value) return

  await gameStore.startRound(nextRound.value.id)
}

function requestFinishQuest() {
  showFinishQuestWarning.value = true
}

async function confirmFinishQuest() {
  showFinishQuestWarning.value = false
  await gameStore.endQuest()
}

async function showFinalLeaderboardToPlayers() {
  await gameStore.showFinalLeaderboard()
}

async function showFinalResultsToPlayers() {
  await gameStore.showFinalResults()
}

async function hideFinalResultsFromPlayers() {
  await gameStore.hideFinalResults()
}

async function showLeaderboardToPlayers() {
  await gameStore.showLeaderboard()
}

async function hideLeaderboardFromPlayers() {
  await gameStore.hideLeaderboard()
}

onMounted(async () => {
  await usersStore.loadUsers()
  await gameStore.loadGameState()
  await refreshAnswers()

  gameStateInterval = window.setInterval(() => {
    gameStore.loadGameState()
  }, 2000)

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

      <!-- No round has started yet -->
      <div
        v-if="
          [
            'questComplete',
            'finalLeaderboard',
            'finalResults',
          ].includes(gameStore.gameState)
        "
        class="control-grid"
      >
        <p class="game-complete-message">
          Players are currently
          {{
            gameStore.gameState === 'questComplete'
              ? 'waiting for the final reveal.'
              : gameStore.gameState === 'finalLeaderboard'
                ? 'viewing the final leaderboard.'
                : 'viewing the winner, loser and final standings.'
          }}
        </p>

        <AppButton
          variant="secondary"
          full
          :disabled="
            gameStore.gameState === 'finalResults'
          "
          @click="showFinalResultsToPlayers"
        >
          Show Winner &amp; Loser
        </AppButton>

        <AppButton
          full
          :disabled="
            gameStore.gameState === 'finalLeaderboard'
          "
          @click="showFinalLeaderboardToPlayers"
        >
          Show Final Leaderboard
        </AppButton>

        <AppButton
          variant="dark"
          full
          :disabled="
            gameStore.gameState === 'questComplete'
          "
          @click="hideFinalResultsFromPlayers"
        >
          Hide Results
        </AppButton>
      </div>

      <!-- No round has started yet -->
      <div
        v-else-if="!gameStore.currentRound"
        class="control-grid"
      >
        <AppButton
          full
          @click="startFirstAvailableRound"
        >
          Start First Round
        </AppButton>
      </div>


      <div v-else class="control-grid">
        <!-- Round intro -->
        <template v-if="gameStore.gameState === 'roundIntro'">
          <AppButton
            full
            :disabled="!gameStore.currentRoundQuestions.length"
            @click="gameStore.startNextQuestion()"
          >
            Start Question 1
          </AppButton>

          <p v-if="!gameStore.currentRoundQuestions.length">
            This round does not have any questions yet.
          </p>
        </template>

        <!-- Live question -->
        <template v-else-if="gameStore.gameState === 'question'">
          <AppButton
            v-if="!isLastQuestion"
            full
            :class="{ glow: allAnswered }"
            @click="requestNextQuestion"
          >
            Start Next Question
          </AppButton>

          <AppButton
            v-else
            full
            @click="openRoundResults"
          >
            View Round Results
          </AppButton>

          <AppButton
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
            variant="dark"
            full
            @click="requestEndRound"
          >
            End Round
          </AppButton>
        </template>

        <!-- Players are on the round-complete screen -->
        <template v-else-if="gameStore.gameState === 'roundComplete'">
          <AppButton
            variant="secondary"
            full
            @click="showLeaderboardToPlayers"
          >
            Show Leaderboard to Players
          </AppButton>

          <AppButton
            v-if="!isFinalRound"
            full
            @click="startNextRound"
          >
            Start Next Round
          </AppButton>

          <AppButton
            v-else
            full
            @click="requestFinishQuest"
          >
            Finish Quest
          </AppButton>
        </template>

        <!-- Players are currently viewing the leaderboard -->
        <template v-else-if="gameStore.gameState === 'leaderboard'">
          <AppButton
            variant="secondary"
            full
            @click="hideLeaderboardFromPlayers"
          >
            Hide Leaderboard
          </AppButton>

          <AppButton
            v-if="!isFinalRound"
            full
            @click="startNextRound"
          >
            Start Next Round
          </AppButton>

          <AppButton
            v-else
            full
            @click="requestFinishQuest"
          >
            Finish Quest
          </AppButton>
        </template>

        <!-- Quest has finished -->
        <template v-else-if="gameStore.gameState === 'questComplete'">
          <p>The quest has been completed.</p>
        </template>
      </div>
    </AppCard>

    <AppCard class="admin-card hero-card">
      <template
        v-if="
          [
            'questComplete',
            'finalLeaderboard',
            'finalResults',
          ].includes(gameStore.gameState)
        "
      >
        <small>Game Complete</small>

        <h2>Quest Complete</h2>

        <p>
          Josh's York Quest has finished. Choose what the
          players can see below.
        </p>

        <div class="status-pill">
          {{
            gameStore.gameState === 'questComplete'
              ? 'Results Hidden'
              : gameStore.gameState === 'finalLeaderboard'
                ? 'Final Leaderboard Showing'
                : 'Winner & Loser Showing'
          }}
        </div>
      </template>

      <template v-else-if="gameStore.currentRound">
        <small>Current Game</small>

        <h2>{{ gameStore.currentRound.title }}</h2>
        <p>{{ gameStore.currentRound.pubName }}</p>

        <div class="status-pill">
          {{ gameStore.gameState }}
        </div>
      </template>

      <template v-else>
        <small>Current Game</small>

        <h2>No active round</h2>

        <p>
          Start the next round when everyone is ready.
        </p>
      </template>
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
      @start-next-question="handleNextQuestionFromMarking"
      @view-round-results="handleResultsFromMarking"
    />
    <AdminRoundResultsModal
      :show="showRoundResultsModal"
      @close="showRoundResultsModal = false"
      @end-round="handleEndRoundFromResults"
    />
    <AppConfirmModal
      :show="showFinishQuestWarning"
      title="Finish the Quest?"
      message="This will complete the game and move every player to the Quest Complete waiting screen. Final results will remain hidden until you choose to reveal them."
      confirm-label="Finish Quest"
      @cancel="showFinishQuestWarning = false"
      @confirm="confirmFinishQuest"
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

.game-complete-message {
  margin: 0 0 6px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card);
  text-align: center;
  line-height: 1.5;
}
</style>