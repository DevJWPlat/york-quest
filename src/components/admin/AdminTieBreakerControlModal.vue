<script setup>
import {
  computed,
  onUnmounted,
  ref,
  watch,
} from 'vue'

import {
  CheckCircle2,
  Scale,
  Trophy,
  XCircle,
} from 'lucide-vue-next'

import AppAvatar from '@/components/base/AppAvatar.vue'
import AppButton from '@/components/base/AppButton.vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },

  sessionId: {
    type: [Number, String],
    default: null,
  },
})

const emit = defineEmits([
  'close',
  'completed',
  'cancelled',
])

const session = ref(null)
const loading = ref(false)
const actionRunning = ref(false)
const error = ref('')

const selectedWinnerUserId = ref(null)

let refreshInterval

const participants = computed(() => {
  return Array.isArray(
    session.value?.participants,
  )
    ? session.value.participants
    : []
})

const submittedParticipants = computed(() => {
  return participants.value.filter(
    (participant) =>
      participant.hasSubmitted,
  )
})

const waitingParticipants = computed(() => {
  return participants.value.filter(
    (participant) =>
      !participant.hasSubmitted,
  )
})

const allSubmitted = computed(() => {
  return Boolean(
    participants.value.length > 0 &&
    submittedParticipants.value.length ===
      participants.value.length,
  )
})

const canComplete = computed(() => {
  return Boolean(
    selectedWinnerUserId.value &&
    !actionRunning.value,
  )
})

function clearState() {
  session.value = null
  error.value = ''
  selectedWinnerUserId.value = null
}

async function loadSession() {
  if (!props.sessionId) {
    clearState()
    return
  }

  loading.value = true
  error.value = ''

  try {
    const response = await fetch(
      `/api/tie-breaker-sessions?id=${encodeURIComponent(
        props.sessionId,
      )}`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
    )

    const responseText = await response.text()

    let data = null

    if (responseText) {
      try {
        data = JSON.parse(responseText)
      } catch {
        throw new Error(
          'The tie-breaker session returned an invalid response.',
        )
      }
    }

    if (!response.ok) {
      throw new Error(
        data?.error ||
          'Unable to load the tie-breaker session.',
      )
    }

    session.value = data
  } catch (loadError) {
    console.error(
      'Failed to load tie-breaker session:',
      loadError,
    )

    error.value =
      loadError.message ||
      'Unable to load the tie-breaker session.'
  } finally {
    loading.value = false
  }
}

function selectWinner(userId) {
  if (actionRunning.value) {
    return
  }

  selectedWinnerUserId.value =
    Number(userId)
}

async function completeTieBreaker() {
  if (
    !canComplete.value ||
    !session.value
  ) {
    return
  }

  actionRunning.value = true
  error.value = ''

  try {
    const response = await fetch(
      '/api/tie-breaker-sessions',
      {
        method: 'PATCH',

        headers: {
          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          action: 'complete',
          sessionId: session.value.id,
          winnerUserId:
            selectedWinnerUserId.value,
        }),
      },
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.error ||
          'Unable to complete the tie-breaker.',
      )
    }

    session.value = data

    emit('completed', data)
  } catch (completeError) {
    console.error(
      'Failed to complete tie-breaker:',
      completeError,
    )

    error.value =
      completeError.message ||
      'Unable to complete the tie-breaker.'
  } finally {
    actionRunning.value = false
  }
}

async function cancelTieBreaker() {
  if (
    !session.value ||
    actionRunning.value
  ) {
    return
  }

  const confirmed = window.confirm(
    'Cancel this tie-breaker and return everyone to the round-complete screen?',
  )

  if (!confirmed) {
    return
  }

  actionRunning.value = true
  error.value = ''

  try {
    const response = await fetch(
      '/api/tie-breaker-sessions',
      {
        method: 'PATCH',

        headers: {
          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          action: 'cancel',
          sessionId: session.value.id,
        }),
      },
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.error ||
          'Unable to cancel the tie-breaker.',
      )
    }

    session.value = data

    emit('cancelled', data)
  } catch (cancelError) {
    console.error(
      'Failed to cancel tie-breaker:',
      cancelError,
    )

    error.value =
      cancelError.message ||
      'Unable to cancel the tie-breaker.'
  } finally {
    actionRunning.value = false
  }
}

