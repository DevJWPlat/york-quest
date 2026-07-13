<script setup>
import { computed, ref, watch } from 'vue'
import { Check, X } from 'lucide-vue-next'

import AppAvatar from '@/components/base/AppAvatar.vue'
import AppButton from '@/components/base/AppButton.vue'

import { useGameStore } from '@/stores/gameStore'
import { useUsersStore } from '@/stores/usersStore'

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'close',
  'start-next-question',
  'view-round-results',
])

const gameStore = useGameStore()
const usersStore = useUsersStore()

const loading = ref(false)
const markingAnswerId = ref(null)
const error = ref('')

const playerUsers = computed(() => {
  return usersStore.players
})

const currentAnswers = computed(() => {
  if (!gameStore.currentQuestion) return []

  return gameStore.answers.filter(
    (answer) =>
      Number(answer.questionId) ===
      Number(gameStore.currentQuestion.id),
  )
})

const markedCount = computed(() => {
  return currentAnswers.value.filter(
    (answer) => answer.isCorrect !== null,
  ).length
})

const allPlayersAnswered = computed(() => {
  return (
    playerUsers.value.length > 0 &&
    currentAnswers.value.length === playerUsers.value.length
  )
})

const allAnswersMarked = computed(() => {
  return (
    currentAnswers.value.length > 0 &&
    currentAnswers.value.every(
      (answer) => answer.isCorrect !== null,
    )
  )
})

const canContinue = computed(() => {
  return allPlayersAnswered.value && allAnswersMarked.value
})

const isLastQuestion = computed(() => {
  if (!gameStore.currentQuestion) return false

  const currentQuestionIndex =
    gameStore.currentRoundQuestions.findIndex(
      (question) =>
        Number(question.id) ===
        Number(gameStore.currentQuestion.id),
    )

  return (
    currentQuestionIndex !== -1 &&
    currentQuestionIndex ===
      gameStore.currentRoundQuestions.length - 1
  )
})

function getPlayer(userId) {
  return usersStore.getUserById(userId)
}

function isMarkedCorrect(answer) {
  return answer.isCorrect === true || answer.isCorrect === 1
}

function isMarkedWrong(answer) {
  return answer.isCorrect === false || answer.isCorrect === 0
}

async function loadAnswers() {
  if (!gameStore.currentQuestion) return

  loading.value = true
  error.value = ''

  try {
    await gameStore.loadAnswers({
      questionId: gameStore.currentQuestion.id,
    })
  } catch (loadError) {
    console.error('Failed to load answers:', loadError)
    error.value = 'The answers could not be loaded.'
  } finally {
    loading.value = false
  }
}

async function markAnswer(answer, isCorrect) {
  if (markingAnswerId.value) return

  markingAnswerId.value = answer.id
  error.value = ''

  try {
    const result = await gameStore.markAnswer(
      answer.id,
      isCorrect,
    )

    if (!result?.success) {
      error.value =
        result?.error || 'The answer could not be marked.'
    }
  } finally {
    markingAnswerId.value = null
  }
}

function handleMainAction() {
  if (!canContinue.value) {
    emit('close')
    return
  }

  if (isLastQuestion.value) {
    emit('view-round-results')
    return
  }

  emit('start-next-question')
}

function closeModal() {
  emit('close')
}

watch(
  () => props.show,
  async (isOpen) => {
    if (!isOpen) return

    await usersStore.loadUsers()
    await loadAnswers()
  },
)
</script>

