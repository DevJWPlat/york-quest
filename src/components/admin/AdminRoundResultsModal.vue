<script setup>
import {
  computed,
  ref,
  watch,
} from 'vue'

import {
  Beer,
  Scale,
  Trophy,
} from 'lucide-vue-next'

import AppAvatar from '@/components/base/AppAvatar.vue'
import AppButton from '@/components/base/AppButton.vue'

import { useGameStore } from '@/stores/gameStore'
import { useRoundsStore } from '@/stores/roundsStore'
import { useUsersStore } from '@/stores/usersStore'

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'close',
  'end-round',
  'use-tie-breaker',
  'create-tie-breaker',
])

const gameStore = useGameStore()
const roundsStore = useRoundsStore()
const usersStore = useUsersStore()

const roundAnswers = ref([])

const loading = ref(false)
const error = ref('')

const players = computed(() => {
  return usersStore.players
})

const currentRoundTieBreaker = computed(() => {
  if (!gameStore.currentRound) {
    return null
  }

  return roundsStore.getTieBreakerByRound(
    gameStore.currentRound.id,
  )
})

const roundScores = computed(() => {
  const currentRoundId = Number(
    gameStore.currentRound?.id,
  )

  return players.value
    .map((player) => {
      const playerAnswers =
        roundAnswers.value.filter(
          (answer) =>
            Number(answer.roundId) ===
              currentRoundId &&
            Number(answer.userId) ===
              Number(player.id),
        )

      const points = playerAnswers.reduce(
        (total, answer) => {
          return (
            total +
            Number(
              answer.pointsAwarded || 0,
            )
          )
        },
        0,
      )

      return {
        ...player,
        points,
        answered: playerAnswers.length,
      }
    })
    .sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points
      }

      return a.name.localeCompare(b.name)
    })
})

const winners = computed(() => {
  if (!roundScores.value.length) {
    return []
  }

  const highestScore =
    roundScores.value[0].points

  return roundScores.value.filter(
    (player) =>
      player.points === highestScore,
  )
})

const losers = computed(() => {
  if (!roundScores.value.length) {
    return []
  }

  const lowestScore =
    roundScores.value[
      roundScores.value.length - 1
    ].points

  return roundScores.value.filter(
    (player) =>
      player.points === lowestScore,
  )
})

const hasWinnerTie = computed(() => {
  return winners.value.length > 1
})

const hasUsableTieBreaker = computed(() => {
  return Boolean(
    currentRoundTieBreaker.value?.isActive,
  )
})

const tieBreakerButtonLabel = computed(() => {
  return hasUsableTieBreaker.value
    ? 'Use Tie-Breaker'
    : 'Create Tie-Breaker'
})

function handleTieBreakerAction() {
  if (!gameStore.currentRound) {
    return
  }

  if (hasUsableTieBreaker.value) {
    emit('use-tie-breaker', {
      roundId: gameStore.currentRound.id,
      tieBreaker:
        currentRoundTieBreaker.value,
      tiedPlayers: winners.value,
      roundScores: roundScores.value,
    })

    return
  }

  emit('create-tie-breaker', {
    roundId: gameStore.currentRound.id,
  })
}

async function loadRoundResults() {
  if (!gameStore.currentRound) {
    return
  }

  loading.value = true
  error.value = ''

  try {
    const roundId =
      gameStore.currentRound.id

    const [
      answersResponse,
      tieBreakerResponse,
    ] = await Promise.all([
      fetch(
        `/api/answers?roundId=${encodeURIComponent(
          roundId,
        )}`,
        {
          headers: {
            Accept: 'application/json',
          },
        },
      ),

      fetch(
        `/api/tie-breakers?roundId=${encodeURIComponent(
          roundId,
        )}`,
        {
          headers: {
            Accept: 'application/json',
          },
        },
      ),
    ])

    if (!answersResponse.ok) {
      throw new Error(
        'Unable to load round answers.',
      )
    }

    if (!tieBreakerResponse.ok) {
      throw new Error(
        'Unable to load the tie-breaker.',
      )
    }

    const [answers, tieBreaker] =
      await Promise.all([
        answersResponse.json(),
        tieBreakerResponse.json(),
      ])

    roundAnswers.value = Array.isArray(
      answers,
    )
      ? answers
      : []

    roundsStore.tieBreakers =
      roundsStore.tieBreakers.filter(
        (item) =>
          Number(item.roundId) !==
          Number(roundId),
      )

    if (tieBreaker) {
      roundsStore.tieBreakers.push(
        tieBreaker,
      )
    }
  } catch (loadError) {
    console.error(
      'Failed to load round results:',
      loadError,
    )

    error.value =
      loadError.message ||
      'The round results could not be loaded.'

    roundAnswers.value = []
  } finally {
    loading.value = false
  }
}

watch(
  () => props.show,
  async (isOpen) => {
    if (!isOpen) {
      return
    }

    await usersStore.loadUsers()
    await loadRoundResults()
  },
)
</script>

