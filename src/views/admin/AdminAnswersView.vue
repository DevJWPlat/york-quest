<script setup>
import { onMounted } from 'vue'
import AdminShell from '@/components/layout/AdminShell.vue'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'

import { useGameStore } from '@/stores/gameStore'
import { useUsersStore } from '@/stores/usersStore'

const gameStore = useGameStore()
const usersStore = useUsersStore()

function getPlayer(userId) {
  return usersStore.getUserById(userId)
}

function getQuestion(questionId) {
  return gameStore.questions.find((question) => question.id === questionId)
}

onMounted(async () => {
  if (!usersStore.users.length) {
    await usersStore.loadUsers()
  }

  await gameStore.loadQuizContent()
  await gameStore.loadAnswers()
})

</script>

<template>
  <AdminShell>
    <AppCard class="admin-card">
      <small>Answers</small>

      <p v-if="!gameStore.answers.length">
        No answers submitted yet.
      </p>

      <div v-else class="answer-list">
        <div
          v-for="answer in gameStore.answers"
          :key="answer.id"
          class="answer-row"
        >
          <div>
            <strong>{{ getPlayer(answer.userId)?.name }}</strong>
            <span>{{ getQuestion(answer.questionId)?.text }}</span>
            <p>{{ answer.answer }}</p>
          </div>

          <div class="actions">
            <AppButton variant="secondary" @click="gameStore.markAnswer(answer.id, true)">
              Correct
            </AppButton>

            <AppButton variant="dark" @click="gameStore.markAnswer(answer.id, false)">
              Wrong
            </AppButton>
          </div>
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

.answer-list {
  display: grid;
  gap: 12px;
}

.answer-row {
  display: grid;
  gap: 14px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card);
}

.answer-row span {
  display: block;
  margin-top: 4px;
  color: var(--muted);
  font-size: 13px;
}

.answer-row p {
  margin: 10px 0 0;
}

.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
</style>