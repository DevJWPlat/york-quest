<script setup>
import {
  computed,
  nextTick,
  onMounted,
  ref,
} from 'vue'

import {
  CircleCheck,
  Trophy,
} from 'lucide-vue-next'

import confetti from 'canvas-confetti'

import AppAvatar from '@/components/base/AppAvatar.vue'

import { useGameStore } from '@/stores/gameStore'

const gameStore = useGameStore()

const confettiCanvas = ref(null)

const tieBreakerSession = ref(null)
const loadingTieBreakerResult = ref(true)

const hasTieBreakerWinner = computed(() => {
  return Boolean(
    tieBreakerSession.value?.status ===
      'complete' &&
    tieBreakerSession.value?.winnerUserId,
  )
})

const tieBreakerWinner = computed(() => {
  if (!hasTieBreakerWinner.value) {
    return null
  }

  const winnerUserId = Number(
    tieBreakerSession.value.winnerUserId,
  )

  return (
    tieBreakerSession.value.participants?.find(
      (participant) =>
        Number(participant.userId) ===
        winnerUserId,
    ) || {
      userId: winnerUserId,
      name:
        tieBreakerSession.value.winnerName ||
        'Round Winner',
      avatar: '',
    }
  )
})

async function loadTieBreakerResult() {
  if (!gameStore.currentRound) {
    tieBreakerSession.value = null
    loadingTieBreakerResult.value = false
    return
  }

  loadingTieBreakerResult.value = true

  try {
    const roundId =
      gameStore.currentRound.id

    const response = await fetch(
      `/api/tie-breaker-sessions?roundId=${encodeURIComponent(
        roundId,
      )}`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
    )

    if (!response.ok) {
      throw new Error(
        'Unable to load the tie-breaker result.',
      )
    }

    const data = await response.json()

    tieBreakerSession.value =
      data?.status === 'complete'
        ? data
        : null
  } catch (error) {
    console.error(
      'Failed to load tie-breaker result:',
      error,
    )

    /*
     * A tie-breaker result failing to load should
     * not prevent the normal Round Complete screen
     * from appearing.
     */
    tieBreakerSession.value = null
  } finally {
    loadingTieBreakerResult.value = false
  }
}

async function fireGoldConfetti() {
  await nextTick()

  if (!confettiCanvas.value) {
    return
  }

  const fireConfetti = confetti.create(
    confettiCanvas.value,
    {
      resize: true,
      useWorker: true,
    },
  )

  fireConfetti({
    particleCount: 90,
    spread: 75,
    startVelocity: 30,

    origin: {
      x: 0.5,
      y: 0.36,
    },

    colors: [
      '#d6b36a',
      '#f1d28d',
      '#ffe0a0',
      '#b88b3f',
    ],

    scalar: 0.9,
    gravity: 0.9,
    ticks: 180,
  })
}

onMounted(async () => {
  await loadTieBreakerResult()
  await fireGoldConfetti()
})
</script>

<template>
  <section class="complete-screen">
    <canvas
      ref="confettiCanvas"
      class="confetti-canvas"
    />

    <template
      v-if="
        !loadingTieBreakerResult &&
        hasTieBreakerWinner
      "
    >
      <div class="complete-circle winner-circle">
        <Trophy
          :size="78"
          stroke-width="1.6"
        />
      </div>

      <div class="complete-content">
        <small>Tie-Breaker Complete</small>

        <h1>
          {{ tieBreakerWinner.name }}
          Wins the Round!
        </h1>

        <div class="winner-avatar">
          <AppAvatar
            :name="tieBreakerWinner.name"
            :image="tieBreakerWinner.avatar"
            size="lg"
          />
        </div>

        <p>
          The tie-breaker decided the official
          round winner. No extra leaderboard
          points were awarded.
        </p>

        <span class="waiting-message">
          Grab a drink and wait for the next
          round.
        </span>
      </div>
    </template>

    <template v-else>
      <div class="complete-circle">
        <CircleCheck
          :size="78"
          stroke-width="1.6"
        />
      </div>

      <div class="complete-content">
        <h1>Round Complete</h1>

        <p>
          Grab a drink and wait for the next
          round.
        </p>
      </div>
    </template>
  </section>
</template>

<style scoped>
.complete-screen {
  position: relative;
  isolation: isolate;

  display: grid;
  min-height: calc(100vh - 70px);
  align-content: center;
  gap: 28px;
  padding: 32px 0 48px;
  text-align: center;
}

.confetti-canvas {
  position: fixed;
  z-index: 1;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.complete-circle {
  position: relative;
  z-index: 2;

  display: grid;
  place-items: center;
  width: 155px;
  height: 155px;
  margin: 0 auto;
  border: 1px solid var(--gold);
  border-radius: 50%;
  background: var(--bg);
  color: var(--gold);
  box-shadow:
    0 0 30px
    rgba(214, 179, 106, 0.18);
}

.winner-circle {
  box-shadow:
    0 0 42px
    rgba(214, 179, 106, 0.24);
}

.complete-content {
  position: relative;
  z-index: 2;
}

small {
  display: block;
  margin-bottom: 8px;
  color: var(--gold);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

h1 {
  max-width: 360px;
  margin: 0 auto;
  color: var(--gold-light);
  font-family: var(--font-heading);
  font-size: 34px;
  line-height: 1.15;
}

.winner-avatar {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

p {
  max-width: 310px;
  margin: 14px auto 0;
  color: var(--muted);
  line-height: 1.5;
}

.waiting-message {
  display: block;
  max-width: 300px;
  margin: 18px auto 0;
  color: var(--gold);
  font-size: 13px;
  font-weight: 700;
}

@media (max-width: 420px) {
  .complete-screen {
    align-content: start;
    padding-top: 42px;
  }

  .complete-circle {
    width: 130px;
    height: 130px;
  }

  h1 {
    font-size: 30px;
  }
}
</style>