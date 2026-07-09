<script setup>
import AdminShell from '@/components/layout/AdminShell.vue'
import AppCard from '@/components/base/AppCard.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'

import { users } from '@/data/users'

const players = users.filter((user) => user.role === 'player')
const admins = users.filter((user) => user.role === 'admin')
</script>

<template>
  <AdminShell>
    <AppCard class="admin-card">
      <small>Players</small>

      <div class="player-list">
        <div
          v-for="player in players"
          :key="player.id"
          class="player-row"
        >
          <AppAvatar
            :name="player.name"
            :image="player.avatar"
            size="sm"
          />

          <div>
            <strong>{{ player.name }}</strong>
            <span>{{ player.username }}</span>
          </div>

          <em>Player</em>
        </div>
      </div>
    </AppCard>

    <AppCard class="admin-card">
      <small>Admins</small>

      <div class="player-list">
        <div
          v-for="admin in admins"
          :key="admin.id"
          class="player-row"
        >
          <AppAvatar
            :name="admin.name"
            :image="admin.avatar"
            size="sm"
          />

          <div>
            <strong>{{ admin.name }}</strong>
            <span>{{ admin.username }}</span>
          </div>

          <em>Admin</em>
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

.player-list {
  display: grid;
  gap: 12px;
}

.player-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card);
}

.player-row div {
  display: grid;
  gap: 3px;
}

.player-row span {
  color: var(--muted);
  font-size: 13px;
}

.player-row em {
  color: var(--gold);
  font-size: 12px;
  font-style: normal;
  font-weight: 800;
}
</style>