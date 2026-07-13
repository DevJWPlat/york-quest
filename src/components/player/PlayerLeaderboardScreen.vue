<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Trophy } from 'lucide-vue-next'

import AppAvatar from '@/components/base/AppAvatar.vue'
import { useUsersStore } from '@/stores/usersStore'
const usersStore = useUsersStore()
const leaderboardData = ref([])
const loading = ref(true)
const error = ref('')

let leaderboardInterval

const players = computed(() => {
  return usersStore.players
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
    const tied =
      player.totalPoints === previousPoints &&
      player.correctAnswers === previousCorrect

    const position = tied
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
    console.error('Failed to load player leaderboard:', loadError)
    error.value = 'The leaderboard could not be loaded.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
    await usersStore.loadUsers()
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
  <section class="leaderboard-screen">
    <div class="leaderboard-heading">
      <div class="trophy-circle">
        <Trophy :size="54" stroke-width="1.6" />
      </div>

      <small>Josh's York Quest</small>
      <h1>Leaderboard</h1>
      <p>Current overall standings</p>
    </div>

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
        :class="{
          first: player.position === 1,
          second: player.position === 2,
          third: player.position === 3,
        }"
      >
        <span class="position">
          #{{ player.position }}
        </span>

        <AppAvatar
          :name="player.name"
          :image="player.avatar"
          size="md"
        />

        <div class="player-details">
          <strong>{{ player.name }}</strong>
          <p>{{ player.correctAnswers }} correct</p>
        </div>

        <strong class="points">
          {{ player.totalPoints }}
        </strong>
      </article>
    </div>

    <p class="waiting-message">
      Waiting for the Quest Master...
    </p>
  </section>
</template>

<style scoped>
.leaderboard-screen {
  display: grid;
  min-height: calc(100vh - 70px);
  align-content: center;
  gap: 24px;
  padding: 22px 0 34px;
}

.leaderboard-heading {
  text-align: center;
}

.trophy-circle {
  display: grid;
  width: 112px;
  height: 112px;
  place-items: center;
  margin: 0 auto 18px;
  border: 1px solid var(--gold);
  border-radius: 50%;
  color: var(--gold);
  box-shadow: 0 0 28px rgba(214, 179, 106, 0.18);
}

.leaderboard-heading small {
  color: var(--gold);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.leaderboard-heading h1 {
  margin: 8px 0 4px;
  color: var(--gold-light);
  font-family: var(--font-heading);
  font-size: 34px;
}

.leaderboard-heading p {
  margin: 0;
  color: var(--muted);
}

.leaderboard-list {
  display: grid;
  gap: 10px;
}

.leaderboard-row {
  display: grid;
  grid-template-columns: 38px auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 15px;
  background: var(--bg-soft);
}

.leaderboard-row.first {
  border-color: var(--gold);
  box-shadow: 0 0 22px rgba(214, 179, 106, 0.14);
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
  font-size: 24px;
}

.waiting-message {
  margin: 0;
  color: var(--muted);
  text-align: center;
  font-size: 13px;
}

.state-message,
.error-message {
  padding: 18px;
  border-radius: 14px;
  text-align: center;
}

.state-message {
  color: var(--muted);
  background: var(--bg-soft);
}

.error-message {
  color: #f2a0a0;
  background: rgba(179, 71, 71, 0.12);
}
</style>