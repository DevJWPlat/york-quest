<script setup>
import { computed, ref } from 'vue'

import AdminShell from '@/components/layout/AdminShell.vue'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'

import { useGameStore } from '@/stores/gameStore'

const gameStore = useGameStore()

const selectedRoundId = ref(gameStore.rounds[0]?.id || null)

const roundForm = ref({
  title: '',
  pubName: '',
})

const questionForm = ref({
  type: 'text',
  text: '',
  points: 1,
  correctAnswer: '',
  optionsText: '',
  image: '',
})

function addQuestion() {
  if (!selectedRound.value || !questionForm.value.text) return

  const options = questionForm.value.optionsText
    .split('\n')
    .map((option) => option.trim())
    .filter(Boolean)

  gameStore.addQuestion({
    roundId: selectedRound.value.id,
    order: selectedQuestions.value.length + 1,
    type: questionForm.value.type,
    text: questionForm.value.text,
    points: questionForm.value.points,
    correctAnswer: questionForm.value.correctAnswer,
    image: questionForm.value.image,
    options,
  })

  questionForm.value = {
    type: 'text',
    text: '',
    points: 1,
    correctAnswer: '',
    optionsText: '',
    image: '',
  }
}

const selectedRound = computed(() => {
  return gameStore.rounds.find((round) => round.id === selectedRoundId.value)
})

const selectedQuestions = computed(() => {
  if (!selectedRound.value) return []

  return gameStore.questions
    .filter((question) => question.roundId === selectedRound.value.id)
    .sort((a, b) => a.order - b.order)
})

function selectRound(round) {
  selectedRoundId.value = round.id
}

function addRound() {
  if (!roundForm.value.title || !roundForm.value.pubName) return

  gameStore.addRound({
    title: roundForm.value.title,
    pubName: roundForm.value.pubName,
  })

  roundForm.value = {
    title: '',
    pubName: '',
  }

  selectedRoundId.value = gameStore.rounds[gameStore.rounds.length - 1].id
}

function removeRound(roundId) {
  if (!confirm('Delete this round and all its questions?')) return

  gameStore.deleteRound(roundId)
  selectedRoundId.value = gameStore.rounds[0]?.id || null
}
</script>

<template>
  <AdminShell>
    <AppCard class="admin-card">
      <small>Rounds</small>

      <div class="round-tabs">
        <button
          v-for="round in gameStore.rounds"
          :key="round.id"
          type="button"
          :class="{ active: selectedRoundId === round.id }"
          @click="selectRound(round)"
        >
          {{ round.title }}
        </button>
      </div>
    </AppCard>

    <AppCard class="admin-card">
      <small>Add Round</small>

      <div class="form-grid">
        <AppInput
          v-model="roundForm.title"
          label="Round Title"
          placeholder="Pub 1"
        />

        <AppInput
          v-model="roundForm.pubName"
          label="Pub Name"
          placeholder="The Golden Fleece"
        />

        <AppButton full @click="addRound">
          Add Round
        </AppButton>
      </div>
    </AppCard>

    <AppCard v-if="selectedRound" class="admin-card">
      <small>Selected Round</small>

      <div class="selected-heading">
        <div>
          <h2>{{ selectedRound.title }}</h2>
          <p>{{ selectedRound.pubName }}</p>
        </div>

        <AppButton variant="dark" @click="removeRound(selectedRound.id)">
          Delete
        </AppButton>
      </div>
    </AppCard>

    <AppCard v-if="selectedRound" class="admin-card">
      <small>Add Question</small>

      <div class="form-grid">
        <label class="field">
          <span>Question Type</span>
          <select v-model="questionForm.type">
            <option value="text">Text</option>
            <option value="long-text">Long Text</option>
            <option value="number">Number</option>
            <option value="multiple-choice">Multiple Choice</option>
            <option value="image">Image Question</option>
          </select>
        </label>

        <label class="field">
          <span>Question</span>
          <textarea
            v-model="questionForm.text"
            rows="3"
            placeholder="Enter the question"
          />
        </label>

        <AppInput
          v-model="questionForm.points"
          label="Points"
          type="number"
          placeholder="1"
        />

        <label v-if="questionForm.type === 'multiple-choice'" class="field">
          <span>Options</span>
          <textarea
            v-model="questionForm.optionsText"
            rows="4"
            placeholder="One option per line"
          />
        </label>

        <AppInput
          v-if="questionForm.type === 'image'"
          v-model="questionForm.image"
          label="Image URL"
          placeholder="Paste image URL"
        />

        <AppInput
          v-model="questionForm.correctAnswer"
          label="Correct Answer"
          placeholder="Enter correct answer"
        />

        <AppButton full @click="addQuestion">
          Add Question
        </AppButton>
      </div>
    </AppCard>

    <AppCard v-if="selectedRound" class="admin-card">
      <small>Questions</small>

      <p v-if="!selectedQuestions.length">
        No questions added yet.
      </p>

      <div v-else class="question-list">
        <div
          v-for="question in selectedQuestions"
          :key="question.id"
          class="question-row"
        >
          <div>
            <strong>Question {{ question.order }}</strong>
            <span>{{ question.type }} · {{ question.points }} point(s)</span>
            <p>{{ question.text }}</p>
          </div>

          <AppButton variant="dark" @click="gameStore.deleteQuestion(question.id)">
            Delete
          </AppButton>
        </div>
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
  margin-bottom: 12px;
  color: var(--gold);
  font-weight: 800;
  text-transform: uppercase;
}

.round-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.round-tabs button {
  flex: 0 0 auto;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--card);
  color: var(--muted);
  padding: 10px 14px;
}

.round-tabs button.active {
  border-color: var(--gold);
  color: var(--gold-light);
}

.form-grid {
  display: grid;
  gap: 14px;
}

.selected-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

h2,
p {
  margin: 0;
}

p {
  color: var(--muted);
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

.question-row span {
  display: block;
  margin: 4px 0 8px;
  color: var(--gold);
  font-size: 12px;
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
}

select:focus,
textarea:focus {
  border-color: var(--gold);
  box-shadow: 0 0 0 3px rgba(214, 179, 106, 0.12);
}
</style>