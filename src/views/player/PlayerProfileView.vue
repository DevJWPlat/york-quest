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

const choosingPhoto = ref(false)
const takingPhoto = ref(false)
const removingPhoto = ref(false)

const uploadError = ref('')
const successMessage = ref('')

function clearMessages() {
  uploadError.value = ''
  successMessage.value = ''
}

function getProfileImageKey(imageUrl) {
  if (!imageUrl) {
    return ''
  }

  try {
    const url = new URL(
      imageUrl,
      window.location.origin,
    )

    return url.searchParams.get('key') || ''
  } catch {
    return ''
  }
}

async function deleteProfileImage(imageUrl) {
  const key = getProfileImageKey(imageUrl)

  if (!key || !key.startsWith('profiles/')) {
    return
  }

  const response = await fetch(
    '/api/profile-images',
    {
      method: 'DELETE',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        key,
      }),
    },
  )

  if (!response.ok && response.status !== 404) {
    console.warn(
      'The previous profile image could not be deleted.',
    )
  }
}

async function uploadProfileImage(
  file,
  uploadType,
) {
  clearMessages()

  if (!file) {
    return
  }

  if (
    ![
      'image/jpeg',
      'image/png',
      'image/webp',
    ].includes(file.type)
  ) {
    uploadError.value =
      'Please choose a JPG, PNG or WebP image.'

    return
  }

  const maxFileSize = 5 * 1024 * 1024

  if (file.size > maxFileSize) {
    uploadError.value =
      'The image must be smaller than 5MB.'

    return
  }

  if (!authStore.user?.id) {
    uploadError.value =
      'Your user account could not be found.'

    return
  }

  if (uploadType === 'camera') {
    takingPhoto.value = true
  } else {
    choosingPhoto.value = true
  }

  const previousAvatar =
    authStore.user.avatar || ''

  let uploadedImageUrl = ''

  try {
    const formData = new FormData()

    formData.append(
      'userId',
      String(authStore.user.id),
    )

    formData.append('image', file)

    const uploadResponse = await fetch(
      '/api/profile-images',
      {
        method: 'POST',
        body: formData,
      },
    )

    const uploadData =
      await uploadResponse.json()

    if (!uploadResponse.ok) {
      throw new Error(
        uploadData.error ||
          'Unable to upload the image.',
      )
    }

    uploadedImageUrl = uploadData.url

    const updateResult =
      await authStore.updateCurrentUser({
        avatar: uploadedImageUrl,
      })

    if (!updateResult.success) {
      await deleteProfileImage(
        uploadedImageUrl,
      )

      throw new Error(
        updateResult.error ||
          'Unable to save the profile image.',
      )
    }

    if (
      previousAvatar &&
      previousAvatar !== uploadedImageUrl
    ) {
      await deleteProfileImage(
        previousAvatar,
      )
    }

    successMessage.value =
      'Profile picture updated.'
  } catch (error) {
    console.error(
      'Failed to update profile image:',
      error,
    )

    uploadError.value =
      error.message ||
      'Unable to update your profile picture.'
  } finally {
    choosingPhoto.value = false
    takingPhoto.value = false
  }
}

function handlePhotoSelection(event) {
  const file = event.target.files?.[0]

  event.target.value = ''

  uploadProfileImage(file, 'photo')
}

function handleCameraSelection(event) {
  const file = event.target.files?.[0]

  event.target.value = ''

  uploadProfileImage(file, 'camera')
}

