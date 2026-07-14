<script setup>
import {
  computed,
  ref,
  watch,
} from 'vue'

import {
  Scale,
  UserCheck,
} from 'lucide-vue-next'

import AppAvatar from '@/components/base/AppAvatar.vue'
import AppButton from '@/components/base/AppButton.vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },

  round: {
    type: Object,
    default: null,
  },

  tieBreaker: {
    type: Object,
    default: null,
  },

  roundScores: {
    type: Array,
    default: () => [],
  },

  suggestedPlayers: {
    type: Array,
    default: () => [],
  },

  starting: {
    type: Boolean,
    default: false,
  },

  error: {
    type: String,
    default: '',
  },
})

const emit = defineEmits([
  'close',
  'start',
])

const selectedPlayerIds = ref([])

const sortedScores = computed(() => {
  return [...props.roundScores].sort(
    (a, b) => {
      if (
        Number(b.points) !==
        Number(a.points)
      ) {
        return (
          Number(b.points) -
          Number(a.points)
        )
      }

      return a.name.localeCompare(b.name)
    },
  )
})

const selectedPlayers = computed(() => {
  return sortedScores.value.filter(
    (player) =>
      selectedPlayerIds.value.includes(
        Number(player.id),
      ),
  )
})

const canStart = computed(() => {
  return (
    selectedPlayers.value.length >= 2 &&
    !props.starting
  )
})

function isSelected(playerId) {
  return selectedPlayerIds.value.includes(
    Number(playerId),
  )
}

function togglePlayer(playerId) {
  if (props.starting) {
    return
  }

  const normalizedId = Number(playerId)

  if (
    selectedPlayerIds.value.includes(
      normalizedId,
    )
  ) {
    selectedPlayerIds.value =
      selectedPlayerIds.value.filter(
        (id) => id !== normalizedId,
      )

    return
  }

  selectedPlayerIds.value = [
    ...selectedPlayerIds.value,
    normalizedId,
  ]
}

function selectSuggestedPlayers() {
  selectedPlayerIds.value =
    props.suggestedPlayers.map(
      (player) => Number(player.id),
    )
}

function selectAllPlayers() {
  selectedPlayerIds.value =
    sortedScores.value.map(
      (player) => Number(player.id),
    )
}

function clearSelection() {
  selectedPlayerIds.value = []
}

function startTieBreaker() {
  if (!canStart.value) {
    return
  }

  emit('start', {
    roundId: props.round?.id,
    tieBreakerId:
      props.tieBreaker?.id,

    participantUserIds:
      selectedPlayerIds.value,

    participants:
      selectedPlayers.value,
  })
}

watch(
  () => props.show,
  (isOpen) => {
    if (!isOpen) {
      selectedPlayerIds.value = []
      return
    }

    selectSuggestedPlayers()
  },
)
</script>