function closeModal() {
  if (actionRunning.value) {
    return
  }

  emit('close')
}

watch(
  () => props.show,
  async (isOpen) => {
    window.clearInterval(
      refreshInterval,
    )

    if (!isOpen) {
      clearState()
      return
    }

    await loadSession()

    refreshInterval =
      window.setInterval(() => {
        if (!actionRunning.value) {
          loadSession()
        }
      }, 2000)
  },
)

watch(
  () => props.sessionId,
  async (
    newSessionId,
    previousSessionId,
  ) => {
    if (
      props.show &&
      Number(newSessionId) !==
        Number(previousSessionId)
    ) {
      selectedWinnerUserId.value = null
      await loadSession()
    }
  },
)

onUnmounted(() => {
  window.clearInterval(
    refreshInterval,
  )
})
</script>

<template>
  <Teleport to="body">
    <Transition name="tie-control">
      <div
        v-if="show"
        class="modal-backdrop"
      >
        <section class="control-modal">
          <header>
            <div class="icon-circle">
              <Scale
                :size="38"
                stroke-width="1.7"
              />
            </div>

            <small>Round Tie-Breaker</small>

            <h1>Choose the Winner</h1>

            <p v-if="session">
              {{ session.roundName }}
            </p>
          </header>

          <div
            v-if="loading && !session"
            class="state-message"
          >
            Loading tie-breaker...
          </div>

          <div
            v-else-if="error"
            class="error-message"
          >
            {{ error }}
          </div>

          <div
            v-else-if="session"
            class="content"
          >
            <div class="question-card">
              <small>Question</small>

              <strong>
                {{
                  session.question
                    .questionText
                }}
              </strong>

              <p>
                Correct answer:
                <b>
                  {{
                    session.question
                      .correctAnswer ||
                    'Not set'
                  }}
                </b>
              </p>

              <p class="no-points">
                No points will be awarded.
              </p>
            </div>

            <div class="progress-card">
              <div>
                <small>Progress</small>

                <strong>
                  {{
                    submittedParticipants.length
                  }}
                  /
                  {{
                    participants.length
                  }}
                  submitted
                </strong>
              </div>

              <span
                :class="{
                  complete: allSubmitted,
                }"
              >
                {{
                  allSubmitted
                    ? 'All answered'
                    : 'Waiting'
                }}
              </span>
            </div>

            <div class="participant-list">
              <button
                v-for="participant in participants"
                :key="participant.userId"
                type="button"
                class="participant-row"
                :class="{
                  selected:
                    Number(
                      selectedWinnerUserId,
                    ) ===
                    Number(
                      participant.userId,
                    ),
                  submitted:
                    participant.hasSubmitted,
                }"
                :disabled="
                  actionRunning ||
                  !participant.hasSubmitted
                "
                @click="
                  selectWinner(
                    participant.userId,
                  )
                "
              >
                <AppAvatar
                  :name="participant.name"
                  :image="participant.avatar"
                  size="md"
                />

                <div class="participant-details">
                  <strong>
                    {{ participant.name }}
                  </strong>

                  <p
                    v-if="
                      participant.hasSubmitted
                    "
                  >
                    Answer:
                    <b>
                      {{
                        participant.answer
                      }}
                    </b>
                  </p>

                  <p v-else>
                    Waiting for answer
                  </p>
                </div>

                <div
                  class="answer-status"
                  :class="{
                    submitted:
                      participant.hasSubmitted,
                  }"
                >
                  <CheckCircle2
                    v-if="
                      participant.hasSubmitted
                    "
                    :size="22"
                    stroke-width="1.8"
                  />

                  <XCircle
                    v-else
                    :size="22"
                    stroke-width="1.8"
                  />
                </div>

                <div
                  v-if="
                    Number(
                      selectedWinnerUserId,
                    ) ===
                    Number(
                      participant.userId,
                    )
                  "
                  class="winner-badge"
                >
                  <Trophy
                    :size="16"
                    stroke-width="1.9"
                  />

                  Winner
                </div>
              </button>
            </div>

            <p class="selection-help">
              Select a submitted player as
              the official round winner.
            </p>
          </div>

          <footer>
            <AppButton
              variant="dark"
              full
              :disabled="actionRunning"
              @click="closeModal"
            >
              Close
            </AppButton>

            <AppButton
              variant="dark"
              full
              :disabled="
                actionRunning ||
                !session
              "
              @click="cancelTieBreaker"
            >
              {{
                actionRunning
                  ? 'Please Wait...'
                  : 'Cancel Tie-Breaker'
              }}
            </AppButton>

            <AppButton
              full
              :disabled="!canComplete"
              @click="completeTieBreaker"
            >
              {{
                actionRunning
                  ? 'Saving Winner...'
                  : 'Confirm Winner'
              }}
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
  z-index: 1300;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(5, 7, 10, 0.9);
  backdrop-filter: blur(7px);
}

