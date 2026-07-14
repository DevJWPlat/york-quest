<script setup>
import {
  computed,
  onMounted,
  ref,
} from 'vue'

import AdminShell from '@/components/layout/AdminShell.vue'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'

import { useRoundsStore } from '@/stores/roundsStore'

const roundsStore = useRoundsStore()

const selectedRoundId = ref(null)
const editingQuestionId = ref(null)

const roundForm = ref(createEmptyRoundForm())
const questionForm = ref(createEmptyQuestionForm())

const pageError = ref('')
const successMessage = ref('')

function createEmptyRoundForm() {
  return {
    name: '',
    location: '',
    description: '',
    imageUrl: '',
    isActive: true,
  }
}

function createEmptyQuestionForm() {
  return {
    questionType: 'text',
    questionText: '',
    points: 1,
    correctAnswer: '',
    optionsText: '',
    imageUrl: '',
    isActive: true,
  }
}

const selectedRound = computed(() => {
  return roundsStore.getRoundById(
    selectedRoundId.value,
  )
})

const selectedQuestions = computed(() => {
  if (!selectedRoundId.value) {
    return []
  }

  return roundsStore.getQuestionsByRound(
    selectedRoundId.value,
  )
})

const isEditingQuestion = computed(() => {
  return editingQuestionId.value !== null
})

function roundLabel(round) {
  const roundIndex = roundsStore.allRounds.findIndex(
    (item) => Number(item.id) === Number(round.id),
  )

  return `Pub ${roundIndex + 1}`
}

function questionTypeLabel(questionType) {
  const labels = {
    text: 'Text',
    long_text: 'Long Text',
    number: 'Number',
    multiple_choice: 'Multiple Choice',
    image: 'Image Question',
  }

  return labels[questionType] || questionType
}

function clearMessages() {
  pageError.value = ''
  successMessage.value = ''
  roundsStore.clearError()
}

function showError(error, fallbackMessage) {
  pageError.value =
    error instanceof Error
      ? error.message
      : fallbackMessage
}

function selectRound(round) {
  clearMessages()

  selectedRoundId.value = round.id
  editingQuestionId.value = null

  roundForm.value = {
    name: round.name || '',
    location: round.location || '',
    description: round.description || '',
    imageUrl: round.imageUrl || '',
    isActive: Boolean(round.isActive),
  }

  questionForm.value = createEmptyQuestionForm()
}

function selectFirstRound() {
  const firstRound = roundsStore.allRounds[0]

  if (!firstRound) {
    selectedRoundId.value = null
    roundForm.value = createEmptyRoundForm()
    return
  }

  selectRound(firstRound)
}

function startNewRound() {
  clearMessages()

  selectedRoundId.value = null
  editingQuestionId.value = null
  roundForm.value = createEmptyRoundForm()
  questionForm.value = createEmptyQuestionForm()
}

async function saveRound() {
  clearMessages()

  if (!roundForm.value.name.trim()) {
    pageError.value = 'Pub name is required.'
    return
  }

  try {
    if (selectedRound.value) {
      const updatedRound =
        await roundsStore.updateRound({
          id: selectedRound.value.id,
          name: roundForm.value.name,
          location: roundForm.value.location,
          description: roundForm.value.description,
          imageUrl: roundForm.value.imageUrl,
          isActive: roundForm.value.isActive,
        })

      selectedRoundId.value = updatedRound.id
      successMessage.value =
        'Round updated successfully.'
    } else {
      const createdRound =
        await roundsStore.addRound({
          name: roundForm.value.name,
          location: roundForm.value.location,
          description: roundForm.value.description,
          imageUrl: roundForm.value.imageUrl,
          isActive: roundForm.value.isActive,
        })

      selectRound(createdRound)

      successMessage.value =
        'Round added successfully.'
    }
  } catch (error) {
    showError(
      error,
      'Unable to save the round.',
    )
  }
}

async function removeRound(roundId) {
  const round = roundsStore.getRoundById(roundId)

  if (!round) return

  const confirmed = window.confirm(
    `Delete ${round.name} and all of its questions and answers?`,
  )

  if (!confirmed) return

  clearMessages()

  try {
    await roundsStore.deleteRound(roundId)

    successMessage.value =
      'Round deleted successfully.'

    selectFirstRound()
  } catch (error) {
    showError(
      error,
      'Unable to delete the round.',
    )
  }
}

function getQuestionOptions() {
  return questionForm.value.optionsText
    .split('\n')
    .map((option) => option.trim())
    .filter(Boolean)
}