async function removeProfilePicture() {
  if (!authStore.user?.avatar) {
    return
  }

  const confirmed = window.confirm(
    'Remove your current profile picture?',
  )

  if (!confirmed) {
    return
  }

  clearMessages()

  removingPhoto.value = true

  const previousAvatar =
    authStore.user.avatar

  try {
    const updateResult =
      await authStore.updateCurrentUser({
        avatar: '',
      })

    if (!updateResult.success) {
      throw new Error(
        updateResult.error ||
          'Unable to remove the profile picture.',
      )
    }

    await deleteProfileImage(
      previousAvatar,
    )

    successMessage.value =
      'Profile picture removed.'
  } catch (error) {
    console.error(
      'Failed to remove profile image:',
      error,
    )

    uploadError.value =
      error.message ||
      'Unable to remove your profile picture.'
  } finally {
    removingPhoto.value = false
  }
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
        <div class="profile-heading">
          <AppAvatar
            :name="authStore.user?.name || ''"
            :image="authStore.user?.avatar || ''"
            size="lg"
          />

          <div>
            <h1>
              {{ authStore.user?.name }}
            </h1>

            <p>
              @{{ authStore.user?.username }}
            </p>
          </div>
        </div>

        <div
          v-if="uploadError"
          class="message message-error"
        >
          {{ uploadError }}
        </div>

        <div
          v-if="successMessage"
          class="message message-success"
        >
          {{ successMessage }}
        </div>

        <div class="photo-actions">
          <label
            class="upload-button"
            :class="{
              disabled:
                choosingPhoto ||
                takingPhoto ||
                removingPhoto,
            }"
          >
            {{
              choosingPhoto
                ? 'Uploading...'
                : 'Choose Photo'
            }}

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              :disabled="
                choosingPhoto ||
                takingPhoto ||
                removingPhoto
              "
              @change="handlePhotoSelection"
            >
          </label>

          <label
            class="upload-button"
            :class="{
              disabled:
                choosingPhoto ||
                takingPhoto ||
                removingPhoto,
            }"
          >
            {{
              takingPhoto
                ? 'Uploading...'
                : 'Take Selfie'
            }}

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="user"
              :disabled="
                choosingPhoto ||
                takingPhoto ||
                removingPhoto
              "
              @change="handleCameraSelection"
            >
          </label>

          <AppButton
            v-if="authStore.user?.avatar"
            variant="dark"
            full
            :disabled="
              choosingPhoto ||
              takingPhoto ||
              removingPhoto
            "
            @click="removeProfilePicture"
          >
            {{
              removingPhoto
                ? 'Removing...'
                : 'Remove Profile Picture'
            }}
          </AppButton>
        </div>

        <div class="account-actions">
          <AppButton
            variant="dark"
            full
            @click="router.push('/app')"
          >
            Back to Quest
          </AppButton>

          <AppButton
            full
            @click="showLogoutModal = true"
          >
            Logout
          </AppButton>
        </div>
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
  padding: 28px 0 48px;
}

.profile-card {
  display: grid;
  gap: 24px;
  width: 100%;
  box-sizing: border-box;
  padding: 26px;
}

.profile-heading {
  display: grid;
  justify-items: center;
  gap: 18px;
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

.photo-actions,
.account-actions {
  display: grid;
  gap: 12px;
}

.upload-button {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--gold);
  border-radius: 10px;
  color: var(--gold-light);
  padding: 14px 18px;
  font-weight: 700;
  text-align: center;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    opacity 0.2s ease,
    background 0.2s ease;
}

.upload-button:hover {
  background: rgba(
    214,
    179,
    106,
    0.08
  );
}

.upload-button.disabled {
  opacity: 0.55;
  pointer-events: none;
}

.upload-button input {
  display: none;
}

.message {
  width: 100%;
  box-sizing: border-box;
  border-radius: 12px;
  padding: 13px 15px;
  font-size: 13px;
  font-weight: 700;
  text-align: center;
}

.message-error {
  border: 1px solid
    rgba(239, 68, 68, 0.4);
  background: rgba(
    239,
    68,
    68,
    0.12
  );
  color: #fecaca;
}

.message-success {
  border: 1px solid
    rgba(34, 197, 94, 0.4);
  background: rgba(
    34,
    197,
    94,
    0.12
  );
  color: #bbf7d0;
}

@media (min-width: 640px) {
  .profile-card {
    max-width: 520px;
    margin: 0 auto;
  }

  .photo-actions {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }

  .photo-actions > :last-child {
    grid-column: 1 / -1;
  }
}
</style>