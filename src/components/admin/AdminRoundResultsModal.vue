<script setup>
import {
  computed,
  ref,
  watch,
} from 'vue'

import {
  Beer,
  CheckCircle2,
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
const latestTieBreakerSession = ref(null)

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

const hasCompletedTieBreaker = computed(() => {
  return Boolean(
    latestTieBreakerSession.value?.status ===
      'complete' &&
    latestTieBreakerSession.value
      ?.winnerUserId,
  )
})

const baseRoundScores = computed(() => {
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

const roundScores = computed(() => {
  const scores = [...baseRoundScores.value]

  if (!hasCompletedTieBreaker.value) {
    return scores
  }

  const winnerUserId = Number(
    latestTieBreakerSession.value
      ?.winnerUserId,
  )

  return scores.sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points
    }

    const aIsWinner =
      Number(a.id) === winnerUserId

    const bIsWinner =
      Number(b.id) === winnerUserId

    if (aIsWinner && !bIsWinner) {
      return -1
    }

    if (!aIsWinner && bIsWinner) {
      return 1
    }

    return a.name.localeCompare(b.name)
  })
})

const scoreWinners = computed(() => {
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
  return scoreWinners.value.length > 1
})

const tieBreakerWinner = computed(() => {
  if (!hasCompletedTieBreaker.value) {
    return null
  }

  const winnerUserId = Number(
    latestTieBreakerSession.value
      .winnerUserId,
  )

  return (
    roundScores.value.find(
      (player) =>
        Number(player.id) === winnerUserId,
    ) || null
  )
})

