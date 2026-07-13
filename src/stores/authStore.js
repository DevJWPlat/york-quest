import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const error = ref('')
  const loading = ref(false)

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
  
      user.value = data.user
  
      localStorage.setItem(
        'yorkQuestUser',
        JSON.stringify(data.user),
      )
  
      return {
        success: true,
        user: data.user,
      }
    } catch (loginError) {
      error.value =
        loginError.message || 'Unable to log in.'
  
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
    const savedUser = localStorage.getItem('yorkQuestUser')

    if (savedUser) {
      user.value = JSON.parse(savedUser)
    }
  }

  loadUser()

  return {
    user,
    loading,
    error,
    login,
    logout,
  }
})