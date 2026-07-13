<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Eye, EyeOff, X } from 'lucide-vue-next'

import AppButton from '@/components/base/AppButton.vue'
import AppAvatar from '@/components/base/AppAvatar.vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  player: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits([
  'close',
  'saved',
  'deleted',
])

const saving = ref(false)
const deleting = ref(false)
const showingPassword = ref(false)
const error = ref('')

const form = reactive({
  name: '',
  username: '',
  password: '',
  role: 'player',
  isActive: true,
  avatar: '',
})

const isEditing = computed(() => Boolean(props.player?.id))

const modalTitle = computed(() => {
  return isEditing.value
    ? 'Player Details'
    : 'Add Player'
})

function resetForm() {
  form.name = props.player?.name || ''
  form.username = props.player?.username || ''
  form.password = props.player?.password || ''
  form.role = props.player?.role || 'player'
  form.isActive = props.player?.isActive ?? true
  form.avatar = props.player?.avatar || ''

  showingPassword.value = false
  error.value = ''
}

function closeModal() {
  if (saving.value || deleting.value) return

  emit('close')
}

async function savePlayer() {
  if (saving.value) return

  error.value = ''

  if (
    !form.name.trim() ||
    !form.username.trim() ||
    !form.password.trim()
  ) {
    error.value =
      'Name, username and password are required.'

    return
  }

  saving.value = true

  try {
    const response = await fetch('/api/users', {
      method: isEditing.value ? 'PATCH' : 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...(isEditing.value
          ? { id: props.player.id }
          : {}),
        name: form.name.trim(),
        username: form.username.trim(),
        password: form.password.trim(),
        role: form.role,
        isActive: form.isActive,
        avatar: form.avatar,
      }),
    })

    const responseText = await response.text()

    let data = {}

    if (responseText) {
      data = JSON.parse(responseText)
    }

    if (!response.ok) {
      throw new Error(
        data.error || 'Unable to save the player.',
      )
    }

    emit('saved', data)
  } catch (saveError) {
    console.error('Failed to save player:', saveError)

    error.value =
      saveError.message || 'Unable to save the player.'
  } finally {
    saving.value = false
  }
}

async function deletePlayer() {
  if (!props.player?.id || deleting.value) return

  const confirmed = window.confirm(
    `Delete ${props.player.name}? Their submitted answers will also be deleted.`,
  )

  if (!confirmed) return

  deleting.value = true
  error.value = ''

  try {
    const response = await fetch('/api/users', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: props.player.id,
      }),
    })

    const responseText = await response.text()

    let data = {}

    if (responseText) {
      data = JSON.parse(responseText)
    }

    if (!response.ok) {
      throw new Error(
        data.error || 'Unable to delete the player.',
      )
    }

    emit('deleted', props.player.id)
  } catch (deleteError) {
    console.error('Failed to delete player:', deleteError)

    error.value =
      deleteError.message || 'Unable to delete the player.'
  } finally {
    deleting.value = false
  }
}

watch(
  () => [props.show, props.player],
  ([isOpen]) => {
    if (isOpen) {
      resetForm()
    }
  },
  {
    immediate: true,
  },
)
</script>

<template>
  <Teleport to="body">
    <Transition name="player-modal">
      <div
        v-if="show"
        class="modal-backdrop"
        @click.self="closeModal"
      >
        <section
          class="player-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="player-modal-title"
        >
          <header class="modal-header">
            <div>
              <small>
                {{
                  isEditing
                    ? 'Account Management'
                    : 'New Quest Account'
                }}
              </small>

              <h2 id="player-modal-title">
                {{ modalTitle }}
              </h2>
            </div>

            <button
              class="close-button"
              type="button"
              aria-label="Close"
              @click="closeModal"
            >
              <X :size="23" />
            </button>
          </header>

          <div class="modal-content">
            <div class="avatar-preview">
              <AppAvatar
                :name="form.name || 'New Player'"
                :image="form.avatar"
                size="lg"
              />
            </div>

            <label class="field">
              <span>Name</span>

              <input
                v-model="form.name"
                type="text"
                autocomplete="off"
                placeholder="Jonny"
              >
            </label>

            <label class="field">
              <span>Username</span>

              <input
                v-model="form.username"
                type="text"
                autocomplete="off"
                autocapitalize="none"
                placeholder="jonny"
              >
            </label>

            <label class="field">
              <span>Password</span>

              <div class="password-field">
                <input
                  v-model="form.password"
                  :type="showingPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="Enter a memorable password"
                >

                <button
                  type="button"
                  :aria-label="
                    showingPassword
                      ? 'Hide password'
                      : 'Show password'
                  "
                  @click="showingPassword = !showingPassword"
                >
                  <EyeOff
                    v-if="showingPassword"
                    :size="20"
                  />

                  <Eye
                    v-else
                    :size="20"
                  />
                </button>
              </div>
            </label>

            <label class="field">
              <span>Role</span>

              <select v-model="form.role">
                <option value="player">
                  Player
                </option>

                <option value="admin">
                  Admin
                </option>
              </select>
            </label>

            <label class="toggle-row">
              <div>
                <strong>Account Active</strong>

                <span>
                  Disabled accounts cannot log in.
                </span>
              </div>

              <input
                v-model="form.isActive"
                type="checkbox"
              >
            </label>

            <p v-if="error" class="error-message">
              {{ error }}
            </p>
          </div>

          <footer class="modal-footer">
            <AppButton
              v-if="isEditing"
              class="delete-button"
              variant="dark"
              :disabled="saving || deleting"
              @click="deletePlayer"
            >
              {{
                deleting
                  ? 'Deleting...'
                  : 'Delete'
              }}
            </AppButton>

            <AppButton
              full
              :disabled="saving || deleting"
              @click="savePlayer"
            >
              {{
                saving
                  ? 'Saving...'
                  : isEditing
                    ? 'Save Changes'
                    : 'Add Player'
              }}
            </AppButton>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(5, 7, 10, 0.84);
  backdrop-filter: blur(6px);
}

