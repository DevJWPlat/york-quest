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
import AdminTieBreakerControlModal from '@/components/admin/AdminTieBreakerControlModal.vue'

import { useGameStore } from '@/stores/gameStore'
import { useUsersStore } from '@/stores/usersStore'

import { useRouter } from 'vue-router'
import AdminTieBreakerSetupModal from '@/components/admin/AdminTieBreakerSetupModal.vue'

const gameStore = useGameStore()
const usersStore = useUsersStore()

const showMarkAnswersModal = ref(false)
const showEndRoundWarning = ref(false)
const showRoundResultsModal = ref(false)
const showNextQuestionWarning = ref(false)
const showFinishQuestWarning = ref(false)
const showTieBreakerControlModal = ref(false)

const router = useRouter()

const showTieBreakerSetupModal = ref(false)

const tieBreakerSetup = ref({
  round: null,
  tieBreaker: null,
  roundScores: [],
  suggestedPlayers: [],
})

const tieBreakerError = ref('')
const startingTieBreaker = ref(false)

const activeAction = ref('')
const dashboardError = ref('')

const players = computed(() => {
  return usersStore.players
})

const isActionRunning = computed(() => {
  return Boolean(
    activeAction.value ||
    gameStore.isUpdatingGame,
  )
})

const isGameComplete = computed(() => {
  return [
    'questComplete',
    'finalLeaderboard',
    'finalResults',
  ].includes(gameStore.gameState)
})

const submittedAnswers = computed(() => {
  if (!gameStore.currentQuestion) {
    return []
  }

  return gameStore.answers.filter(
    (answer) =>
      Number(answer.questionId) ===
      Number(gameStore.currentQuestion.id),
  )
})

const submittedPlayerIds = computed(() => {
  return submittedAnswers.value.map(
    (answer) => Number(answer.userId),
  )
})

const submittedPlayers = computed(() => {
  return players.value.filter((player) =>
    submittedPlayerIds.value.includes(
      Number(player.id),
    ),
  )
})

const waitingPlayers = computed(() => {
  return players.value.filter(
    (player) =>
      !submittedPlayerIds.value.includes(
        Number(player.id),
      ),
  )
})

const allAnswered = computed(() => {
  return Boolean(
    gameStore.currentQuestion &&
    players.value.length > 0 &&
    submittedPlayers.value.length ===
      players.value.length,
  )
})

const currentQuestionAnswers = computed(() => {
  if (!gameStore.currentQuestion) {
    return []
  }

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
  return waitingPlayers.value.map(
    (player) => player.name,
  )
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
  const otherNames = names
    .slice(0, -1)
    .join(', ')

  return `${otherNames} and ${lastName} have not submitted answers yet. Are you sure you want to continue?`
})

const isLastQuestion = computed(() => {
  if (!gameStore.currentQuestion) {
    return false
  }

  const currentIndex =
    gameStore.currentRoundQuestions.findIndex(
      (question) =>
        Number(question.id) ===
        Number(
          gameStore.currentQuestion.id,
        ),
    )

  return (
    currentIndex !== -1 &&
    currentIndex ===
      gameStore.currentRoundQuestions.length -
        1
  )
})

const activeTieBreakerSessionId = computed(() => {
  return gameStore.activeTieBreakerSessionId
})

const currentRoundIndex = computed(() => {
  if (!gameStore.currentRound) {
    return -1
  }

  return gameStore.orderedRounds.findIndex(
    (round) =>
      Number(round.id) ===
      Number(gameStore.currentRound.id),
  )
})

const nextRound = computed(() => {
  if (currentRoundIndex.value === -1) {
    return null
  }

  return (
    gameStore.orderedRounds[
      currentRoundIndex.value + 1
    ] || null
  )
})

const isFinalRound = computed(() => {
  return Boolean(
    gameStore.currentRound &&
    currentRoundIndex.value !== -1 &&
    currentRoundIndex.value ===
      gameStore.orderedRounds.length - 1,
  )
})