async function saveQuestion() {
  clearMessages()

  if (!selectedRound.value) {
    pageError.value =
      'Select or create a round first.'
    return
  }

  if (!questionForm.value.questionText.trim()) {
    pageError.value =
      'Question text is required.'
    return
  }

  const options = getQuestionOptions()

  if (
    questionForm.value.questionType ===
      'multiple_choice' &&
    options.length < 2
  ) {
    pageError.value =
      'Multiple-choice questions need at least two options.'
    return
  }

  const questionData = {
    roundId: selectedRound.value.id,
    questionType:
      questionForm.value.questionType,
    questionText:
      questionForm.value.questionText,
    correctAnswer:
      questionForm.value.correctAnswer,
    options,
    imageUrl: questionForm.value.imageUrl,
    points: Number(
      questionForm.value.points || 0,
    ),
    isActive:
      questionForm.value.isActive,
  }

  try {
    if (isEditingQuestion.value) {
      await roundsStore.updateQuestion({
        id: editingQuestionId.value,
        ...questionData,
      })

      successMessage.value =
        'Question updated successfully.'
    } else {
      await roundsStore.addQuestion(
        questionData,
      )

      successMessage.value =
        'Question added successfully.'
    }

    cancelQuestionEditing()
  } catch (error) {
    showError(
      error,
      'Unable to save the question.',
    )
  }
}

