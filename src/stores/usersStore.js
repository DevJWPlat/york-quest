import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const useUsersStore = defineStore('users', () => {
  const users = ref([])
  const loading = ref(false)
  const error = ref('')

  const players = computed(() => {
    return users.value.filter(
      (user) =>
        user.role === 'player' &&
        user.isActive,
    )
  })

  const allPlayers = computed(() => {
    return users.value.filter(
      (user) => user.role === 'player',
    )
  })

  const admins = computed(() => {
    return users.value.filter(
      (user) =>
        user.role === 'admin' &&
        user.isActive,
    )
  })

  async function loadUsers() {
    if (loading.value) return

    loading.value = true
    error.value = ''

    try {
      const response = await fetch('/api/users')

      const responseText = await response.text()

      let data = []

      if (responseText) {
        data = JSON.parse(responseText)
      }

      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to load users.',
        )
      }

      users.value = Array.isArray(data)
        ? data
        : []
    } catch (loadError) {
      console.error(
        'Failed to load users:',
        loadError,
      )

      error.value =
        loadError.message ||
        'Unable to load users.'
    } finally {
      loading.value = false
    }
  }

  function getUserById(userId) {
    return users.value.find(
      (user) =>
        Number(user.id) === Number(userId),
    )
  }

  function clearUsers() {
    users.value = []
  }

  return {
    users,
    players,
    allPlayers,
    admins,
    loading,
    error,
    loadUsers,
    getUserById,
    clearUsers,
  }
})