let answersInterval
let gameStateInterval
let loadingAnswers = false

function clearDashboardError() {
  dashboardError.value = ''
}

async function runGameAction(
  actionName,
  action,
  fallbackMessage,
) {
  if (isActionRunning.value) {
    return false
  }

  clearDashboardError()
  activeAction.value = actionName

  try {
    const result = await action()

    if (result?.success === false) {
      throw new Error(
        result.error || fallbackMessage,
      )
    }

    return true
  } catch (error) {
    console.error(
      `Failed admin action: ${actionName}`,
      error,
    )

    dashboardError.value =
      error.message || fallbackMessage

    return false
  } finally {
    activeAction.value = ''
  }
}

async function refreshAnswers() {
  if (
    loadingAnswers ||
    isActionRunning.value
  ) {
    return
  }

  if (!gameStore.currentQuestion) {
    gameStore.answers = []
    return
  }

  loadingAnswers = true

  try {
    await gameStore.loadAnswers({
      questionId:
        gameStore.currentQuestion.id,
    })
  } finally {
    loadingAnswers = false
  }
}

async function refreshGameState() {
  if (isActionRunning.value) {
    return
  }

  await gameStore.loadGameState()
}

async function startFirstAvailableRound() {
  const firstRound =
    gameStore.orderedRounds[0]

  if (!firstRound) {
    dashboardError.value =
      'There are no active rounds available.'
    return
  }

  await runGameAction(
    'startFirstRound',
    () =>
      gameStore.startRound(
        firstRound.id,
      ),
    'Unable to start the first round.',
  )
}

async function startFirstQuestion() {
  if (!gameStore.currentRound) {
    dashboardError.value =
      'There is no active round.'

    return
  }

  const clearResult =
    await gameStore.clearRoundTieBreakers(
      gameStore.currentRound.id,
    )

  if (!clearResult?.success) {
    dashboardError.value =
      clearResult?.error ||
      'Unable to clear previous tie-breaker results.'

    return
  }

  await runGameAction(
    'startQuestion',
    () => gameStore.startNextQuestion(),
    'Unable to start the first question.',
  )
}

function requestNextQuestion() {
  if (isActionRunning.value) {
    return
  }

  if (unmarkedAnswers.value.length > 0) {
    showMarkAnswersModal.value = true
    return
  }

  if (waitingPlayers.value.length > 0) {
    showNextQuestionWarning.value = true
    return
  }

  startNextQuestion()
}

async function startNextQuestion() {
  await runGameAction(
    'nextQuestion',
    () => gameStore.startNextQuestion(),
    'Unable to start the next question.',
  )
}

async function confirmNextQuestion() {
  showNextQuestionWarning.value = false
  await startNextQuestion()
}

async function openRoundResults() {
  if (
    !gameStore.currentRound ||
    isActionRunning.value
  ) {
    return
  }

  clearDashboardError()
  activeAction.value = 'loadResults'

  try {
    await gameStore.loadAnswers({
      roundId: gameStore.currentRound.id,
    })

    const unmarkedRoundAnswers =
      gameStore.answers.filter(
        (answer) =>
          Number(answer.roundId) ===
            Number(
              gameStore.currentRound.id,
            ) &&
          answer.isCorrect === null,
      )

    if (unmarkedRoundAnswers.length > 0) {
      showMarkAnswersModal.value = true
      return
    }

    showRoundResultsModal.value = true
  } catch (error) {
    dashboardError.value =
      error.message ||
      'Unable to load the round results.'
  } finally {
    activeAction.value = ''
  }
}

function requestEndRound() {
  if (isActionRunning.value) {
    return
  }

  showEndRoundWarning.value = true
}

async function confirmEndRound() {
  showEndRoundWarning.value = false

  await runGameAction(
    'endRound',
    () => gameStore.endRound(),
    'Unable to end the round.',
  )
}

async function handleEndRoundFromResults() {
  showRoundResultsModal.value = false

  await runGameAction(
    'endRound',
    () => gameStore.endRound(),
    'Unable to end the round.',
  )
}