<template>
  <Teleport to="body">
    <Transition name="results-modal">
      <div
        v-if="show"
        class="modal-backdrop"
      >
        <section class="results-modal">
          <header>
            <small>Round Complete</small>

            <h1>Round Results</h1>

            <p v-if="gameStore.currentRound">
              {{
                gameStore.currentRound.title
              }}
              ·
              {{
                gameStore.currentRound
                  .pubName
              }}
            </p>
          </header>

          <div
            v-if="loading"
            class="state-message"
          >
            Loading results...
          </div>

          <div
            v-else-if="error"
            class="error-message"
          >
            {{ error }}
          </div>

          <div
            v-else
            class="results-content"
          >
            <article
              class="result-card winner-card"
            >
              <Trophy
                :size="38"
                stroke-width="1.8"
              />

              <small>
                {{
                  hasWinnerTie
                    ? 'Joint Winners'
                    : 'Winner'
                }}
              </small>

              <div
                v-for="player in winners"
                :key="player.id"
                class="player-result"
              >
                <AppAvatar
                  :name="player.name"
                  :image="player.avatar"
                  size="md"
                />

                <div>
                  <h2>
                    {{ player.name }}
                  </h2>

                  <p>
                    {{ player.points }}
                    points
                  </p>
                </div>
              </div>
            </article>

            <article
              v-if="hasWinnerTie"
              class="tie-notice"
            >
              <Scale
                :size="30"
                stroke-width="1.8"
              />

              <div>
                <strong>
                  First place is tied
                </strong>

                <p>
                  Use the tie-breaker to
                  choose the official round
                  winner. No points will be
                  awarded.
                </p>
              </div>
            </article>

            <article
              class="result-card loser-card"
            >
              <Beer
                :size="38"
                stroke-width="1.8"
              />

              <small>
                {{
                  losers.length > 1
                    ? 'Joint Losers'
                    : 'Loser'
                }}
              </small>

              <div
                v-for="player in losers"
                :key="player.id"
                class="player-result"
              >
                <AppAvatar
                  :name="player.name"
                  :image="player.avatar"
                  size="md"
                />

                <div>
                  <h2>
                    {{ player.name }}
                  </h2>

                  <p>
                    {{ player.points }}
                    points
                  </p>
                </div>
              </div>
            </article>

            <div class="score-list">
              <div
                v-for="(
                  player,
                  index
                ) in roundScores"
                :key="player.id"
                class="score-row"
                :class="{
                  tied:
                    hasWinnerTie &&
                    player.points ===
                      winners[0]?.points,
                }"
              >
                <span>
                  #{{ index + 1 }}
                </span>

                <strong>
                  {{ player.name }}
                </strong>

                <b>
                  {{ player.points }}
                </b>
              </div>
            </div>
          </div>

          <footer>
            <AppButton
              variant="dark"
              full
              @click="$emit('close')"
            >
              Back
            </AppButton>

            <AppButton
              v-if="hasWinnerTie"
              variant="secondary"
              full
              @click="
                handleTieBreakerAction
              "
            >
              {{ tieBreakerButtonLabel }}
            </AppButton>

            <AppButton
              full
              @click="$emit('end-round')"
            >
              End Round
            </AppButton>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(5, 7, 10, 0.84);
  backdrop-filter: blur(6px);
}

.results-modal {
  position: relative;
  z-index: 99999;
  width: 100%;
  max-width: 430px;
  max-height: calc(100dvh - 36px);
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 22px;
  background:
    radial-gradient(
      circle at top,
      rgba(214, 179, 106, 0.1),
      transparent 30%
    ),
    var(--bg);
  box-shadow:
    0 24px 70px
    rgba(0, 0, 0, 0.55);
}

header {
  padding: 24px 20px 18px;
  text-align: center;
}

header small,
.result-card small {
  color: var(--gold);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

header h1 {
  margin: 7px 0;
  color: var(--gold-light);
  font-family: var(--font-heading);
  font-size: 30px;
}

header p {
  margin: 0;
  color: var(--muted);
}

.results-content {
  display: grid;
  gap: 14px;
  padding: 0 18px 20px;
}

.result-card {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 20px;
  border-radius: 18px;
  text-align: center;
}

.winner-card {
  border: 1px solid var(--gold);
  background:
    rgba(214, 179, 106, 0.09);
  color: var(--gold-light);
}

.loser-card {
  border: 1px solid var(--burgundy);
  background:
    rgba(123, 45, 47, 0.12);
  color: #d98585;
}

.player-result {
  display: flex;
  align-items: center;
  gap: 12px;
}

.player-result h2 {
  margin: 0;
  color: var(--cream);
  font-size: 21px;
}

.player-result p {
  margin: 3px 0 0;
  color: var(--muted);
}

.tie-notice {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border: 1px solid
    rgba(214, 179, 106, 0.5);
  border-radius: 14px;
  background:
    rgba(214, 179, 106, 0.08);
  color: var(--gold);
}

.tie-notice strong {
  color: var(--gold-light);
}

.tie-notice p {
  margin: 5px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.45;
}

.score-list {
  display: grid;
  gap: 8px;
}

.score-row {
  display: grid;
  grid-template-columns:
    36px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-soft);
}

.score-row.tied {
  border-color:
    rgba(214, 179, 106, 0.5);
}

.score-row span {
  color: var(--gold);
  font-weight: 800;
}

.score-row b {
  color: var(--gold-light);
}

footer {
  position: sticky;
  bottom: 0;
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding:
    14px
    18px
    calc(
      14px +
      env(safe-area-inset-bottom)
    );
  border-top: 1px solid var(--border);
  background:
    rgba(15, 19, 26, 0.97);
}

.state-message,
.error-message {
  margin: 18px;
  padding: 16px;
  border-radius: 14px;
  text-align: center;
}

.state-message {
  color: var(--muted);
  background: var(--bg-soft);
}

.error-message {
  color: #f2a0a0;
  background:
    rgba(179, 71, 71, 0.12);
}

.results-modal-enter-active,
.results-modal-leave-active {
  transition: opacity 0.22s ease;
}

.results-modal-enter-from,
.results-modal-leave-to {
  opacity: 0;
}

@media (max-width: 430px) {
  footer {
    grid-template-columns: 1fr;
  }
}
</style>