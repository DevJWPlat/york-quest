<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import LoginLogo from '@/components/auth/LoginLogo.vue'
import LoginForm from '@/components/auth/LoginForm.vue'

import { useAuthStore } from '@/stores/authStore'

import catherdral from '@/assets/church.png'
import startQuest from '@/assets/start.png'

const router = useRouter()
const authStore = useAuthStore()

const loginMode = ref('player')

function toggleLoginMode() {
  loginMode.value = loginMode.value === 'player' ? 'admin' : 'player'
}

function handleLogin({ username, password }) {
  const success = authStore.login(username, password, loginMode.value)

  if (!success) return

  if (authStore.user.role === 'admin') {
    router.push('/admin')
    return
  }

  router.push('/app')
}
</script>

<template>
  <main class="login-page">
    <section class="login-card">
      <LoginLogo :mode="loginMode" @click="toggleLoginMode" />

      <LoginForm
        :mode="loginMode"
        :error="authStore.error"
        @submit="handleLogin"
      />
    </section>

    <img :src="startQuest" alt="Start Quest" class="start-quest-image">
    <img :src="catherdral" alt="York Cathedral" class="cathedral-image">
  </main>
</template>

<style scoped>
.login-page {
  position: relative;
  display: grid;
  min-height: 100vh;
  place-items: center;
  overflow: hidden;
  padding: 40px 24px;
  background:
    radial-gradient(circle at top, rgba(214, 179, 106, 0.1), transparent 36%),
    linear-gradient(180deg, #101721 0%, #0f131a 100%);
}

.login-card {
  position: relative;
  z-index: 1;
  display: grid;
  width: 100%;
  max-width: 390px;
  gap: 28px;
  top: -50px;
}

main {
    position: relative;
}

img {
    position: absolute;
    bottom: 0;

}

.start-quest-image {
    position: absolute;
    z-index: 1;
    bottom: 30px;
    width: 100%;
    max-width: 150px;
}



</style>