async function handleNextQuestionFromMarking() {
  showMarkAnswersModal.value = false
  await startNextQuestion()
}

async function handleResultsFromMarking() {
  showMarkAnswersModal.value = false
  await openRoundResults()
}

async function startNextRound() {
  if (!nextRound.value) {
    dashboardError.value =
      'There is no next round available.'
    return
  }

  await runGameAction(
    'nextRound',
    () =>
      gameStore.startRound(
        nextRound.value.id,
      ),
    'Unable to start the next round.',
  )
}

function requestFinishQuest() {
  if (isActionRunning.value) {
    return
  }

  showFinishQuestWarning.value = true
}

async function confirmFinishQuest() {
  showFinishQuestWarning.value = false

  await runGameAction(
    'finishQuest',
    () => gameStore.endQuest(),
    'Unable to finish the quest.',
  )
}

async function showFinalLeaderboardToPlayers() {
  await runGameAction(
    'showFinalLeaderboard',
    () =>
      gameStore.showFinalLeaderboard(),
    'Unable to show the final leaderboard.',
  )
}

async function showFinalResultsToPlayers() {
  await runGameAction(
    'showFinalResults',
    () => gameStore.showFinalResults(),
    'Unable to show the winner and loser.',
  )
}

async function hideFinalResultsFromPlayers() {
  await runGameAction(
    'hideFinalResults',
    () => gameStore.hideFinalResults(),
    'Unable to hide the final results.',
  )
}

async function showLeaderboardToPlayers() {
  await runGameAction(
    'showLeaderboard',
    () => gameStore.showLeaderboard(),
    'Unable to show the leaderboard.',
  )
}

async function hideLeaderboardFromPlayers() {
  await runGameAction(
    'hideLeaderboard',
    () => gameStore.hideLeaderboard(),
    'Unable to hide the leaderboard.',
  )
}

function handleUseTieBreaker(payload) {
  showRoundResultsModal.value = false
  tieBreakerError.value = ''

  tieBreakerSetup.value = {
    round: gameStore.currentRound,
    tieBreaker: payload.tieBreaker,
    roundScores: payload.roundScores || [],
    suggestedPlayers: payload.tiedPlayers || [],
  }

  showTieBreakerSetupModal.value = true
}

async function handleCreateTieBreaker(payload) {
  showRoundResultsModal.value = false

  await router.push({
    path: '/admin/rounds',
    query: {
      roundId: String(payload.roundId),
      section: 'tie-breaker',
    },
  })
}

function closeTieBreakerSetup() {
  if (startingTieBreaker.value) {
    return
  }

  showTieBreakerSetupModal.value = false
  tieBreakerError.value = ''
}

async function startTieBreaker(payload) {
  if (startingTieBreaker.value) {
    return
  }

  tieBreakerError.value = ''
  startingTieBreaker.value = true

  try {
    const response = await fetch(
      '/api/tie-breaker-sessions',
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          roundId: payload.roundId,
          tieBreakerId: payload.tieBreakerId,
          participantUserIds:
            payload.participantUserIds,
        }),
      },
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.error ||
          'Unable to start the tie-breaker.',
      )
    }

    showTieBreakerSetupModal.value = false

    await gameStore.loadGameState()
  } catch (error) {
    console.error(
      'Failed to start tie-breaker:',
      error,
    )

    tieBreakerError.value =
      error.message ||
      'Unable to start the tie-breaker.'
  } finally {
    startingTieBreaker.value = false
  }
}

function openTieBreakerControl() {
  if (!gameStore.activeTieBreakerSessionId) {
    dashboardError.value =
      'There is no active tie-breaker session.'

    return
  }

  clearDashboardError()
  showTieBreakerControlModal.value = true
}

function closeTieBreakerControl() {
  showTieBreakerControlModal.value = false
}

async function handleTieBreakerCompleted() {
  showTieBreakerControlModal.value = false

  await gameStore.loadGameState()
}

async function handleTieBreakerCancelled() {
  showTieBreakerControlModal.value = false

  await gameStore.loadGameState()
}