<template>
  <Teleport to="body">
    <Transition name="tie-modal">
      <div
        v-if="show"
        class="modal-backdrop"
      >
        <section class="tie-modal">
          <header>
            <div class="icon-circle">
              <Scale
                :size="36"
                stroke-width="1.7"
              />
            </div>

            <small>Round Tie-Breaker</small>

            <h1>Select Players</h1>

            <p v-if="round">
              Choose who should receive the
              tie-breaker for
              <strong>{{ round.pubName }}</strong>.
            </p>
          </header>

          <div
            v-if="tieBreaker"
            class="question-preview"
          >
            <small>Tie-Breaker Question</small>

            <strong>
              {{ tieBreaker.questionText }}
            </strong>

            <span>
              No leaderboard points will be
              awarded.
            </span>
          </div>

          <div class="selection-toolbar">
            <AppButton
              variant="dark"
              :disabled="starting"
              @click="selectSuggestedPlayers"
            >
              Select Tied Players
            </AppButton>

            <AppButton
              variant="dark"
              :disabled="starting"
              @click="selectAllPlayers"
            >
              Select All
            </AppButton>

            <AppButton
              variant="dark"
              :disabled="starting"
              @click="clearSelection"
            >
              Clear
            </AppButton>
          </div>

          <div
            v-if="error"
            class="error-message"
          >
            {{ error }}
          </div>

          <div class="score-list">
            <button
              v-for="(player, index) in sortedScores"
              :key="player.id"
              type="button"
              class="score-row"
              :class="{
                selected: isSelected(player.id),
              }"
              :disabled="starting"
              @click="togglePlayer(player.id)"
            >
              <span class="position">
                #{{ index + 1 }}
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

                <span>
                  {{ player.points }}
                  point{{
                    Number(player.points) === 1
                      ? ''
                      : 's'
                  }}
                </span>
              </div>

              <div
                class="selection-indicator"
                :class="{
                  selected: isSelected(
                    player.id,
                  ),
                }"
              >
                <UserCheck
                  v-if="isSelected(player.id)"
                  :size="20"
                  stroke-width="2"
                />

                <span v-else />
              </div>
            </button>
          </div>

          <p class="selection-message">
            {{
              selectedPlayers.length
            }}
            player{{
              selectedPlayers.length === 1
                ? ''
                : 's'
            }}
            selected. Choose at least two.
          </p>

          <footer>
            <AppButton
              variant="dark"
              full
              :disabled="starting"
              @click="$emit('close')"
            >
              Back
            </AppButton>

            <AppButton
              full
              :disabled="!canStart"
              @click="startTieBreaker"
            >
              {{
                starting
                  ? 'Starting Tie-Breaker...'
                  : 'Start Tie-Breaker'
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
  z-index: 1200;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(5, 7, 10, 0.88);
  backdrop-filter: blur(7px);
}

.tie-modal {
  width: 100%;
  max-width: 500px;
  max-height: calc(100dvh - 36px);
  overflow-y: auto;
  border: 1px solid
    rgba(214, 179, 106, 0.4);
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
    rgba(0, 0, 0, 0.6);
}

header {
  padding: 24px 20px 18px;
  text-align: center;
}

.icon-circle {
  display: grid;
  width: 76px;
  height: 76px;
  place-items: center;
  margin: 0 auto 16px;
  border: 1px solid var(--gold);
  border-radius: 50%;
  color: var(--gold);
  background: var(--bg);
}

header small,
.question-preview small {
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
  margin: 0 auto;
  max-width: 360px;
  color: var(--muted);
  line-height: 1.5;
}

header p strong {
  color: var(--cream);
}

.question-preview {
  display: grid;
  gap: 8px;
  margin: 0 18px 16px;
  padding: 16px;
  border: 1px solid
    rgba(214, 179, 106, 0.4);
  border-radius: 14px;
  background:
    rgba(214, 179, 106, 0.07);
}

.question-preview strong {
  color: var(--cream);
  line-height: 1.45;
}

.question-preview span {
  color: var(--muted);
  font-size: 12px;
}

.selection-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 18px 14px;
}

.score-list {
  display: grid;
  gap: 9px;
  padding: 0 18px;
}

.score-row {
  display: grid;
  grid-template-columns:
    34px auto minmax(0, 1fr) 36px;
  align-items: center;
  gap: 11px;
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-soft);
  color: var(--cream);
  padding: 12px;
  text-align: left;
  cursor: pointer;
}

.score-row.selected {
  border-color: var(--gold);
  background:
    rgba(214, 179, 106, 0.09);
  box-shadow:
    0 0 18px
    rgba(214, 179, 106, 0.1);
}

.score-row:disabled {
  cursor: not-allowed;
  opacity: 0.65;
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

.player-details span {
  display: block;
  margin-top: 3px;
  color: var(--muted);
  font-size: 12px;
}

.selection-indicator {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 50%;
  color: var(--gold);
}

.selection-indicator.selected {
  border-color: var(--gold);
  background:
    rgba(214, 179, 106, 0.13);
}

.selection-indicator > span {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--border);
}

.selection-message {
  margin: 14px 18px 0;
  color: var(--muted);
  text-align: center;
  font-size: 13px;
}

.error-message {
  margin: 0 18px 14px;
  padding: 14px;
  border: 1px solid
    rgba(239, 68, 68, 0.4);
  border-radius: 12px;
  background:
    rgba(239, 68, 68, 0.12);
  color: #fecaca;
}

footer {
  position: sticky;
  bottom: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 18px;
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

.tie-modal-enter-active,
.tie-modal-leave-active {
  transition: opacity 0.22s ease;
}

.tie-modal-enter-from,
.tie-modal-leave-to {
  opacity: 0;
}

@media (max-width: 430px) {
  .selection-toolbar {
    display: grid;
    grid-template-columns: 1fr;
  }

  footer {
    grid-template-columns: 1fr;
  }
}
</style>