function editQuestion(question) {
  clearMessages()

  editingQuestionId.value = question.id

  questionForm.value = {
    questionType:
      question.questionType || 'text',
    questionText:
      question.questionText || '',
    points: Number(question.points ?? 1),
    correctAnswer:
      question.correctAnswer || '',
    optionsText: Array.isArray(question.options)
      ? question.options.join('\n')
      : '',
    imageUrl: question.imageUrl || '',
    isActive: Boolean(question.isActive),
  }

  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

function cancelQuestionEditing() {
  editingQuestionId.value = null
  questionForm.value = createEmptyQuestionForm()
}

async function removeQuestion(question) {
  const confirmed = window.confirm(
    'Delete this question and all submitted answers for it?',
  )

  if (!confirmed) return

  clearMessages()

  try {
    await roundsStore.deleteQuestion(
      question.id,
    )

    if (
      Number(editingQuestionId.value) ===
      Number(question.id)
    ) {
      cancelQuestionEditing()
    }

    successMessage.value =
      'Question deleted successfully.'
  } catch (error) {
    showError(
      error,
      'Unable to delete the question.',
    )
  }
}

onMounted(async () => {
  clearMessages()

  try {
    await roundsStore.loadQuizContent()
    selectFirstRound()
  } catch (error) {
    showError(
      error,
      'Unable to load rounds and questions.',
    )
  }
})
</script>

<template>
  <AdminShell>
    <AppCard
      v-if="roundsStore.isLoading"
      class="admin-card"
    >
      <p>Loading rounds and questions...</p>
    </AppCard>

    <template v-else>
      <div
        v-if="pageError || roundsStore.error"
        class="message message-error"
      >
        {{ pageError || roundsStore.error }}
      </div>

      <div
        v-if="successMessage"
        class="message message-success"
      >
        {{ successMessage }}
      </div>

      <AppCard class="admin-card">
        <div class="section-heading">
          <div>
            <small>Rounds</small>
            <h1>Quiz content</h1>
          </div>

          <AppButton
            variant="dark"
            :disabled="roundsStore.isSaving"
            @click="startNewRound"
          >
            New Round
          </AppButton>
        </div>

        <p
          v-if="!roundsStore.allRounds.length"
          class="empty-state"
        >
          No rounds have been added yet.
        </p>

        <div
          v-else
          class="round-tabs"
        >
          <button
            v-for="round in roundsStore.allRounds"
            :key="round.id"
            type="button"
            :class="{
              active:
                Number(selectedRoundId) ===
                Number(round.id),
              inactive: !round.isActive,
            }"
            @click="selectRound(round)"
          >
            <strong>{{ roundLabel(round) }}</strong>
            <span>{{ round.name }}</span>
          </button>
        </div>
      </AppCard>

      <div class="editor-layout">
        <div class="editor-main">
          <AppCard class="admin-card">
            <small>
              {{
                selectedRound
                  ? 'Edit Round'
                  : 'Add Round'
              }}
            </small>

            <div class="form-grid">
              <AppInput
                v-model="roundForm.name"
                label="Pub Name"
                placeholder="The Golden Fleece"
              />

              <AppInput
                v-model="roundForm.location"
                label="Location"
                placeholder="York"
              />

              <label class="field">
                <span>Round Introduction</span>

                <textarea
                  v-model="roundForm.description"
                  rows="4"
                  placeholder="Add an introduction or instructions for this pub"
                />
              </label>

              <AppInput
                v-model="roundForm.imageUrl"
                label="Round Image URL"
                placeholder="Optional for now"
              />

              <label class="checkbox-field">
                <input
                  v-model="roundForm.isActive"
                  type="checkbox"
                />

                <span>
                  Round is active and visible
                </span>
              </label>

              <div class="button-row">
                <AppButton
                  full
                  :disabled="roundsStore.isSaving"
                  @click="saveRound"
                >
                  {{
                    roundsStore.isSaving
                      ? 'Saving...'
                      : selectedRound
                        ? 'Save Round'
                        : 'Add Round'
                  }}
                </AppButton>

                <AppButton
                  v-if="selectedRound"
                  variant="dark"
                  :disabled="roundsStore.isSaving"
                  @click="
                    removeRound(selectedRound.id)
                  "
                >
                  Delete Round
                </AppButton>
              </div>
            </div>
          </AppCard>

          <AppCard
            v-if="selectedRound"
            class="admin-card"
          >
            <div class="section-heading">
              <div>
                <small>
                  {{
                    isEditingQuestion
                      ? 'Edit Question'
                      : 'Add Question'
                  }}
                </small>

                <h2>
                  {{ roundLabel(selectedRound) }}:
                  {{ selectedRound.name }}
                </h2>
              </div>

              <AppButton
                v-if="isEditingQuestion"
                variant="dark"
                @click="cancelQuestionEditing"
              >
                Cancel Edit
              </AppButton>
            </div>

            <div class="form-grid">
              <label class="field">
                <span>Question Type</span>

                <select
                  v-model="
                    questionForm.questionType
                  "
                >
                  <option value="text">
                    Text
                  </option>

                  <option value="long_text">
                    Long Text
                  </option>

                  <option value="number">
                    Number
                  </option>

                  <option value="multiple_choice">
                    Multiple Choice
                  </option>

                  <option value="image">
                    Image Question
                  </option>
                </select>
              </label>

              <label class="field">
                <span>Question</span>

                <textarea
                  v-model="
                    questionForm.questionText
                  "
                  rows="4"
                  placeholder="Enter the question"
                />
              </label>

              <AppInput
                v-model="questionForm.points"
                label="Points"
                type="number"
                min="0"
                placeholder="1"
              />

              <label
                v-if="
                  questionForm.questionType ===
                  'multiple_choice'
                "
                class="field"
              >
                <span>
                  Multiple-choice options
                </span>

                <textarea
                  v-model="
                    questionForm.optionsText
                  "
                  rows="5"
                  placeholder="Enter one option per line"
                />
              </label>

              <AppInput
                v-if="
                  questionForm.questionType ===
                  'image'
                "
                v-model="questionForm.imageUrl"
                label="Question Image URL"
                placeholder="Image upload will replace this next"
              />

              <AppInput
                v-model="
                  questionForm.correctAnswer
                "
                label="Correct Answer"
                placeholder="Enter the correct answer"
              />

              <label class="checkbox-field">
                <input
                  v-model="
                    questionForm.isActive
                  "
                  type="checkbox"
                />

                <span>
                  Question is active and visible
                </span>
              </label>

              <AppButton
                full
                :disabled="roundsStore.isSaving"
                @click="saveQuestion"
              >
                {{
                  roundsStore.isSaving
                    ? 'Saving...'
                    : isEditingQuestion
                      ? 'Save Question'
                      : 'Add Question'
                }}
              </AppButton>
            </div>
          </AppCard>
        </div>

        <AppCard
          v-if="selectedRound"
          class="admin-card question-panel"
        >
          <small>Questions</small>

          <p
            v-if="!selectedQuestions.length"
            class="empty-state"
          >
            No questions have been added to this
            round.
          </p>

          <div
            v-else
            class="question-list"
          >
            <article
              v-for="(
                question,
                questionIndex
              ) in selectedQuestions"
              :key="question.id"
              class="question-row"
              :class="{
                inactive: !question.isActive,
              }"
            >
              <div class="question-heading">
                <div>
                  <strong>
                    Question
                    {{ questionIndex + 1 }}
                  </strong>

                  <span>
                    {{
                      questionTypeLabel(
                        question.questionType,
                      )
                    }}
                    ·
                    {{ question.points }}
                    point(s)
                  </span>
                </div>

                <span
                  v-if="!question.isActive"
                  class="status-badge"
                >
                  Hidden
                </span>
              </div>

              <p>
                {{ question.questionText }}
              </p>

              <p
                v-if="
                  question.questionType ===
                    'multiple_choice' &&
                  question.options.length
                "
                class="question-detail"
              >
                Options:
                {{ question.options.join(', ') }}
              </p>

              <p class="question-detail">
                Correct answer:
                {{
                  question.correctAnswer ||
                  'Not set'
                }}
              </p>

              <div class="question-actions">
                <AppButton
                  variant="dark"
                  :disabled="roundsStore.isSaving"
                  @click="editQuestion(question)"
                >
                  Edit
                </AppButton>

                <AppButton
                  variant="dark"
                  :disabled="roundsStore.isSaving"
                  @click="
                    removeQuestion(question)
                  "
                >
                  Delete
                </AppButton>
              </div>
            </article>
          </div>
        </AppCard>
      </div>
    </template>
  </AdminShell>