.player-modal {
  width: 100%;
  max-width: 460px;
  max-height: calc(100dvh - 36px);
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 22px;
  background:
    radial-gradient(
      circle at top,
      rgba(214, 179, 106, 0.1),
      transparent 32%
    ),
    var(--bg);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
}

.modal-header {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 20px;
  border-bottom: 1px solid var(--border);
  background: rgba(15, 19, 26, 0.96);
  backdrop-filter: blur(12px);
}

.modal-header small {
  display: block;
  margin-bottom: 6px;
  color: var(--gold);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.modal-header h2 {
  margin: 0;
  color: var(--cream);
  font-family: var(--font-heading);
  font-size: 26px;
}

.close-button {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--card);
  color: var(--muted);
}

.modal-content {
  display: grid;
  gap: 16px;
  padding: 20px;
}

.avatar-preview {
  display: grid;
  place-items: center;
  margin-bottom: 4px;
}

.field {
  display: grid;
  gap: 8px;
}

.field > span {
  color: var(--gold-light);
  font-size: 12px;
  font-weight: 700;
}

input,
select {
  width: 100%;
  min-height: 50px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #121821;
  color: var(--cream);
  padding: 13px 14px;
  outline: none;
}

input:focus,
select:focus {
  border-color: var(--gold);
  box-shadow: 0 0 0 3px rgba(214, 179, 106, 0.12);
}

.password-field {
  position: relative;
}

.password-field input {
  padding-right: 52px;
}

.password-field button {
  position: absolute;
  top: 50%;
  right: 7px;
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 0;
  background: transparent;
  color: var(--gold);
  transform: translateY(-50%);
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 13px;
  background: var(--card);
}

.toggle-row div {
  display: grid;
  gap: 4px;
}

.toggle-row strong {
  color: var(--cream);
}

.toggle-row span {
  color: var(--muted);
  font-size: 12px;
}

.toggle-row input {
  width: 22px;
  height: 22px;
  min-height: 0;
  accent-color: var(--gold);
}

.error-message {
  margin: 0;
  padding: 12px;
  border-radius: 10px;
  background: rgba(179, 71, 71, 0.15);
  color: #f2a0a0;
  font-size: 13px;
  font-weight: 700;
}

.modal-footer {
  position: sticky;
  bottom: 0;
  z-index: 3;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  padding:
    14px
    20px
    calc(14px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--border);
  background: rgba(15, 19, 26, 0.97);
  backdrop-filter: blur(12px);
}

.delete-button {
  color: #f2a0a0;
}

.player-modal-enter-active,
.player-modal-leave-active {
  transition: opacity 0.22s ease;
}

.player-modal-enter-active .player-modal,
.player-modal-leave-active .player-modal {
  transition: transform 0.26s ease;
}

.player-modal-enter-from,
.player-modal-leave-to {
  opacity: 0;
}

.player-modal-enter-from .player-modal,
.player-modal-leave-to .player-modal {
  transform: translateY(24px);
}

@media (max-width: 520px) {
  .modal-backdrop {
    place-items: end center;
    padding: 0;
  }

  .player-modal {
    max-height: 94dvh;
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
    border-radius: 22px 22px 0 0;
  }
}
</style>