<script setup>
import AdminShell from '@/components/layout/AdminShell.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppCard from '@/components/base/AppCard.vue'

import { useGameStore } from '@/stores/gameStore'

import { computed } from 'vue'
import { users } from '@/data/users'

const players = computed(() => users.filter((user) => user.role === 'player'))

const submittedPlayerIds = computed(() => {
  if (!gameStore.currentQuestion) return []

  return gameStore.answers
    .filter((answer) => answer.questionId === gameStore.currentQuestion.id)
    .map((answer) => answer.userId)
})

const submittedPlayers = computed(() => {
  return players.value.filter((player) =>
    submittedPlayerIds.value.includes(player.id),
  )
})

const notSubmittedPlayers = computed(() => {
  return players.value.filter((player) =>
    !submittedPlayerIds.value.includes(player.id),
  )
})

const gameStore = useGameStore()

function getRoundQuestions(roundId) {
  return gameStore.questions
    .filter((question) => question.roundId === roundId)
    .sort((a, b) => a.order - b.order)
}
</script>

<template>
  <AdminShell>
    <AppCard class="admin-card">
      <small>Current Game</small>

      <h2 v-if="gameStore.currentRound">
        {{ gameStore.currentRound.title }} - {{ gameStore.currentRound.pubName }}
      </h2>

      <h2 v-else>No active round</h2>

      <p>State: {{ gameStore.gameState }}</p>
    </AppCard>

    <AppCard v-if="gameStore.currentQuestion" class="admin-card">
      <small>Current Question Progress</small>

      <h2>
        {{ submittedPlayers.length }} / {{ players.length }} answered
      </h2>

      <div class="player-status-list">
        <div
          v-for="player in submittedPlayers"
          :key="player.id"
          class="player-status submitted"
        >
          {{ player.name }}
        </div>

        <div
          v-for="player in notSubmittedPlayers"
          :key="player.id"
          class="player-status waiting"
        >
          {{ player.name }}
        </div>
      </div>
    </AppCard>

    <AppCard class="admin-card">
      <small>Rounds</small>

      <div class="round-list">
        <div
          v-for="round in gameStore.rounds"
          :key="round.id"
          class="round-row"
        >
          <div>
            <strong>{{ round.title }}</strong>
            <span>{{ round.pubName }}</span>
          </div>

          <AppButton
            variant="secondary"
            @click="gameStore.startRound(round.id)"
          >
            Start
          </AppButton>
        </div>
      </div>
    </AppCard>

    <AppCard v-if="gameStore.currentRound" class="admin-card">
      <small>Questions</small>

      <div class="question-list">
        <button
          v-for="question in getRoundQuestions(gameStore.currentRound.id)"
          :key="question.id"
          class="question-row"
          :class="{ active: gameStore.activeQuestionId === question.id }"
          @click="gameStore.startQuestion(question.id)"
        >
          <span>Question {{ question.order }}</span>
          <strong>{{ question.text }}</strong>
        </button>
      </div>
    </AppCard>

    <AppCard v-if="gameStore.currentRound" class="admin-card">
      <small>Round Actions</small>

      <AppButton full @click="gameStore.completeRound()">
        End Round
      </AppButton>
    </AppCard>
  </AdminShell>
</template>

<style scoped>
.admin-card {
  padding: 18px;
}

small {
  display: block;
  margin-bottom: 12px;
  color: var(--gold);
  font-weight: 800;
  text-transform: uppercase;
}

h2 {
  margin: 0 0 8px;
}

p {
  margin: 0;
  color: var(--muted);
}

.round-list,
.question-list {
  display: grid;
  gap: 12px;
}

.round-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card);
}

.round-row div {
  display: grid;
  gap: 4px;
}

.round-row span {
  color: var(--muted);
  font-size: 13px;
}

.question-row {
  display: grid;
  gap: 4px;
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card);
  color: var(--cream);
  padding: 14px;
  text-align: left;
}

.question-row span {
  color: var(--gold);
  font-size: 12px;
  font-weight: 800;
}

.question-row.active {
  border-color: var(--gold);
  box-shadow: 0 0 18px rgba(214, 179, 106, 0.14);
}
</style>