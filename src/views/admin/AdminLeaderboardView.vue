<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

import AdminShell from '@/components/layout/AdminShell.vue'
import AppCard from '@/components/base/AppCard.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'

import { users } from '@/data/users'

const leaderboardData = ref([])
const loading = ref(true)
const error = ref('')

let leaderboardInterval

const players = computed(() => {
  return users.filter((user) => user.role === 'player')
})

const leaderboard = computed(() => {
  const scoresByUserId = new Map(
    leaderboardData.value.map((score) => [
      Number(score.userId),
      score,
    ]),
  )

  const sortedPlayers = players.value
    .map((player) => {
      const score = scoresByUserId.get(Number(player.id))

      return {
        ...player,
        totalPoints: Number(score?.totalPoints || 0),
        answered: Number(score?.answered || 0),
        correctAnswers: Number(score?.correctAnswers || 0),
      }
    })
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints
      }

      if (b.correctAnswers !== a.correctAnswers) {
        return b.correctAnswers - a.correctAnswers
      }

      return a.name.localeCompare(b.name)
    })

  let previousPoints = null
  let previousCorrect = null
  let previousPosition = 0

  return sortedPlayers.map((player, index) => {
    const isTiedWithPrevious =
      player.totalPoints === previousPoints &&
      player.correctAnswers === previousCorrect

    const position = isTiedWithPrevious
      ? previousPosition
      : index + 1

    previousPoints = player.totalPoints
    previousCorrect = player.correctAnswers
    previousPosition = position

    return {
      ...player,
      position,
    }
  })
})

async function loadLeaderboard() {
  try {
    const response = await fetch('/api/leaderboard')

    if (!response.ok) {
      throw new Error('Unable to load leaderboard.')
    }

    const data = await response.json()

    leaderboardData.value = Array.isArray(data) ? data : []
    error.value = ''
  } catch (loadError) {
    console.error('Failed to load leaderboard:', loadError)
    error.value = 'The leaderboard could not be loaded.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadLeaderboard()

  leaderboardInterval = window.setInterval(() => {
    loadLeaderboard()
  }, 5000)
})

onUnmounted(() => {
  window.clearInterval(leaderboardInterval)
})
</script>

<template>
  <AdminShell>
    <AppCard class="admin-card">
      <small>Overall Scores</small>

      <div v-if="loading" class="state-message">
        Loading leaderboard...
      </div>

      <div v-else-if="error" class="error-message">
        {{ error }}
      </div>

      <div v-else class="leaderboard-list">
        <article
          v-for="player in leaderboard"
          :key="player.id"
          class="leaderboard-row"
        >
          <span class="position">
            #{{ player.position }}
          </span>

          <AppAvatar
            :name="player.name"
            :image="player.avatar"
            size="sm"
          />

          <div class="player-details">
            <strong>{{ player.name }}</strong>

            <p>
              {{ player.correctAnswers }} correct ·
              {{ player.answered }} answered
            </p>
          </div>

          <strong class="points">
            {{ player.totalPoints }}
          </strong>
        </article>
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
  margin-bottom: 14px;
  color: var(--gold);
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.leaderboard-list {
  display: grid;
  gap: 10px;
}

.leaderboard-row {
  display: grid;
  grid-template-columns: 40px auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card);
}

.position {
  color: var(--gold);
  font-weight: 800;
}

.player-details {
  min-width: 0;
}

.player-details strong {
  color: var(--cream);
}

.player-details p {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 12px;
}

.points {
  color: var(--gold-light);
  font-size: 23px;
}

.state-message,
.error-message {
  padding: 18px;
  border-radius: 14px;
  text-align: center;
}

.state-message {
  color: var(--muted);
  background: var(--card);
}

.error-message {
  color: #f2a0a0;
  background: rgba(179, 71, 71, 0.12);
}
</style>