.control-modal {
  width: 100%;
  max-width: 520px;
  max-height: calc(100dvh - 36px);
  overflow-y: auto;
  border: 1px solid
    rgba(214, 179, 106, 0.45);
  border-radius: 22px;
  background:
    radial-gradient(
      circle at top,
      rgba(214, 179, 106, 0.12),
      transparent 30%
    ),
    var(--bg);
  box-shadow:
    0 24px 70px
    rgba(0, 0, 0, 0.62);
}

header {
  padding: 24px 20px 18px;
  text-align: center;
}

.icon-circle {
  display: grid;
  width: 78px;
  height: 78px;
  place-items: center;
  margin: 0 auto 16px;
  border: 1px solid var(--gold);
  border-radius: 50%;
  color: var(--gold);
  background: var(--bg);
}

header small,
.question-card small,
.progress-card small {
  display: block;
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

.content {
  display: grid;
  gap: 14px;
  padding: 0 18px 20px;
}

.question-card,
.progress-card {
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-soft);
}

.question-card {
  display: grid;
  gap: 8px;
}

.question-card strong {
  color: var(--cream);
  line-height: 1.45;
}

.question-card p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.question-card p b {
  color: var(--gold-light);
}

.no-points {
  color: var(--gold) !important;
  font-weight: 700;
}

.progress-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.progress-card strong {
  display: block;
  margin-top: 5px;
  color: var(--cream);
}

.progress-card > span {
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--muted);
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

.progress-card > span.complete {
  border-color:
    rgba(34, 197, 94, 0.4);
  color: #bbf7d0;
}

.participant-list {
  display: grid;
  gap: 9px;
}

.participant-row {
  position: relative;
  display: grid;
  grid-template-columns:
    auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-soft);
  color: var(--cream);
  padding: 13px;
  text-align: left;
}

.participant-row.submitted {
  cursor: pointer;
}

.participant-row.selected {
  border-color: var(--gold);
  background:
    rgba(214, 179, 106, 0.09);
  box-shadow:
    0 0 18px
    rgba(214, 179, 106, 0.1);
}

.participant-row:disabled {
  cursor: not-allowed;
  opacity: 0.66;
}

.participant-details {
  min-width: 0;
}

.participant-details strong {
  display: block;
  color: var(--cream);
}

.participant-details p {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.4;
}

.participant-details p b {
  color: var(--gold-light);
}

.answer-status {
  color: #d98585;
}

.answer-status.submitted {
  color: #8fd19e;
}

.winner-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 5px;
  border-radius: 999px;
  background: var(--gold);
  color: #11151b;
  padding: 4px 7px;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
}

.selection-help {
  margin: 0;
  color: var(--muted);
  text-align: center;
  font-size: 13px;
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
  border: 1px solid
    rgba(239, 68, 68, 0.4);
  background:
    rgba(239, 68, 68, 0.12);
  color: #fecaca;
}

.tie-control-enter-active,
.tie-control-leave-active {
  transition: opacity 0.22s ease;
}

.tie-control-enter-from,
.tie-control-leave-to {
  opacity: 0;
}

@media (max-width: 480px) {
  footer {
    grid-template-columns: 1fr;
  }
}
</style>