const officialWinners = computed(() => {
  if (tieBreakerWinner.value) {
    return [tieBreakerWinner.value]
  }

  return scoreWinners.value
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

const winnerHeading = computed(() => {
  if (hasCompletedTieBreaker.value) {
    return 'Tie-Breaker Winner'
  }

  return hasWinnerTie.value
    ? 'Joint Winners'
    : 'Winner'
})

function isScoreWinner(player) {
  if (!scoreWinners.value.length) {
    return false
  }

  return (
    Number(player.points) ===
    Number(scoreWinners.value[0].points)
  )
}

function isOfficialWinner(player) {
  return officialWinners.value.some(
    (winner) =>
      Number(winner.id) ===
      Number(player.id),
  )
}

function handleTieBreakerAction() {
  if (
    !gameStore.currentRound ||
    hasCompletedTieBreaker.value
  ) {
    return
  }

  if (hasUsableTieBreaker.value) {
    emit('use-tie-breaker', {
      roundId:
        gameStore.currentRound.id,

      tieBreaker:
        currentRoundTieBreaker.value,

      tiedPlayers:
        scoreWinners.value,

      roundScores:
        roundScores.value,
    })

    return
  }

  emit('create-tie-breaker', {
    roundId:
      gameStore.currentRound.id,
  })
}

async function parseResponse(
  response,
  fallbackMessage,
) {
  const responseText =
    await response.text()

  let data = null

  if (responseText) {
    try {
      data = JSON.parse(responseText)
    } catch {
      throw new Error(
        `${fallbackMessage} The server returned an invalid response.`,
      )
    }
  }

  if (!response.ok) {
    throw new Error(
      data?.error || fallbackMessage,
    )
  }

  return data
}

async function loadRoundResults() {
  if (!gameStore.currentRound) {
    return
  }

  loading.value = true
  error.value = ''

  // Clear any result left in memory from a previous test.
  latestTieBreakerSession.value = null
  roundAnswers.value = []

  try {
    const roundId =
      gameStore.currentRound.id

    const [
      answersResponse,
      tieBreakerResponse,
      sessionResponse,
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

      fetch(
        `/api/tie-breaker-sessions?roundId=${encodeURIComponent(
          roundId,
        )}`,
        {
          headers: {
            Accept: 'application/json',
          },
        },
      ),
    ])

    const [
      answers,
      tieBreaker,
      tieBreakerSession,
    ] = await Promise.all([
      parseResponse(
        answersResponse,
        'Unable to load round answers.',
      ),

      parseResponse(
        tieBreakerResponse,
        'Unable to load the tie-breaker.',
      ),

      parseResponse(
        sessionResponse,
        'Unable to load the latest tie-breaker session.',
      ),
    ])

    roundAnswers.value = Array.isArray(
      answers,
    )
      ? answers
      : []

    latestTieBreakerSession.value =
      tieBreakerSession || null

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
    latestTieBreakerSession.value = null
  } finally {
    loading.value = false
  }
}

watch(
  () => props.show,
  async (isOpen) => {
    if (!isOpen) {
      latestTieBreakerSession.value = null
      roundAnswers.value = []
      error.value = ''
      return
    }

    latestTieBreakerSession.value = null

    await usersStore.loadUsers()
    await loadRoundResults()
  },
)

watch(
  () => gameStore.currentRound?.id,
  async (newRoundId, previousRoundId) => {
    if (
      Number(newRoundId) ===
      Number(previousRoundId)
    ) {
      return
    }

    latestTieBreakerSession.value = null
    roundAnswers.value = []

    if (props.show && newRoundId) {
      await loadRoundResults()
    }
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
                {{ winnerHeading }}
              </small>

              <div
                v-for="player in officialWinners"
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

                  <span
                    v-if="
                      hasCompletedTieBreaker
                    "
                    class="winner-reason"
                  >
                    Official winner after
                    tie-breaker
                  </span>
                </div>
              </div>
            </article>

            <article
              v-if="
                hasWinnerTie &&
                !hasCompletedTieBreaker
              "
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
              v-else-if="
                hasCompletedTieBreaker
              "
              class="tie-notice tie-complete"
            >
              <CheckCircle2
                :size="30"
                stroke-width="1.8"
              />

              <div>
                <strong>
                  Tie-breaker complete
                </strong>

                <p>
                  {{
                    latestTieBreakerSession
                      .winnerName ||
                    tieBreakerWinner?.name
                  }}
                  has been selected as the
                  official round winner. The
                  tied scores remain unchanged.
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

                <div class="player-points-container">
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
                    isScoreWinner(player),

                  official:
                    hasCompletedTieBreaker &&
                    isOfficialWinner(player),
                }"
              >
                <span>
                  #{{ index + 1 }}
                </span>

                <strong>
                  {{ player.name }}

                  <em
                    v-if="
                      hasCompletedTieBreaker &&
                      isOfficialWinner(player)
                    "
                  >
                    Tie-breaker winner
                  </em>
                </strong>

                <b>
                  {{ player.points }}
                </b>
              </div>
            </div>
          </div>

          <footer
            :class="{
              'two-actions':
                !hasWinnerTie ||
                hasCompletedTieBreaker,
            }"
          >
            <AppButton
              variant="dark"
              full
              @click="$emit('close')"
            >
              Back
            </AppButton>

            <AppButton
              v-if="
                hasWinnerTie &&
                !hasCompletedTieBreaker
              "
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
  width: 100%;
}

.player-points-container {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: space-between;
  width: 100%;
}

.player-result h2 {
  margin: 0;
  color: var(--cream);
  font-size: 21px;
}

.player-result p {
  margin: 0;
  color: var(--muted);
}

.winner-reason {
  display: block;
  margin-top: 5px;
  color: var(--gold);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
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

.tie-notice.tie-complete {
  border-color:
    rgba(34, 197, 94, 0.4);
  background:
    rgba(34, 197, 94, 0.08);
  color: #8fd19e;
}

.tie-notice strong {
  color: var(--gold-light);
}

.tie-notice.tie-complete strong {
  color: #bbf7d0;
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

.score-row.official {
  border-color: var(--gold);
  background:
    rgba(214, 179, 106, 0.1);
  box-shadow:
    0 0 16px
    rgba(214, 179, 106, 0.1);
}

.score-row span {
  color: var(--gold);
  font-weight: 800;
}

.score-row strong {
  min-width: 0;
}

.score-row strong em {
  display: block;
  margin-top: 3px;
  color: var(--gold);
  font-size: 10px;
  font-style: normal;
  text-transform: uppercase;
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

footer.two-actions {
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
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
  footer,
  footer.two-actions {
    grid-template-columns: 1fr;
  }
}
</style>