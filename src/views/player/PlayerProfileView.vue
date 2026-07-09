<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import PlayerShell from '@/components/layout/PlayerShell.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppCard from '@/components/base/AppCard.vue'
import AppConfirmModal from '@/components/base/AppConfirmModal.vue'

import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const showLogoutModal = ref(false)

function handleImageUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()

  reader.onload = () => {
    authStore.user.avatar = reader.result
    localStorage.setItem('yorkQuestUser', JSON.stringify(authStore.user))
  }

  reader.readAsDataURL(file)
}

function logout() {
  authStore.logout()
  router.push('/')
}
</script>

<template>
  <PlayerShell>
    <section class="profile-page">
      <AppCard class="profile-card">
        <AppAvatar
          :name="authStore.user.name"
          :image="authStore.user.avatar"
          size="lg"
        />

        <div>
          <h1>{{ authStore.user.name }}</h1>
          <p>@{{ authStore.user.username }}</p>
        </div>

        <label class="upload-button">
          Upload Profile Picture
          <input type="file" accept="image/*" @change="handleImageUpload">
          <input
            type="file"
            accept="image/*"
            capture="user"
          >
        </label>

        <AppButton variant="dark" full @click="router.push('/app')">
          Back to Quest
        </AppButton>

        <AppButton full @click="showLogoutModal = true">
          Logout
        </AppButton>
      </AppCard>
    </section>

    <AppConfirmModal
      :show="showLogoutModal"
      title="Leave the Quest?"
      message="Are you sure you want to log out?"
      @cancel="showLogoutModal = false"
      @confirm="logout"
    />
  </PlayerShell>
</template>

<style scoped>
.profile-page {
  display: grid;
  min-height: calc(100vh - 70px);
  align-content: center;
}

.profile-card {
  display: grid;
  justify-items: center;
  gap: 20px;
  padding: 26px;
  text-align: center;
}

h1 {
  margin: 0;
  font-family: var(--font-heading);
  color: var(--gold-light);
  font-size: 32px;
}

p {
  margin: 6px 0 0;
  color: var(--muted);
}

.upload-button {
  width: 100%;
  border: 1px solid var(--gold);
  border-radius: 10px;
  color: var(--gold-light);
  padding: 14px 18px;
  font-weight: 700;
  text-transform: uppercase;
  cursor: pointer;
}

.upload-button input {
  display: none;
}

.avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
}
</style>