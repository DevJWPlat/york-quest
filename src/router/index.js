import {
  createRouter,
  createWebHistory,
} from 'vue-router'

import LoginView from '@/views/auth/LoginView.vue'

import PlayerHomeView from '@/views/player/PlayerHomeView.vue'
import PlayerProfileView from '@/views/player/PlayerProfileView.vue'

import AdminDashboardView from '@/views/admin/AdminDashboardView.vue'
import AdminRoundsView from '@/views/admin/AdminRoundsView.vue'
import AdminAnswersView from '@/views/admin/AdminAnswersView.vue'
import AdminLeaderboardView from '@/views/admin/AdminLeaderboardView.vue'
import AdminPlayersView from '@/views/admin/AdminPlayersView.vue'
import AdminSettingsView from '@/views/admin/AdminSettingsView.vue'

import { useAuthStore } from '@/stores/authStore'

const routes = [
  {
    path: '/',
    name: 'login',
    component: LoginView,
  },

  {
    path: '/app',
    name: 'player-home',
    component: PlayerHomeView,
    meta: {
      requiresAuth: true,
      role: 'player',
    },
  },

  {
    path: '/profile',
    name: 'player-profile',
    component: PlayerProfileView,
    meta: {
      requiresAuth: true,
    },
  },

  {
    path: '/admin',
    name: 'admin-dashboard',
    component: AdminDashboardView,
    meta: {
      requiresAuth: true,
      role: 'admin',
    },
  },

  {
    path: '/admin/rounds',
    name: 'admin-rounds',
    component: AdminRoundsView,
    meta: {
      requiresAuth: true,
      role: 'admin',
    },
  },

  {
    path: '/admin/answers',
    name: 'admin-answers',
    component: AdminAnswersView,
    meta: {
      requiresAuth: true,
      role: 'admin',
    },
  },

  {
    path: '/admin/leaderboard',
    name: 'admin-leaderboard',
    component: AdminLeaderboardView,
    meta: {
      requiresAuth: true,
      role: 'admin',
    },
  },

  {
    path: '/admin/players',
    name: 'admin-players',
    component: AdminPlayersView,
    meta: {
      requiresAuth: true,
      role: 'admin',
    },
  },

  {
    path: '/admin/settings',
    name: 'admin-settings',
    component: AdminSettingsView,
    meta: {
      requiresAuth: true,
      role: 'admin',
    },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth) {
    if (!authStore.user) {
      return {
        path: '/',
        query: {
          redirect: to.fullPath,
        },
      }
    }

    const validationResult =
      await authStore.validateCurrentUser()

    if (!validationResult.success) {
      return {
        path: '/',
        query: {
          account:
            'session-invalid',
        },
      }
    }
  }

  if (
    to.meta.role &&
    authStore.user?.role !== to.meta.role
  ) {
    return authStore.user?.role ===
      'admin'
      ? '/admin'
      : '/app'
  }

  /*
   * Prevent a currently logged-in user from
   * returning to the login page unnecessarily.
   */
  if (
    to.name === 'login' &&
    authStore.user
  ) {
    return authStore.user.role ===
      'admin'
      ? '/admin'
      : '/app'
  }

  return true
})

export default router