onMounted(async () => {
  await usersStore.loadUsers()
  await gameStore.loadGameState()
  await refreshAnswers()

  gameStateInterval = window.setInterval(
    refreshGameState,
    2000,
  )

  answersInterval = window.setInterval(
    refreshAnswers,
    2000,
  )
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

watch(
  () => gameStore.gameState,
  (newState) => {
    if (
      newState === 'tieBreaker' &&
      gameStore.activeTieBreakerSessionId
    ) {
      showRoundResultsModal.value = false
      showTieBreakerSetupModal.value = false
      showTieBreakerControlModal.value = true

      return
    }

    if (newState !== 'tieBreaker') {
      showTieBreakerControlModal.value = false
    }
  },
  {
    immediate: true,
  },
)

watch(
  () =>
    gameStore.activeTieBreakerSessionId,
  (sessionId) => {
    if (
      gameStore.gameState ===
        'tieBreaker' &&
      sessionId
    ) {
      showTieBreakerControlModal.value = true
    }
  },
)
</script>

<template>
  <AdminShell>
    <div
      v-if="dashboardError"
      class="dashboard-message dashboard-message-error"
    >
      {{ dashboardError }}
    </div>

    <AppCard
      v-if="!isGameComplete"
      class="admin-card hero-card"
    >
      <small>Current Game</small>

      <template v-if="gameStore.currentRound">
        <h2>
          {{ gameStore.currentRound.title }}
        </h2>

        <p>
          {{ gameStore.currentRound.pubName }}
        </p>

        <div class="status-pill">
          {{ gameStore.gameState }}
        </div>
      </template>

      <template v-else>
        <h2>No active round</h2>

        <p>
          Start the next round when everyone is ready.
        </p>
      </template>
    </AppCard>

    <AppCard
      v-else
      class="admin-card hero-card game-complete-card"
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
    </AppCard>

    <AppCard class="admin-card">
      <small>
        {{
          isGameComplete
            ? 'Final Result Controls'
            : 'Round Control'
        }}
      </small>

      <div
        v-if="isGameComplete"
        class="control-grid"
      >
        <p class="game-complete-message">
          Players are currently
          {{
            gameStore.gameState === 'questComplete'
              ? 'waiting for the final reveal.'
              : gameStore.gameState === 'finalLeaderboard'
                ? 'viewing the final leaderboard.'
                : 'viewing the winner and loser.'
          }}
        </p>

        <AppButton
          variant="secondary"
          full
          :disabled="
            isActionRunning ||
            gameStore.gameState === 'finalResults'
          "
          @click="showFinalResultsToPlayers"
        >
          {{
            activeAction === 'showFinalResults'
              ? 'Showing Winner & Loser...'
              : 'Show Winner & Loser'
          }}
        </AppButton>

        <AppButton
          full
          :disabled="
            isActionRunning ||
            gameStore.gameState === 'finalLeaderboard'
          "
          @click="showFinalLeaderboardToPlayers"
        >
          {{
            activeAction === 'showFinalLeaderboard'
              ? 'Showing Leaderboard...'
              : 'Show Final Leaderboard'
          }}
        </AppButton>

        <AppButton
          variant="dark"
          full
          :disabled="
            isActionRunning ||
            gameStore.gameState === 'questComplete'
          "
          @click="hideFinalResultsFromPlayers"
        >
          {{
            activeAction === 'hideFinalResults'
              ? 'Hiding Results...'
              : 'Hide Results'
          }}
        </AppButton>
      </div>

      <div
        v-else-if="!gameStore.currentRound"
        class="control-grid"
      >
        <AppButton
          full
          :disabled="
            isActionRunning ||
            !gameStore.orderedRounds.length
          "
          @click="startFirstAvailableRound"
        >
          {{
            activeAction === 'startFirstRound'
              ? 'Starting Round...'
              : 'Start First Round'
          }}
        </AppButton>

        <p
          v-if="!gameStore.orderedRounds.length"
        >
          There are no active rounds available.
        </p>
      </div>

      <div
        v-else
        class="control-grid"
      >
        <template
          v-if="
            gameStore.gameState ===
            'tieBreaker'
          "
        >
          <p class="tie-breaker-message">
            A round tie-breaker is currently in progress.
            Open the control panel to view answers and
            choose the official round winner.
          </p>

          <AppButton
            full
            :disabled="
              !activeTieBreakerSessionId
            "
            @click="openTieBreakerControl"
          >
            Open Tie-Breaker Control
          </AppButton>
        </template>

        <template
          v-else-if="
            gameStore.gameState ===
            'roundIntro'
          "
        >
          <AppButton
            full
            :disabled="
              isActionRunning ||
              !gameStore.currentRoundQuestions.length
            "
            @click="startFirstQuestion"
          >
            {{
              activeAction === 'startQuestion'
                ? 'Starting Question...'
                : 'Start Question 1'
            }}
          </AppButton>

          <p
            v-if="
              !gameStore.currentRoundQuestions.length
            "
          >
            This round does not have any questions yet.
          </p>
        </template>

        <template
          v-else-if="
            gameStore.gameState ===
            'question'
          "
        >
          <AppButton
            v-if="!isLastQuestion"
            full
            :disabled="isActionRunning"
            :class="{ glow: allAnswered }"
            @click="requestNextQuestion"
          >
            {{
              activeAction === 'nextQuestion'
                ? 'Starting Next Question...'
                : 'Start Next Question'
            }}
          </AppButton>

          <AppButton
            v-else
            full
            :disabled="isActionRunning"
            @click="openRoundResults"
          >
            {{
              activeAction === 'loadResults'
                ? 'Loading Results...'
                : 'View Round Results'
            }}
          </AppButton>

          <AppButton
            variant="secondary"
            full
            :disabled="isActionRunning"
            :class="{
              glow:
                unmarkedAnswers.length > 0,
            }"
            @click="
              showMarkAnswersModal = true
            "
          >
            Mark Answers

            <span
              v-if="unmarkedAnswers.length"
            >
              ({{ unmarkedAnswers.length }})
            </span>
          </AppButton>

          <AppButton
            variant="dark"
            full
            :disabled="isActionRunning"
            @click="requestEndRound"
          >
            {{
              activeAction === 'endRound'
                ? 'Ending Round...'
                : 'End Round'
            }}
          </AppButton>
        </template>

        <template
          v-else-if="
            gameStore.gameState ===
            'roundComplete'
          "
        >
          <AppButton
            variant="secondary"
            full
            :disabled="isActionRunning"
            @click="showLeaderboardToPlayers"
          >
            {{
              activeAction === 'showLeaderboard'
                ? 'Showing Leaderboard...'
                : 'Show Leaderboard to Players'
            }}
          </AppButton>

          <AppButton
            v-if="!isFinalRound"
            full
            :disabled="isActionRunning"
            @click="startNextRound"
          >
            {{
              activeAction === 'nextRound'
                ? 'Starting Next Round...'
                : 'Start Next Round'
            }}
          </AppButton>

          <AppButton
            v-else
            full
            :disabled="isActionRunning"
            @click="requestFinishQuest"
          >
            {{
              activeAction === 'finishQuest'
                ? 'Finishing Quest...'
                : 'Finish Quest'
            }}
          </AppButton>
        </template>

        <template
          v-else-if="
            gameStore.gameState ===
            'leaderboard'
          "
        >
          <AppButton
            variant="secondary"
            full
            :disabled="isActionRunning"
            @click="hideLeaderboardFromPlayers"
          >
            {{
              activeAction === 'hideLeaderboard'
                ? 'Hiding Leaderboard...'
                : 'Hide Leaderboard'
            }}
          </AppButton>

          <AppButton
            v-if="!isFinalRound"
            full
            :disabled="isActionRunning"
            @click="startNextRound"
          >
            {{
              activeAction === 'nextRound'
                ? 'Starting Next Round...'
                : 'Start Next Round'
            }}
          </AppButton>

          <AppButton
            v-else
            full
            :disabled="isActionRunning"
            @click="requestFinishQuest"
          >
            {{
              activeAction === 'finishQuest'
                ? 'Finishing Quest...'
                : 'Finish Quest'
            }}
          </AppButton>
        </template>
      </div>
    </AppCard>

    <AppCard
      v-if="
        gameStore.currentQuestion &&
        !isGameComplete &&
        gameStore.gameState !==
          'tieBreaker'
      "
      class="admin-card"
    >
      <small>Current Question Progress</small>

      <h2>
        {{ submittedPlayers.length }} /
        {{ players.length }} answered
      </h2>

      <p
        v-if="allAnswered"
        class="all-answered"
      >
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
      @cancel="
        showNextQuestionWarning = false
      "
      @confirm="confirmNextQuestion"
    />

    <AppConfirmModal
      :show="showEndRoundWarning"
      title="End This Round?"
      message="Are you sure? Any players who have not submitted an answer will no longer be able to answer this question."
      confirm-label="End Round"
      @cancel="
        showEndRoundWarning = false
      "
      @confirm="confirmEndRound"
    />

    <AppConfirmModal
      :show="showFinishQuestWarning"
      title="Finish the Quest?"
      message="This will complete the game and move every player to the Quest Complete waiting screen. Final results will remain hidden until you choose to reveal them."
      confirm-label="Finish Quest"
      @cancel="
        showFinishQuestWarning = false
      "
      @confirm="confirmFinishQuest"
    />

    <AdminMarkAnswersModal
      :show="showMarkAnswersModal"
      @close="
        showMarkAnswersModal = false
      "
      @start-next-question="
        handleNextQuestionFromMarking
      "
      @view-round-results="
        handleResultsFromMarking
      "
    />

    <AdminRoundResultsModal
      :show="showRoundResultsModal"
      @close="
        showRoundResultsModal = false
      "
      @end-round="
        handleEndRoundFromResults
      "
      @use-tie-breaker="
        handleUseTieBreaker
      "
      @create-tie-breaker="
        handleCreateTieBreaker
      "
    />

    <AdminTieBreakerSetupModal
      :show="showTieBreakerSetupModal"
      :round="tieBreakerSetup.round"
      :tie-breaker="
        tieBreakerSetup.tieBreaker
      "
      :round-scores="
        tieBreakerSetup.roundScores
      "
      :suggested-players="
        tieBreakerSetup.suggestedPlayers
      "
      :starting="startingTieBreaker"
      :error="tieBreakerError"
      @close="closeTieBreakerSetup"
      @start="startTieBreaker"
    />

    <AdminTieBreakerControlModal
      :show="
        showTieBreakerControlModal
      "
      :session-id="
        activeTieBreakerSessionId
      "
      @close="
        closeTieBreakerControl
      "
      @completed="
        handleTieBreakerCompleted
      "
      @cancelled="
        handleTieBreakerCancelled
      "
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
  box-shadow:
    0 0 24px
    rgba(214, 179, 106, 0.25);
}

.player-status-list {
  display: grid;
  gap: 10px;
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
  background:
    rgba(214, 179, 106, 0.08);
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

.game-complete-card {
  border-color: var(--gold);
  box-shadow:
    0 0 24px
    rgba(214, 179, 106, 0.12);
}

.dashboard-message {
  margin-bottom: 18px;
  border-radius: 12px;
  padding: 14px 16px;
  font-weight: 700;
}

.dashboard-message-error {
  border: 1px solid
    rgba(239, 68, 68, 0.4);
  background:
    rgba(239, 68, 68, 0.12);
  color: #fecaca;
}

.tie-breaker-message {
  margin: 0;
  padding: 14px;
  border: 1px solid
    rgba(214, 179, 106, 0.4);
  border-radius: 12px;
  background:
    rgba(214, 179, 106, 0.08);
  color: var(--muted);
  text-align: center;
  line-height: 1.5;
}
</style>