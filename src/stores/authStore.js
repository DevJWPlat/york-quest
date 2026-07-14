import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore(
  'auth',
  () => {
    const user = ref(null)
    const error = ref('')
    const loading = ref(false)
    const validating = ref(false)

    let validationPromise = null

    function persistUser(updatedUser) {
      user.value = updatedUser

      localStorage.setItem(
        'yorkQuestUser',
        JSON.stringify(updatedUser),
      )
    }

    function clearUser() {
      user.value = null

      localStorage.removeItem(
        'yorkQuestUser',
      )
    }

    async function login(
      username,
      password,
    ) {
      loading.value = true
      error.value = ''

      try {
        const response = await fetch(
          '/api/login',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              username,
              password,
            }),
          },
        )

        const data = await response.json()

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.error ||
              'Unable to log in.',
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

    async function updateCurrentUser(
      updates,
    ) {
      if (!user.value?.id) {
        return {
          success: false,
          error:
            'No user is currently logged in.',
        }
      }

      loading.value = true
      error.value = ''

      try {
        const response = await fetch(
          '/api/users',
          {
            method: 'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              id: user.value.id,
              ...updates,
            }),
          },
        )

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

    async function validateCurrentUser() {
      if (!user.value?.id) {
        return {
          success: false,
          error:
            'No user is currently logged in.',
        }
      }

      /*
       * Router navigation can run more than once
       * during startup. Reuse the same validation
       * request instead of sending duplicates.
       */
      if (validationPromise) {
        return validationPromise
      }

      validating.value = true
      error.value = ''

      validationPromise = (async () => {
        try {
          const params =
            new URLSearchParams({
              id: String(user.value.id),
            })

          const response = await fetch(
            `/api/current-user?${params.toString()}`,
            {
              headers: {
                Accept:
                  'application/json',
              },
            },
          )

          const data =
            await response.json()

          if (
            !response.ok ||
            !data.success
          ) {
            clearUser()

            throw new Error(
              data.error ||
                'Your login is no longer valid.',
            )
          }

          persistUser(data.user)

          return {
            success: true,
            user: data.user,
          }
        } catch (validationError) {
          error.value =
            validationError.message ||
            'Unable to validate your account.'

          return {
            success: false,
            error: error.value,
          }
        } finally {
          validating.value = false
          validationPromise = null
        }
      })()

      return validationPromise
    }

    function logout() {
      clearUser()
      error.value = ''
    }

    function loadUser() {
      const savedUser =
        localStorage.getItem(
          'yorkQuestUser',
        )

      if (!savedUser) {
        return
      }

      try {
        const parsedUser =
          JSON.parse(savedUser)

        if (!parsedUser?.id) {
          clearUser()
          return
        }

        user.value = parsedUser
      } catch {
        clearUser()
      }
    }

    loadUser()

    return {
      user,
      loading,
      validating,
      error,
      login,
      updateCurrentUser,
      validateCurrentUser,
      logout,
    }
  },
)