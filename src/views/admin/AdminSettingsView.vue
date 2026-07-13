<script setup>
import { ref } from 'vue'

import AdminShell from '@/components/layout/AdminShell.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppCard from '@/components/base/AppCard.vue'
import AppConfirmModal from '@/components/base/AppConfirmModal.vue'

import { useGameStore } from '@/stores/gameStore'

const gameStore = useGameStore()

const showResetWarning = ref(false)
const resettingGame = ref(false)
const resetSuccess = ref('')
const resetError = ref('')

async function resetLiveGame() {
  if (resettingGame.value) return

  resettingGame.value = true
  resetSuccess.value = ''
  resetError.value = ''

  try {
    const response = await fetch('/api/reset-game', {
      method: 'POST',
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.error || 'The live game could not be reset.',
      )
    }

    showResetWarning.value = false

    await gameStore.loadGameState()

    resetSuccess.value =
      'The live game has been reset. Answers and scores have been cleared.'

    window.setTimeout(() => {
      resetSuccess.value = ''
    }, 5000)
  } catch (error) {
    console.error('Failed to reset live game:', error)

    resetError.value =
      error.message || 'The live game could not be reset.'
  } finally {
    resettingGame.value = false
  }
}
</script>

<template>
  <AdminShell>
    <section class="settings-page">
      <AppCard class="admin-card danger-card">
        <small>Danger Zone</small>

        <h2>Reset Live Game</h2>

        <p>
          Clear all submitted answers and scores, then return every
          player to the waiting screen.
        </p>

        <p class="kept-data">
          Players, rounds and questions will not be deleted.
        </p>

        <p
          v-if="resetSuccess"
          class="status-message success-message"
        >
          {{ resetSuccess }}
        </p>

        <p
          v-if="resetError"
          class="status-message error-message"
        >
          {{ resetError }}
        </p>

        <AppButton
          class="reset-button"
          full
          :disabled="resettingGame"
          @click="showResetWarning = true"
        >
          {{
            resettingGame
              ? 'Resetting Game...'
              : 'Reset Live Game'
          }}
        </AppButton>
      </AppCard>
    </section>

    <AppConfirmModal
      :show="showResetWarning"
      title="Reset Live Game?"
      message="This will permanently delete all submitted answers and scores, stop the current round and return every player to the waiting screen. Players, rounds and questions will remain."
      confirm-label="Reset Game"
      @cancel="showResetWarning = false"
      @confirm="resetLiveGame"
    />
  </AdminShell>
</template>

<style scoped>
.settings-page {
  width: 100%;
  padding: 0;
}

.admin-card {
  width: 100%;
  padding: 18px;
  margin-top: 24px;
}

small {
  display: block;
  margin-bottom: 12px;
  color: #ef7f82;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h2 {
  margin: 0;
  color: var(--cream);
  font-family: var(--font-heading);
  font-size: 26px;
}

p {
  margin: 12px 0 0;
  color: var(--muted);
  line-height: 1.6;
}

.kept-data {
  margin-bottom: 22px;
  color: var(--gold-light);
  font-size: 13px;
}

.danger-card {
  border-color: rgba(179, 71, 71, 0.45);
  background:
    linear-gradient(
      180deg,
      rgba(123, 45, 47, 0.1),
      transparent
    ),
    var(--card);
}

.status-message {
  margin-bottom: 18px;
  padding: 12px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
}

.success-message {
  background: rgba(79, 138, 91, 0.15);
  color: #8fd19e;
}

.error-message {
  background: rgba(179, 71, 71, 0.15);
  color: #f2a0a0;
}

.reset-button {
  margin-top: 4px;
  border: 0;
  background: linear-gradient(
    180deg,
    #a33c3f,
    var(--burgundy)
  );
  color: var(--cream);
}

@media (max-width: 640px) {
  .admin-card {
    padding: 16px;
  }

  h2 {
    font-size: 23px;
  }
}
</style>