<script setup>
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
} from 'vue'

import {
  Crown,
  Skull,
  Trophy,
} from 'lucide-vue-next'

import AppAvatar from '@/components/base/AppAvatar.vue'
import AppCard from '@/components/base/AppCard.vue'

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
      const score = scoresByUserId.get(
        Number(player.id),
      )

      return {
        ...player,
        totalPoints: Number(
          score?.totalPoints || 0,
        ),
        correctAnswers: Number(
          score?.correctAnswers || 0,
        ),
        answered: Number(
          score?.answered || 0,
        ),
      }
    })
    .sort((a, b) => {
      if (
        b.totalPoints !== a.totalPoints
      ) {
        return (
          b.totalPoints - a.totalPoints
        )
      }

      if (
        b.correctAnswers !==
        a.correctAnswers
      ) {
        return (
          b.correctAnswers -
          a.correctAnswers
        )
      }

      return a.name.localeCompare(b.name)
    })

  let previousPoints = null
  let previousCorrect = null
  let previousPosition = 0

  return sortedPlayers.map(
    (player, index) => {
      const tied =
        player.totalPoints ===
          previousPoints &&
        player.correctAnswers ===
          previousCorrect

      const position = tied
        ? previousPosition
        : index + 1

      previousPoints =
        player.totalPoints

      previousCorrect =
        player.correctAnswers

      previousPosition = position

      return {
        ...player,
        position,
      }
    },
  )
})

const winners = computed(() => {
  return leaderboard.value.filter(
    (player) => player.position === 1,
  )
})

const lowestScore = computed(() => {
  if (!leaderboard.value.length) {
    return null
  }

  return leaderboard.value.reduce(
    (lowest, player) => {
      if (!lowest) {
        return player
      }

      if (
        player.totalPoints <
        lowest.totalPoints
      ) {
        return player
      }

      if (
        player.totalPoints ===
          lowest.totalPoints &&
        player.correctAnswers <
          lowest.correctAnswers
      ) {
        return player
      }

      return lowest
    },
    null,
  )
})

const losers = computed(() => {
  if (!lowestScore.value) {
    return []
  }

  return leaderboard.value.filter(
    (player) =>
      player.totalPoints ===
        lowestScore.value.totalPoints &&
      player.correctAnswers ===
        lowestScore.value.correctAnswers,
  )
})

const winnerTitle = computed(() => {
  return winners.value.length > 1
    ? 'Joint Quest Winners'
    : 'Quest Winner'
})

const loserTitle = computed(() => {
  return losers.value.length > 1
    ? 'Joint Last Place'
    : 'Last Place'
})

const winnerNames = computed(() => {
  return formatNames(
    winners.value.map(
      (player) => player.name,
    ),
  )
})

const loserNames = computed(() => {
  return formatNames(
    losers.value.map(
      (player) => player.name,
    ),
  )
})

