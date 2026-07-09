<script setup>
import { computed } from 'vue'

import AdminShell from '@/components/layout/AdminShell.vue'
import AppCard from '@/components/base/AppCard.vue'

import { useGameStore } from '@/stores/gameStore'
import { users } from '@/data/users'

const gameStore = useGameStore()

const leaderboard = computed(() => {
  return users
    .filter((user) => user.role === 'player')
    .map((user) => {
      const userAnswers = gameStore.answers.filter((answer) => answer.userId === user.id)

      const points = userAnswers.reduce((total, answer) => {
        return total + Number(answer.pointsAwarded || 0)
      }, 0)

      const correct = userAnswers.filter((answer) => answer.isCorrect === true).length

      return {
        ...user,
        points,
        correct,
        answered: userAnswers.length,
      }
    })
    .sort((a, b) => b.points - a.points)
})
</script>

<template>
  <AdminShell>
    <AppCard class="admin-card">
      <small>Leaderboard</small>

      <div class="leaderboard-list">
        <div
          v-for="(player, index) in leaderboard"
          :key="player.id"
          class="leaderboard-row"
        >
          <span class="position">#{{ index + 1 }}</span>

          <div>
            <strong>{{ player.name }}</strong>
            <p>{{ player.correct }} correct · {{ player.answered }} answered</p>
          </div>

          <strong class="points">{{ player.points }}</strong>
        </div>
      </div>
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

.leaderboard-list {
  display: grid;
  gap: 12px;
}

.leaderboard-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card);
}

.position {
  color: var(--gold);
  font-weight: 800;
}

p {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 13px;
}

.points {
  color: var(--gold-light);
  font-size: 22px;
}
</style>