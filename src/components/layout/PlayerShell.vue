<script setup>
import AppAvatar from '@/components/base/AppAvatar.vue'
import { useAuthStore } from '@/stores/authStore'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppConfirmModal from '@/components/base/AppConfirmModal.vue'

const router = useRouter()
const authStore = useAuthStore()

</script>

<template>
  <main class="player-shell">
    <header class="player-header">
      <button
        v-if="authStore.user"
        class="avatar-button"
        type="button"
        @click="router.push('/profile')"
      >
        <AppAvatar
          :name="authStore.user.name"
          :image="authStore.user.avatar"
          size="sm"
        />
      </button>
    </header>

    <section class="player-content">
      <slot />
    </section>
  </main>
</template>

<style scoped>
.player-shell {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  padding: 22px;
  background:
    radial-gradient(circle at top, rgba(214, 179, 106, 0.08), transparent 35%),
    linear-gradient(180deg, #101721 0%, #0f131a 100%);
}

.player-header {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: right;
  align-items: center;
}

.menu-button {
  border: 0;
  background: transparent;
  color: var(--gold-light);
  font-size: 22px;
}

.player-content {
  position: relative;
  z-index: 1;
}

.avatar-button {
  border: 0;
  background: transparent;
  padding: 0;
}
</style>