function formatNames(names) {
  if (!names.length) {
    return ''
  }

  if (names.length === 1) {
    return names[0]
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`
  }

  return `${names
    .slice(0, -1)
    .join(', ')} and ${
    names[names.length - 1]
  }`
}

async function loadLeaderboard() {
  try {
    const response = await fetch(
      '/api/leaderboard',
      {
        headers: {
          Accept: 'application/json',
        },
      },
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.error ||
          'Unable to load the final leaderboard.',
      )
    }

    leaderboardData.value =
      Array.isArray(data) ? data : []

    error.value = ''
  } catch (loadError) {
    console.error(
      'Failed to load final leaderboard:',
      loadError,
    )

    error.value =
      'The final leaderboard could not be loaded.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await usersStore.loadUsers()
  await loadLeaderboard()

  leaderboardInterval =
    window.setInterval(() => {
      loadLeaderboard()
    }, 5000)
})

onUnmounted(() => {
  window.clearInterval(
    leaderboardInterval,
  )
})
</script>

<template>
  <section class="quest-complete-screen">
    <header class="complete-heading">
      <div class="trophy-circle">
        <Trophy
          :size="70"
          stroke-width="1.6"
        />
      </div>

      <small>Josh's York Quest</small>

      <h1>Quest Complete</h1>

      <p>
        Six pubs conquered. The final
        scores are in.
      </p>
    </header>

    <div
      v-if="loading"
      class="state-message"
    >
      Loading the final results...
    </div>

    <div
      v-else-if="error"
      class="error-message"
    >
      {{ error }}
    </div>

    <template v-else>
      <AppCard
        v-if="winners.length"
        class="result-card winner-card"
      >
        <div class="result-icon winner-icon">
          <Crown
            :size="34"
            stroke-width="1.7"
          />
        </div>

        <small>{{ winnerTitle }}</small>

        <div class="result-avatars">
          <AppAvatar
            v-for="player in winners"
            :key="player.id"
            :name="player.name"
            :image="player.avatar"
            size="lg"
          />
        </div>

        <h2>{{ winnerNames }}</h2>

        <p>
          {{
            winners[0]?.totalPoints || 0
          }}
          points ·
          {{
            winners[0]?.correctAnswers ||
            0
          }}
          correct
        </p>
      </AppCard>

      <AppCard
        v-if="losers.length"
        class="result-card loser-card"
      >
        <div class="result-icon loser-icon">
          <Skull
            :size="30"
            stroke-width="1.7"
          />
        </div>

        <small>{{ loserTitle }}</small>

        <div class="result-avatars compact">
          <AppAvatar
            v-for="player in losers"
            :key="player.id"
            :name="player.name"
            :image="player.avatar"
            size="md"
          />
        </div>

        <h3>{{ loserNames }}</h3>

        <p>
          {{
            losers[0]?.totalPoints || 0
          }}
          points ·
          {{
            losers[0]?.correctAnswers ||
            0
          }}
          correct
        </p>
      </AppCard>

      <div class="leaderboard-heading">
        <small>Final Standings</small>
        <h2>Leaderboard</h2>
      </div>

      <div class="leaderboard-list">
        <article
          v-for="player in leaderboard"
          :key="player.id"
          class="leaderboard-row"
          :class="{
            first:
              player.position === 1,
            second:
              player.position === 2,
            third:
              player.position === 3,
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
            <strong>
              {{ player.name }}
            </strong>

            <p>
              {{ player.correctAnswers }}
              correct
            </p>
          </div>

          <strong class="points">
            {{ player.totalPoints }}
          </strong>
        </article>
      </div>

      <p class="celebration-message">
        Congratulations to everyone who
        survived Josh's York Quest!
      </p>
    </template>
  </section>
</template>

<style scoped>
.quest-complete-screen {
  display: grid;
  min-height: calc(100vh - 70px);
  align-content: start;
  gap: 24px;
  padding: 28px 0 54px;
}

.complete-heading,
.leaderboard-heading {
  text-align: center;
}

.trophy-circle {
  display: grid;
  width: 138px;
  height: 138px;
  place-items: center;
  margin: 0 auto 20px;
  border: 1px solid var(--gold);
  border-radius: 50%;
  color: var(--gold);
  box-shadow:
    0 0 30px
    rgba(214, 179, 106, 0.18);
}

small {
  display: block;
  color: var(--gold);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

h1 {
  margin: 8px 0 0;
  color: var(--gold-light);
  font-family: var(--font-heading);
  font-size: 36px;
  line-height: 1.1;
}

.complete-heading p {
  max-width: 320px;
  margin: 12px auto 0;
  color: var(--muted);
  line-height: 1.5;
}

.result-card {
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 24px;
  text-align: center;
}

.winner-card {
  border-color: var(--gold);
  box-shadow:
    0 0 28px
    rgba(214, 179, 106, 0.16);
}

.loser-card {
  border-color: rgba(
    255,
    255,
    255,
    0.12
  );
}

.result-icon {
  display: grid;
  width: 62px;
  height: 62px;
  place-items: center;
  border-radius: 50%;
}

.winner-icon {
  background: rgba(
    214,
    179,
    106,
    0.12
  );
  color: var(--gold);
}

.loser-icon {
  background: rgba(
    255,
    255,
    255,
    0.06
  );
  color: var(--muted);
}

.result-avatars {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
}

.result-avatars.compact {
  gap: 6px;
}

.result-card h2,
.result-card h3 {
  margin: 0;
  color: var(--cream);
  font-family: var(--font-heading);
}

.result-card h2 {
  font-size: 28px;
}

.result-card h3 {
  font-size: 22px;
}

.result-card p {
  margin: 0;
  color: var(--muted);
}

.leaderboard-heading {
  padding-top: 6px;
}

.leaderboard-heading h2 {
  margin: 6px 0 0;
  color: var(--gold-light);
  font-family: var(--font-heading);
  font-size: 30px;
}

.leaderboard-list {
  display: grid;
  gap: 10px;
}

.leaderboard-row {
  display: grid;
  grid-template-columns:
    38px auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 15px;
  background: var(--bg-soft);
}

.leaderboard-row.first {
  border-color: var(--gold);
  box-shadow:
    0 0 22px
    rgba(214, 179, 106, 0.14);
}

.leaderboard-row.second {
  border-color: rgba(
    212,
    212,
    216,
    0.36
  );
}

.leaderboard-row.third {
  border-color: rgba(
    180,
    120,
    74,
    0.42
  );
}

.position {
  color: var(--gold);
  font-weight: 800;
}

.player-details {
  min-width: 0;
}

.player-details strong {
  display: block;
  overflow: hidden;
  color: var(--cream);
  text-overflow: ellipsis;
  white-space: nowrap;
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

.celebration-message {
  max-width: 320px;
  margin: 4px auto 0;
  color: var(--muted);
  text-align: center;
  line-height: 1.5;
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
  background: rgba(
    179,
    71,
    71,
    0.12
  );
}

@media (max-width: 420px) {
  .quest-complete-screen {
    gap: 20px;
    padding-top: 22px;
  }

  .trophy-circle {
    width: 112px;
    height: 112px;
  }

  h1 {
    font-size: 32px;
  }

  .result-card {
    padding: 20px 16px;
  }

  .leaderboard-row {
    grid-template-columns:
      32px auto minmax(0, 1fr) auto;
    gap: 9px;
    padding: 12px;
  }

  .points {
    font-size: 21px;
  }
}
</style>