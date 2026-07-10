<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Sword, Swords } from 'lucide-vue-next'

import AppConfirmModal from '@/components/base/AppConfirmModal.vue'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const menuOpen = ref(false)
const showLogoutModal = ref(false)

function closeMenu() {
  menuOpen.value = false
}

function requestLogout() {
  menuOpen.value = false
  showLogoutModal.value = true
}

function logout() {
  authStore.logout()
  router.push('/')
}
</script>

<template>
  <main class="admin-shell">
    <button
        class="menu-toggle"
        type="button"
        :aria-expanded="menuOpen"
        aria-label="Toggle admin menu"
        @click="menuOpen = !menuOpen"
      >
      <Swords
        v-if="menuOpen"
        :size="28"
        stroke-width="1.7"
        class="menu-icon"
      />

      <Sword
        v-else
        :size="27"
        stroke-width="1.7"
        class="menu-icon"
      />
      </button>
      
    <header class="admin-header">
      <div>
        <span>Admin</span>
        <h1>Quest Control</h1>
      </div>
    </header>

    <Transition name="fade">
      <button
        v-if="menuOpen"
        class="menu-backdrop"
        type="button"
        aria-label="Close menu"
        @click="closeMenu"
      />
    </Transition>

    <aside class="admin-drawer" :class="{ open: menuOpen }">
      <div class="drawer-heading">
        <small>Josh's York Quest</small>
        <h2>Admin Menu</h2>
      </div>

      <nav class="drawer-nav">
        <RouterLink to="/admin" @click="closeMenu">
          Dashboard
        </RouterLink>

        <RouterLink to="/admin/rounds" @click="closeMenu">
          Rounds
        </RouterLink>

        <RouterLink to="/admin/answers" @click="closeMenu">
          Answers
        </RouterLink>

        <RouterLink to="/admin/leaderboard" @click="closeMenu">
          Scores
        </RouterLink>

        <RouterLink to="/admin/players" @click="closeMenu">
          Players
        </RouterLink>

        <RouterLink to="/admin/settings" @click="closeMenu">
          Settings
        </RouterLink>
      </nav>

      <button class="logout-link" type="button" @click="requestLogout">
        Logout
      </button>
    </aside>

    <section class="admin-content">
      <slot />
    </section>

    <AppConfirmModal
      :show="showLogoutModal"
      title="Leave Quest Control?"
      message="Are you sure you want to log out?"
      @cancel="showLogoutModal = false"
      @confirm="logout"
    />
  </main>
</template>

<style scoped>
.admin-shell {
  min-height: 100vh;
  padding: 22px;
  background:
    radial-gradient(circle at top right, rgba(214, 179, 106, 0.08), transparent 34%),
    var(--bg);
}

.admin-header {
  position: relative;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
}

.admin-header span {
  display: block;
  margin-bottom: 4px;
  color: var(--gold);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.admin-header h1 {
  margin: 0;
  color: var(--gold-light);
  font-family: var(--font-heading);
  font-size: 28px;
  line-height: 1;
}
.menu-toggle {
  position: fixed;
  top: 22px;
  right: 22px;
  z-index: 9999;

  display: grid;
  place-items: center;

  width: 48px;
  height: 48px;

  border: 1px solid rgba(214, 179, 106, 0.35);
  border-radius: 50%;

  background: rgba(23, 28, 36, 0.95);
  color: var(--gold-light);

  box-shadow:
    0 0 18px rgba(214, 179, 106, 0.1),
    0 8px 24px rgba(0, 0, 0, 0.25);

  transition: var(--transition);
}

.menu-toggle:hover {
  transform: translateY(-2px);
  border-color: var(--gold);
  color: var(--gold-light);
}

.menu-icon {
  display: block;
  pointer-events: none;
}

.menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  border: 0;
  background: rgba(0, 0, 0, 0.6);
}

.admin-drawer {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  width: min(82vw, 340px);
  height: 100vh;
  padding: 28px 22px;
  border-left: 1px solid var(--border);
  background:
    radial-gradient(circle at top right, rgba(214, 179, 106, 0.1), transparent 42%),
    var(--bg-soft);
  box-shadow: -20px 0 60px rgba(0, 0, 0, 0.45);
  transform: translateX(105%);
  transition: transform 0.32s ease;
}

.admin-drawer.open {
  transform: translateX(0);
}

.drawer-heading {
  margin-bottom: 28px;
}

.drawer-heading small {
  color: var(--gold);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.drawer-heading h2 {
  margin: 8px 0 0;
  color: var(--cream);
  font-family: var(--font-heading);
  font-size: 28px;
}

.drawer-nav {
  display: grid;
  gap: 10px;
}

.drawer-nav a {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: rgba(15, 19, 26, 0.55);
  color: var(--cream);
  padding: 14px 16px;
  text-align: left;
  text-decoration: none;
  font-weight: 700;
  transition: var(--transition);
}

.drawer-nav a:hover {
  border-color: rgba(214, 179, 106, 0.5);
  transform: translateX(-3px);
}

.drawer-nav a.router-link-active {
  border-color: var(--gold);
  color: var(--gold-light);
  box-shadow: 0 0 18px rgba(214, 179, 106, 0.12);
}

.logout-link {
  width: 100%;
  margin-top: auto;
  border: 0;
  border-radius: 10px;
  background: linear-gradient(180deg, #963638, var(--burgundy));
  color: var(--cream);
  padding: 14px 16px;
  text-align: center;
  font-weight: 800;
  text-transform: uppercase;
  box-shadow: 0 8px 20px rgba(123, 45, 47, 0.35);
}

.logout-link:hover {
  transform: translateY(-2px);
}

.admin-content {
  display: grid;
  gap: 18px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>