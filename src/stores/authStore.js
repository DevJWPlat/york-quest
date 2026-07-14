import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const error = ref('')
  const loading = ref(false)

  function persistUser(updatedUser) {
    user.value = updatedUser

    localStorage.setItem(
      'yorkQuestUser',
      JSON.stringify(updatedUser),
    )
  }

  async function login(username, password) {
    loading.value = true
    error.value = ''

    try {
      const response = await fetch('/api/login', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          username,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || 'Unable to log in.',
        )
      }

      persistUser(data.user)

      return {
        success: true,
        user: data.user,
      }
    } catch (loginError) {
      error.value =
        loginError.message ||
        'Unable to log in.'

      return {
        success: false,
        error: error.value,
      }
    } finally {
      loading.value = false
    }
  }

  async function updateCurrentUser(updates) {
    if (!user.value?.id) {
      return {
        success: false,
        error: 'No user is currently logged in.',
      }
    }

    loading.value = true
    error.value = ''

    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          id: user.value.id,
          ...updates,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Unable to update the user.',
        )
      }

      persistUser(data)

      return {
        success: true,
        user: data,
      }
    } catch (updateError) {
      error.value =
        updateError.message ||
        'Unable to update the user.'

      return {
        success: false,
        error: error.value,
      }
    } finally {
      loading.value = false
    }
  }

  function logout() {
    user.value = null
    localStorage.removeItem('yorkQuestUser')
  }

  function loadUser() {
    const savedUser =
      localStorage.getItem('yorkQuestUser')

    if (!savedUser) {
      return
    }

    try {
      user.value = JSON.parse(savedUser)
    } catch {
      localStorage.removeItem(
        'yorkQuestUser',
      )
    }
  }

  loadUser()

  return {
    user,
    loading,
    error,
    login,
    updateCurrentUser,
    logout,
  }
})