</template>

<style scoped>
.admin-card {
  padding: 18px;
}

.editor-layout {
  display: grid;
  gap: 18px;
}

.editor-main {
  display: grid;
  align-content: start;
  gap: 18px;
}

.section-heading,
.selected-heading,
.question-heading,
.button-row,
.question-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.section-heading {
  margin-bottom: 18px;
}

small {
  display: block;
  margin-bottom: 8px;
  color: var(--gold);
  font-weight: 800;
  text-transform: uppercase;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  font-size: 24px;
}

h2 {
  font-size: 20px;
}

p {
  color: var(--muted);
}

.round-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.round-tabs button {
  display: grid;
  flex: 0 0 auto;
  min-width: 145px;
  gap: 3px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card);
  color: var(--muted);
  padding: 12px 14px;
  text-align: left;
  cursor: pointer;
}

.round-tabs button strong {
  color: var(--cream);
}

.round-tabs button span {
  font-size: 12px;
}

.round-tabs button.active {
  border-color: var(--gold);
  box-shadow:
    0 0 0 3px
    rgba(214, 179, 106, 0.1);
}

.round-tabs button.active strong,
.round-tabs button.active span {
  color: var(--gold-light);
}

.round-tabs button.inactive {
  opacity: 0.55;
}

.form-grid {
  display: grid;
  gap: 14px;
}

.field {
  display: grid;
  gap: 8px;
}

.field span {
  color: var(--gold-light);
  font-size: 12px;
  font-weight: 700;
}

select,
textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #121821;
  color: var(--cream);
  padding: 14px;
  outline: none;
  font: inherit;
}

select:focus,
textarea:focus {
  border-color: var(--gold);
  box-shadow:
    0 0 0 3px
    rgba(214, 179, 106, 0.12);
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--cream);
  font-size: 14px;
  cursor: pointer;
}

.checkbox-field input {
  width: 18px;
  height: 18px;
  accent-color: var(--gold);
}

.question-list {
  display: grid;
  gap: 12px;
}

.question-row {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card);
}

.question-row.inactive {
  opacity: 0.62;
}

.question-row span {
  display: block;
  margin-top: 4px;
  color: var(--gold);
  font-size: 12px;
}

.question-detail {
  font-size: 13px;
}

.question-actions {
  justify-content: flex-start;
}

.status-badge {
  margin: 0 !important;
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 5px 9px;
}

.empty-state {
  padding: 18px 0;
}

.message {
  margin-bottom: 18px;
  border-radius: 12px;
  padding: 14px 16px;
  font-weight: 700;
}

.message-error {
  border: 1px solid rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.12);
  color: #fecaca;
}

.message-success {
  border: 1px solid rgba(34, 197, 94, 0.4);
  background: rgba(34, 197, 94, 0.12);
  color: #bbf7d0;
}

@media (min-width: 1000px) {
  .admin-card {
    padding: 24px;
  }

  .editor-layout {
    grid-template-columns:
      minmax(0, 1.15fr)
      minmax(360px, 0.85fr);
    align-items: start;
  }

  .question-panel {
    position: sticky;
    top: 24px;
    max-height: calc(100vh - 48px);
    overflow-y: auto;
  }
}

@media (max-width: 640px) {
  .section-heading,
  .button-row {
    align-items: stretch;
    flex-direction: column;
  }

  .section-heading > *,
  .button-row > * {
    width: 100%;
  }

  .question-heading {
    align-items: flex-start;
  }
}
</style>