<template>
  <Teleport to="body">
    <Transition name="marking-modal">
      <div v-if="show" class="modal-backdrop">
        <section
          class="marking-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="marking-title"
        >
          <header class="modal-header">
            <div>
              <small>Current Question</small>
              <h1 id="marking-title">Mark Answers</h1>
            </div>

            <span class="marked-count">
              {{ markedCount }} / {{ currentAnswers.length }} marked
            </span>
          </header>

          <div
            v-if="gameStore.currentQuestion"
            class="correct-answer"
          >
            <small>Correct Answer</small>

            <h2>
              {{ gameStore.currentQuestion.correctAnswer }}
            </h2>

            <p>{{ gameStore.currentQuestion.text }}</p>
          </div>

          <p v-if="error" class="error-message">
            {{ error }}
          </p>

          <div v-if="loading" class="state-message">
            Loading answers...
          </div>

          <div
            v-else-if="!currentAnswers.length"
            class="state-message"
          >
            Nobody has submitted an answer yet.
          </div>

          <div v-else class="answer-list">
            <article
              v-for="answer in currentAnswers"
              :key="answer.id"
              class="answer-card"
            >
              <div class="player-details">
                <AppAvatar
                  :name="getPlayer(answer.userId)?.name || 'Player'"
                  :image="getPlayer(answer.userId)?.avatar || ''"
                  size="md"
                />

                <div>
                  <strong>
                    {{ getPlayer(answer.userId)?.name || 'Unknown player' }}
                  </strong>

                  <p>{{ answer.answer }}</p>
                </div>
              </div>

              <div class="marking-controls">
                <button
                  class="mark-button mark-button--correct"
                  :class="{
                    active: isMarkedCorrect(answer),
                  }"
                  type="button"
                  :disabled="markingAnswerId === answer.id"
                  :aria-label="`Mark ${getPlayer(answer.userId)?.name} correct`"
                  @click="markAnswer(answer, true)"
                >
                  <Check :size="28" stroke-width="2.5" />
                </button>

                <button
                  class="mark-button mark-button--wrong"
                  :class="{
                    active: isMarkedWrong(answer),
                  }"
                  type="button"
                  :disabled="markingAnswerId === answer.id"
                  :aria-label="`Mark ${getPlayer(answer.userId)?.name} incorrect`"
                  @click="markAnswer(answer, false)"
                >
                  <X :size="28" stroke-width="2.5" />
                </button>
              </div>
            </article>
          </div>

          <footer class="modal-footer">
                <AppButton
                    full
                    @click="handleMainAction"
                >
                    <template v-if="canContinue">
                    {{
                        isLastQuestion
                        ? 'View Round Results'
                        : 'Start Next Question'
                    }}
                    </template>

                    <template v-else>
                    Save Changes
                    </template>
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
  z-index: 1000;
  background: rgba(5, 7, 10, 0.82);
  backdrop-filter: blur(5px);
}

.marking-modal {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  background:
    radial-gradient(
      circle at top,
      rgba(214, 179, 106, 0.08),
      transparent 32%
    ),
    var(--bg);
}

.modal-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  border-bottom: 1px solid var(--border);
}

.modal-header small,
.correct-answer small {
  display: block;
  color: var(--gold);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.modal-header h1 {
  margin: 5px 0 0;
  color: var(--cream);
  font-family: var(--font-heading);
  font-size: 25px;
}

.marked-count {
  flex: 0 0 auto;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--muted);
  padding: 8px 11px;
  font-size: 12px;
  font-weight: 700;
}

.correct-answer {
  position: sticky;
  top: 0;
  z-index: 4;
  margin: 14px 18px 4px;
  padding: 16px;
  border: 1px solid var(--gold);
  border-radius: 16px;
  background: rgba(23, 28, 36, 0.98);
  box-shadow:
    0 12px 30px rgba(0, 0, 0, 0.4),
    0 0 20px rgba(214, 179, 106, 0.1);
}

.correct-answer h2 {
  margin: 7px 0;
  color: var(--gold-light);
  font-size: 21px;
}

.correct-answer p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.45;
}

.answer-list {
  display: grid;
  gap: 12px;
  overflow-y: auto;
  padding: 14px 18px 110px;
}

.answer-card {
  display: grid;
  gap: 16px;
  padding: 15px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--bg-soft);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.24);
}

.player-details {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 12px;
}

.player-details strong {
  color: var(--cream);
}

.player-details p {
  margin: 5px 0 0;
  color: var(--gold-light);
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.marking-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.mark-button {
  display: grid;
  min-height: 52px;
  place-items: center;
  border-radius: 13px;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.mark-button:not(.active) {
  opacity: 0.38;
}

.mark-button--correct {
  border: 1px solid #5da46b;
  background: rgba(79, 138, 91, 0.14);
  color: #8fd19e;
}

.mark-button--correct.active {
  opacity: 1;
  background: #4f8a5b;
  color: white;
  box-shadow: 0 0 20px rgba(79, 138, 91, 0.42);
}

.mark-button--wrong {
  border: 1px solid #c65a5a;
  background: rgba(179, 71, 71, 0.14);
  color: #ee9292;
}

.mark-button--wrong.active {
  opacity: 1;
  background: var(--error);
  color: white;
  box-shadow: 0 0 20px rgba(179, 71, 71, 0.42);
}

.mark-button:active {
  transform: scale(0.97);
}

.mark-button:disabled {
  cursor: wait;
}

.modal-footer {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 6;
  padding:
    14px
    18px
    calc(14px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--border);
  background: rgba(15, 19, 26, 0.96);
  backdrop-filter: blur(12px);
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
  background: rgba(179, 71, 71, 0.12);
}

.marking-modal-enter-active,
.marking-modal-leave-active {
  transition: opacity 0.24s ease;
}

.marking-modal-enter-active .marking-modal,
.marking-modal-leave-active .marking-modal {
  transition: transform 0.3s ease;
}

.marking-modal-enter-from,
.marking-modal-leave-to {
  opacity: 0;
}

.marking-modal-enter-from .marking-modal,
.marking-modal-leave-to .marking-modal {
  transform: translateY(30px);
}
</style>