import { defineStore } from 'pinia'
import { ref } from 'vue'
import { users } from '@/data/users'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const error = ref('')

  function login(username, password, loginMode = 'player') {
    error.value = ''

    const foundUser = users.find((item) => {
      return (
        item.username.toLowerCase() === username.toLowerCase() &&
        item.password === password &&
        item.role === loginMode
      )
    })

    if (!foundUser) {
      error.value = 'Login details are incorrect.'
      return false
    }

    user.value = foundUser
    localStorage.setItem('yorkQuestUser', JSON.stringify(foundUser))

    return true
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
    error,
    login,
    logout,
    loadUser,
  }
})