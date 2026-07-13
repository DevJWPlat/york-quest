<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  Eye,
  Plus,
  UserRound,
} from 'lucide-vue-next'

import AdminShell from '@/components/layout/AdminShell.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppCard from '@/components/base/AppCard.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AdminPlayerModal from '@/components/admin/AdminPlayerModal.vue'

const users = ref([])
const loading = ref(true)
const error = ref('')

const players = computed(() => {
  return users.value.filter(
    (user) => user.role === 'player',
  )
})

const showPlayerModal = ref(false)
const selectedPlayer = ref(null)

function openAddPlayer() {
  selectedPlayer.value = null
  showPlayerModal.value = true
}

function openPlayer(player) {
  selectedPlayer.value = player
  showPlayerModal.value = true
}

function closePlayerModal() {
  showPlayerModal.value = false
  selectedPlayer.value = null
}

async function handlePlayerSaved() {
  closePlayerModal()
  await loadUsers()
}

async function handlePlayerDeleted() {
  closePlayerModal()
  await loadUsers()
}

async function loadUsers() {
  loading.value = true
  error.value = ''

  try {
    const response = await fetch('/api/users?role=player')

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.error || 'Unable to load players.',
      )
    }

    users.value = Array.isArray(data) ? data : []
  } catch (loadError) {
    console.error('Failed to load players:', loadError)

    error.value =
      loadError.message || 'Unable to load players.'
  } finally {
    loading.value = false
  }
}

function openAddPlayer() {
  // We will connect this to the Add Player modal next.
}

function openPlayer(player) {
  // We will connect this to the player details modal next.
  console.log('Open player:', player)
}

onMounted(() => {
  loadUsers()
})
</script>

<template>
  <AdminShell>
    <AppCard class="admin-card">
      <div class="card-heading">
        <div>
          <small>Quest Players</small>

          <h2>
            Players
            <span>{{ players.length }}</span>
          </h2>
        </div>

        <AppButton
          class="add-button"
          @click="openAddPlayer"
        >
          <Plus :size="18" />
          Add Player
        </AppButton>
      </div>

      <div v-if="loading" class="state-message">
        Loading players...
      </div>

      <div v-else-if="error" class="error-message">
        <p>{{ error }}</p>

        <AppButton
          variant="secondary"
          @click="loadUsers"
        >
          Try Again
        </AppButton>
      </div>

      <div v-else-if="!players.length" class="empty-state">
        <div class="empty-icon">
          <UserRound
            :size="40"
            stroke-width="1.5"
          />
        </div>

        <h3>No players yet</h3>

        <p>
          Add the people taking part in Josh's York Quest.
        </p>

        <AppButton @click="openAddPlayer">
          <Plus :size="18" />
          Add First Player
        </AppButton>
      </div>

      <div v-else class="player-grid">
        <button
          v-for="player in players"
          :key="player.id"
          type="button"
          class="player-card"
          @click="openPlayer(player)"
        >
          <AppAvatar
            :name="player.name"
            :image="player.avatar"
            size="md"
          />

          <div class="player-details">
            <strong>{{ player.name }}</strong>

            <span>
              @{{ player.username }}
            </span>
          </div>

          <span
            class="account-status"
            :class="{
              inactive: !player.isActive,
            }"
          >
            {{
              player.isActive
                ? 'Active'
                : 'Disabled'
            }}
          </span>

          <Eye
            class="view-icon"
            :size="19"
            stroke-width="1.8"
          />
        </button>
      </div>
    </AppCard>
    <AdminPlayerModal
  :show="showPlayerModal"
  :player="selectedPlayer"
  @close="closePlayerModal"
  @saved="handlePlayerSaved"
  @deleted="handlePlayerDeleted"
/>
  </AdminShell>
</template>

<style scoped>
.admin-card {
  padding: 18px;
}

.card-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}

.card-heading small {
  display: block;
  margin-bottom: 7px;
  color: var(--gold);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.card-heading h2 {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 0;
  color: var(--cream);
  font-family: var(--font-heading);
  font-size: 27px;
}

.card-heading h2 span {
  display: grid;
  min-width: 27px;
  height: 27px;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--gold);
  font-family: var(--font-body);
  font-size: 12px;
}

.add-button {
  width: auto;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.player-grid {
  display: grid;
  gap: 10px;
}

.player-card {
  display: grid;
  grid-template-columns:
    auto
    minmax(0, 1fr)
    auto
    auto;
  align-items: center;
  gap: 13px;
  width: 100%;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 15px;
  background: var(--card);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: var(--transition);
}

.player-card:hover {
  border-color: rgba(214, 179, 106, 0.55);
  transform: translateY(-2px);
}

.player-details {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.player-details strong {
  overflow: hidden;
  color: var(--cream);
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-details span {
  overflow: hidden;
  color: var(--muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-status {
  border-radius: 999px;
  background: rgba(79, 138, 91, 0.15);
  color: #8fd19e;
  padding: 6px 9px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.account-status.inactive {
  background: rgba(179, 71, 71, 0.15);
  color: #ef8b8d;
}

.view-icon {
  color: var(--gold);
}

.state-message,
.error-message,
.empty-state {
  padding: 30px 18px;
  border: 1px solid var(--border);
  border-radius: 15px;
  background: var(--card);
  text-align: center;
}

.state-message {
  color: var(--muted);
}

.error-message p {
  margin: 0 0 16px;
  color: #f2a0a0;
}

.empty-state {
  display: grid;
  justify-items: center;
  gap: 12px;
}

.empty-icon {
  display: grid;
  width: 74px;
  height: 74px;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 50%;
  color: var(--gold);
}

.empty-state h3 {
  margin: 0;
  color: var(--cream);
  font-family: var(--font-heading);
  font-size: 22px;
}

.empty-state p {
  max-width: 300px;
  margin: 0 0 5px;
  color: var(--muted);
  line-height: 1.5;
}

@media (max-width: 540px) {
  .card-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .add-button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .player-card {
    grid-template-columns:
      auto
      minmax(0, 1fr)
      auto;
  }

  .account-status {
    display: none;
  }
}
</style>