<script setup>
import {
  computed,
  onMounted,
  ref,
} from 'vue'

import AdminShell from '@/components/layout/AdminShell.vue'
import AppCard from '@/components/base/AppCard.vue'
import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'

import { useRoundsStore } from '@/stores/roundsStore'

const roundsStore = useRoundsStore()

const selectedRoundId = ref(null)
const editingQuestionId = ref(null)

const roundForm = ref(createEmptyRoundForm())
const questionForm = ref(createEmptyQuestionForm())

const pageError = ref('')
const successMessage = ref('')

const questionImageInput = ref(null)
const isUploadingImage = ref(false)

/*
 * The image URL already stored against the question
 * when editing began.
 */
const originalQuestionImageUrl = ref('')

/*
 * A newly uploaded image which has not yet been saved
 * against a question in D1.
 */
const pendingUploadedImageUrl = ref('')

function createEmptyRoundForm() {
  return {
    name: '',
    location: '',
    description: '',
    imageUrl: '',
    isActive: true,
  }
}

function createEmptyQuestionForm() {
  return {
    questionType: 'text',
    questionText: '',
    points: 1,
    correctAnswer: '',
    optionsText: '',
    imageUrl: '',
    isActive: true,
  }
}

const selectedRound = computed(() => {
  return roundsStore.getRoundById(
    selectedRoundId.value,
  )
})

const selectedQuestions = computed(() => {
  if (!selectedRoundId.value) {
    return []
  }

  return roundsStore.getQuestionsByRound(
    selectedRoundId.value,
  )
})

const selectedRoundIndex = computed(() => {
  return roundsStore.allRounds.findIndex(
    (round) =>
      Number(round.id) ===
      Number(selectedRoundId.value),
  )
})

const canMoveRoundUp = computed(() => {
  return selectedRoundIndex.value > 0
})

const canMoveRoundDown = computed(() => {
  return (
    selectedRoundIndex.value !== -1 &&
    selectedRoundIndex.value <
      roundsStore.allRounds.length - 1
  )
})

const isEditingQuestion = computed(() => {
  return editingQuestionId.value !== null
})

const isQuestionBusy = computed(() => {
  return (
    roundsStore.isSaving ||
    isUploadingImage.value
  )
})

function roundLabel(round) {
  const roundIndex = roundsStore.allRounds.findIndex(
    (item) =>
      Number(item.id) === Number(round.id),
  )

  return `Pub ${roundIndex + 1}`
}

function questionTypeLabel(questionType) {
  const labels = {
    text: 'Text',
    long_text: 'Long Text',
    number: 'Number',
    multiple_choice: 'Multiple Choice',
    image: 'Image Question',
  }

  return labels[questionType] || questionType
}

function clearMessages() {
  pageError.value = ''
  successMessage.value = ''
  roundsStore.clearError()
}

function showError(error, fallbackMessage) {
  pageError.value =
    error instanceof Error
      ? error.message
      : fallbackMessage
}

function getImageKey(imageUrl) {
  if (!imageUrl) return ''

  try {
    const url = new URL(
      imageUrl,
      window.location.origin,
    )

    if (
      url.pathname !==
      '/api/question-images'
    ) {
      return ''
    }

    return url.searchParams.get('key') || ''
  } catch {
    return ''
  }
}

async function deleteUploadedImage(imageUrl) {
  const key = getImageKey(imageUrl)

  if (!key) {
    return false
  }

  const response = await fetch(
    '/api/question-images',
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
    let message =
      'Unable to delete the uploaded image.'

    try {
      const data = await response.json()
      message = data.error || message
    } catch {
      // Use the fallback message.
    }

    throw new Error(message)
  }

  return true
}

async function cleanupPendingImage() {
  const pendingUrl =
    pendingUploadedImageUrl.value

  if (!pendingUrl) {
    return
  }

  pendingUploadedImageUrl.value = ''

  try {
    await deleteUploadedImage(pendingUrl)
  } catch (error) {
    console.error(
      'Failed to clean up pending image:',
      error,
    )
  }
}

function resetImageState() {
  originalQuestionImageUrl.value = ''
  pendingUploadedImageUrl.value = ''

  if (questionImageInput.value) {
    questionImageInput.value.value = ''
  }
}

async function selectRound(round) {
  await cleanupPendingImage()

  clearMessages()

  selectedRoundId.value = round.id
  editingQuestionId.value = null

  roundForm.value = {
    name: round.name || '',
    location: round.location || '',
    description: round.description || '',
    imageUrl: round.imageUrl || '',
    isActive: Boolean(round.isActive),
  }

  questionForm.value =
    createEmptyQuestionForm()

  resetImageState()
}

async function selectFirstRound() {
  const firstRound = roundsStore.allRounds[0]

  if (!firstRound) {
    await cleanupPendingImage()

    selectedRoundId.value = null
    roundForm.value = createEmptyRoundForm()
    questionForm.value =
      createEmptyQuestionForm()

    resetImageState()
    return
  }

  await selectRound(firstRound)
}

async function startNewRound() {
  await cleanupPendingImage()

  clearMessages()

  selectedRoundId.value = null
  editingQuestionId.value = null
  roundForm.value = createEmptyRoundForm()
  questionForm.value =
    createEmptyQuestionForm()

  resetImageState()
}

async function saveRound() {
  clearMessages()

  if (!roundForm.value.name.trim()) {
    pageError.value = 'Pub name is required.'
    return
  }

  try {
    if (selectedRound.value) {
      const updatedRound =
        await roundsStore.updateRound({
          id: selectedRound.value.id,
          name: roundForm.value.name,
          location:
            roundForm.value.location,
          description:
            roundForm.value.description,
          imageUrl:
            roundForm.value.imageUrl,
          isActive:
            roundForm.value.isActive,
        })

      selectedRoundId.value =
        updatedRound.id

      successMessage.value =
        'Round updated successfully.'
    } else {
      const createdRound =
        await roundsStore.addRound({
          name: roundForm.value.name,
          location:
            roundForm.value.location,
          description:
            roundForm.value.description,
          imageUrl:
            roundForm.value.imageUrl,
          isActive:
            roundForm.value.isActive,
        })

      await selectRound(createdRound)

      successMessage.value =
        'Round added successfully.'
    }
  } catch (error) {
    showError(
      error,
      'Unable to save the round.',
    )
  }
}

async function removeRound(roundId) {
  const round =
    roundsStore.getRoundById(roundId)

  if (!round) return

  const confirmed = window.confirm(
    `Delete ${round.name} and all of its questions and answers?`,
  )

  if (!confirmed) return

  clearMessages()

  try {
    await roundsStore.deleteRound(roundId)

    successMessage.value =
      'Round deleted successfully.'

    await selectFirstRound()
  } catch (error) {
    showError(
      error,
      'Unable to delete the round.',
    )
  }
}

function getQuestionOptions() {
  return questionForm.value.optionsText
    .split('\n')
    .map((option) => option.trim())
    .filter(Boolean)
}

function openQuestionImagePicker() {
  if (isQuestionBusy.value) return

  questionImageInput.value?.click()
}

async function uploadQuestionImage(event) {
  const file = event.target.files?.[0]

  if (!file) {
    return
  }

  clearMessages()

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ]

  if (!allowedTypes.includes(file.type)) {
    pageError.value =
      'Please choose a JPG, PNG, WebP or GIF image.'

    event.target.value = ''
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    pageError.value =
      'The image must be smaller than 5MB.'

    event.target.value = ''
    return
  }

  isUploadingImage.value = true

  try {
    /*
     * Delete a previous unsaved upload before
     * replacing it with another one.
     */
    if (pendingUploadedImageUrl.value) {
      await deleteUploadedImage(
        pendingUploadedImageUrl.value,
      )

      pendingUploadedImageUrl.value = ''
    }

    const formData = new FormData()
    formData.append('image', file)

    const response = await fetch(
      '/api/question-images',
      {
        method: 'POST',
        body: formData,
      },
    )

    let data = {}

    try {
      data = await response.json()
    } catch {
      throw new Error(
        'The image upload returned an invalid response.',
      )
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
          'Unable to upload the image.',
      )
    }

    questionForm.value.imageUrl = data.url
    pendingUploadedImageUrl.value =
      data.url

    successMessage.value =
      'Image uploaded. Save the question to keep it.'
  } catch (error) {
    console.error(
      'Failed to upload question image:',
      error,
    )

    showError(
      error,
      'Unable to upload the image.',
    )
  } finally {
    isUploadingImage.value = false
    event.target.value = ''
  }
}

async function removeQuestionImage() {
  clearMessages()

  const currentImageUrl =
    questionForm.value.imageUrl

  if (!currentImageUrl) {
    return
  }

  /*
   * A new unsaved upload can be removed from R2
   * immediately.
   */
  if (
    pendingUploadedImageUrl.value &&
    currentImageUrl ===
      pendingUploadedImageUrl.value
  ) {
    isUploadingImage.value = true

    try {
      await deleteUploadedImage(
        pendingUploadedImageUrl.value,
      )

      pendingUploadedImageUrl.value = ''
      questionForm.value.imageUrl = ''

      successMessage.value =
        'Unsaved image removed.'
    } catch (error) {
      showError(
        error,
        'Unable to remove the image.',
      )
    } finally {
      isUploadingImage.value = false
    }

    return
  }

  /*
   * An existing saved image is cleared from the form.
   * It will be deleted from R2 only after the updated
   * question successfully saves.
   */
  questionForm.value.imageUrl = ''

  successMessage.value =
    'Image removed from the form. Save the question to confirm.'
}

async function saveQuestion() {
  clearMessages()

  if (!selectedRound.value) {
    pageError.value =
      'Select or create a round first.'
    return
  }

  if (
    !questionForm.value.questionText.trim()
  ) {
    pageError.value =
      'Question text is required.'
    return
  }

  if (
    questionForm.value.questionType ===
      'image' &&
    !questionForm.value.imageUrl
  ) {
    pageError.value =
      'Please upload an image for this image question.'
    return
  }

  const options = getQuestionOptions()

  if (
    questionForm.value.questionType ===
      'multiple_choice' &&
    options.length < 2
  ) {
    pageError.value =
      'Multiple-choice questions need at least two options.'
    return
  }

  const questionData = {
    roundId: selectedRound.value.id,
    questionType:
      questionForm.value.questionType,
    questionText:
      questionForm.value.questionText,
    correctAnswer:
      questionForm.value.correctAnswer,
    options,
    imageUrl:
      questionForm.value.imageUrl,
    points: Number(
      questionForm.value.points || 0,
    ),
    isActive:
      questionForm.value.isActive,
  }

  const imageUrlBeforeSave =
    originalQuestionImageUrl.value

  const imageUrlAfterSave =
    questionForm.value.imageUrl

  try {
    if (isEditingQuestion.value) {
      await roundsStore.updateQuestion({
        id: editingQuestionId.value,
        ...questionData,
      })

      /*
       * The D1 update succeeded, so the old R2 image
       * can now safely be deleted when it was replaced
       * or removed.
       */
      if (
        imageUrlBeforeSave &&
        imageUrlBeforeSave !==
          imageUrlAfterSave
      ) {
        try {
          await deleteUploadedImage(
            imageUrlBeforeSave,
          )
        } catch (error) {
          console.error(
            'Question saved, but the old image could not be deleted:',
            error,
          )
        }
      }

      successMessage.value =
        'Question updated successfully.'
    } else {
      await roundsStore.addQuestion(
        questionData,
      )

      successMessage.value =
        'Question added successfully.'
    }

    /*
     * The newly uploaded image is now attached to a
     * saved D1 question, so it is no longer pending.
     */
    pendingUploadedImageUrl.value = ''

    await cancelQuestionEditing({
      preserveMessage: true,
      cleanupImage: false,
    })
  } catch (error) {
    showError(
      error,
      'Unable to save the question.',
    )
  }
}

async function editQuestion(question) {
  await cleanupPendingImage()

  clearMessages()

  editingQuestionId.value = question.id

  questionForm.value = {
    questionType:
      question.questionType || 'text',
    questionText:
      question.questionText || '',
    points: Number(
      question.points ?? 1,
    ),
    correctAnswer:
      question.correctAnswer || '',
    optionsText: Array.isArray(
      question.options,
    )
      ? question.options.join('\n')
      : '',
    imageUrl:
      question.imageUrl || '',
    isActive:
      Boolean(question.isActive),
  }

  originalQuestionImageUrl.value =
    question.imageUrl || ''

  pendingUploadedImageUrl.value = ''

  if (questionImageInput.value) {
    questionImageInput.value.value = ''
  }

  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

async function cancelQuestionEditing(
  {
    preserveMessage = false,
    cleanupImage = true,
  } = {},
) {
  if (cleanupImage) {
    await cleanupPendingImage()
  }

  editingQuestionId.value = null
  questionForm.value =
    createEmptyQuestionForm()

  resetImageState()

  if (!preserveMessage) {
    clearMessages()
  }
}

async function removeQuestion(question) {
  const confirmed = window.confirm(
    'Delete this question and all submitted answers for it?',
  )

  if (!confirmed) return

  clearMessages()

  try {
    await roundsStore.deleteQuestion(
      question.id,
    )

    /*
     * The database question has been deleted. Remove
     * its uploaded image from R2 as well.
     */
    if (question.imageUrl) {
      try {
        await deleteUploadedImage(
          question.imageUrl,
        )
      } catch (error) {
        console.error(
          'Question deleted, but its image could not be deleted:',
          error,
        )
      }
    }

    if (
      Number(editingQuestionId.value) ===
      Number(question.id)
    ) {
      await cancelQuestionEditing({
        preserveMessage: true,
      })
    }

    successMessage.value =
      'Question deleted successfully.'
  } catch (error) {
    showError(
      error,
      'Unable to delete the question.',
    )
  }
}

async function moveSelectedRound(direction) {
  if (!selectedRound.value) return

  clearMessages()

  try {
    const moved =
      await roundsStore.moveRound(
        selectedRound.value.id,
        direction,
      )

    if (moved) {
      successMessage.value =
        'Round order updated successfully.'
    }
  } catch (error) {
    showError(
      error,
      'Unable to reorder the round.',
    )
  }
}

async function moveQuestion(
  question,
  direction,
) {
  clearMessages()

  try {
    const moved =
      await roundsStore.moveQuestion(
        question.id,
        direction,
      )

    if (moved) {
      successMessage.value =
        'Question order updated successfully.'
    }
  } catch (error) {
    showError(
      error,
      'Unable to reorder the question.',
    )
  }
}

onMounted(async () => {
  clearMessages()

  try {
    await roundsStore.loadQuizContent()
    await selectFirstRound()
  } catch (error) {
    showError(
      error,
      'Unable to load rounds and questions.',
    )
  }
})
</script>

<template>
  <AdminShell>
    <AppCard
      v-if="roundsStore.isLoading"
      class="admin-card"
    >
      <p>Loading rounds and questions...</p>
    </AppCard>

    <template v-else>
      <div
        v-if="pageError || roundsStore.error"
        class="message message-error"
      >
        {{ pageError || roundsStore.error }}
      </div>

      <div
        v-if="successMessage"
        class="message message-success"
      >
        {{ successMessage }}
      </div>

      <AppCard class="admin-card">
        <div class="section-heading">
          <div>
            <small>Rounds</small>
            <h1>Quiz content</h1>
          </div>

          <AppButton
            variant="dark"
            :disabled="
              roundsStore.isSaving ||
              isUploadingImage
            "
            @click="startNewRound"
          >
            New Round
          </AppButton>
        </div>

        <p
          v-if="!roundsStore.allRounds.length"
          class="empty-state"
        >
          No rounds have been added yet.
        </p>

        <div
          v-else
          class="round-tabs"
        >
          <button
            v-for="round in roundsStore.allRounds"
            :key="round.id"
            type="button"
            :disabled="isQuestionBusy"
            :class="{
              active:
                Number(selectedRoundId) ===
                Number(round.id),
              inactive: !round.isActive,
            }"
            @click="selectRound(round)"
          >
            <strong>
              {{ roundLabel(round) }}
            </strong>

            <span>{{ round.name }}</span>
          </button>
        </div>
      </AppCard>

      <div class="editor-layout">
        <div class="editor-main">
          <AppCard class="admin-card">
            <small>
              {{
                selectedRound
                  ? 'Edit Round'
                  : 'Add Round'
              }}
            </small>

            <div class="form-grid">
              <AppInput
                v-model="roundForm.name"
                label="Pub Name"
                placeholder="The Golden Fleece"
              />

              <AppInput
                v-model="roundForm.location"
                label="Location"
                placeholder="York"
              />

              <label class="field">
                <span>Round Introduction</span>

                <textarea
                  v-model="
                    roundForm.description
                  "
                  rows="4"
                  placeholder="Add an introduction or instructions for this pub"
                />
              </label>

              <AppInput
                v-model="roundForm.imageUrl"
                label="Round Image URL"
                placeholder="Optional for now"
              />

              <label class="checkbox-field">
                <input
                  v-model="
                    roundForm.isActive
                  "
                  type="checkbox"
                />

                <span>
                  Round is active and visible
                </span>
              </label>

              <div class="button-row">
                <AppButton
                  full
                  :disabled="
                    roundsStore.isSaving ||
                    isUploadingImage
                  "
                  @click="saveRound"
                >
                  {{
                    roundsStore.isSaving
                      ? 'Saving...'
                      : selectedRound
                        ? 'Save Round'
                        : 'Add Round'
                  }}
                </AppButton>

                <AppButton
                  v-if="selectedRound"
                  variant="dark"
                  :disabled="
                    roundsStore.isSaving ||
                    isUploadingImage ||
                    !canMoveRoundUp
                  "
                  @click="
                    moveSelectedRound('up')
                  "
                >
                  Move Up
                </AppButton>

                <AppButton
                  v-if="selectedRound"
                  variant="dark"
                  :disabled="
                    roundsStore.isSaving ||
                    isUploadingImage ||
                    !canMoveRoundDown
                  "
                  @click="
                    moveSelectedRound('down')
                  "
                >
                  Move Down
                </AppButton>

                <AppButton
                  v-if="selectedRound"
                  variant="dark"
                  :disabled="
                    roundsStore.isSaving ||
                    isUploadingImage
                  "
                  @click="
                    removeRound(
                      selectedRound.id,
                    )
                  "
                >
                  Delete Round
                </AppButton>
              </div>
            </div>
          </AppCard>

          <AppCard
            v-if="selectedRound"
            class="admin-card"
          >
            <div class="section-heading">
              <div>
                <small>
                  {{
                    isEditingQuestion
                      ? 'Edit Question'
                      : 'Add Question'
                  }}
                </small>

                <h2>
                  {{ roundLabel(selectedRound) }}:
                  {{ selectedRound.name }}
                </h2>
              </div>

              <AppButton
                v-if="isEditingQuestion"
                variant="dark"
                :disabled="isQuestionBusy"
                @click="
                  cancelQuestionEditing()
                "
              >
                Cancel Edit
              </AppButton>
            </div>

            <div class="form-grid">
              <label class="field">
                <span>Question Type</span>

                <select
                  v-model="
                    questionForm.questionType
                  "
                  :disabled="isQuestionBusy"
                >
                  <option value="text">
                    Text
                  </option>

                  <option value="long_text">
                    Long Text
                  </option>

                  <option value="number">
                    Number
                  </option>

                  <option
                    value="multiple_choice"
                  >
                    Multiple Choice
                  </option>

                  <option value="image">
                    Image Question
                  </option>
                </select>
              </label>

              <label class="field">
                <span>Question</span>

                <textarea
                  v-model="
                    questionForm.questionText
                  "
                  rows="4"
                  placeholder="Enter the question"
                  :disabled="isQuestionBusy"
                />
              </label>

              <AppInput
                v-model="
                  questionForm.points
                "
                label="Points"
                type="number"
                min="0"
                placeholder="1"
                :disabled="isQuestionBusy"
              />

              <label
                v-if="
                  questionForm.questionType ===
                  'multiple_choice'
                "
                class="field"
              >
                <span>
                  Multiple-choice options
                </span>

                <textarea
                  v-model="
                    questionForm.optionsText
                  "
                  rows="5"
                  placeholder="Enter one option per line"
                  :disabled="isQuestionBusy"
                />
              </label>

              <div
                v-if="
                  questionForm.questionType ===
                  'image'
                "
                class="image-upload-field"
              >
                <span class="image-upload-label">
                  Question Image
                </span>

                <input
                  ref="questionImageInput"
                  class="hidden-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  @change="
                    uploadQuestionImage
                  "
                />

                <div
                  v-if="
                    questionForm.imageUrl
                  "
                  class="image-preview"
                >
                  <img
                    :src="
                      questionForm.imageUrl
                    "
                    alt="Question image preview"
                  />
                </div>

                <p
                  v-else
                  class="image-help"
                >
                  Upload a JPG, PNG, WebP or GIF.
                  Maximum size 5MB.
                </p>

                <div class="image-actions">
                  <AppButton
                    variant="dark"
                    :disabled="
                      isQuestionBusy
                    "
                    @click="
                      openQuestionImagePicker
                    "
                  >
                    {{
                      isUploadingImage
                        ? 'Uploading...'
                        : questionForm.imageUrl
                          ? 'Replace Image'
                          : 'Choose Image'
                    }}
                  </AppButton>

                  <AppButton
                    v-if="
                      questionForm.imageUrl
                    "
                    variant="dark"
                    :disabled="
                      isQuestionBusy
                    "
                    @click="
                      removeQuestionImage
                    "
                  >
                    Remove Image
                  </AppButton>
                </div>
              </div>

              <AppInput
                v-model="
                  questionForm.correctAnswer
                "
                label="Correct Answer"
                placeholder="Enter the correct answer"
                :disabled="isQuestionBusy"
              />

              <label class="checkbox-field">
                <input
                  v-model="
                    questionForm.isActive
                  "
                  type="checkbox"
                  :disabled="isQuestionBusy"
                />

                <span>
                  Question is active and visible
                </span>
              </label>

              <AppButton
                full
                :disabled="isQuestionBusy"
                @click="saveQuestion"
              >
                {{
                  isUploadingImage
                    ? 'Uploading Image...'
                    : roundsStore.isSaving
                      ? 'Saving...'
                      : isEditingQuestion
                        ? 'Save Question'
                        : 'Add Question'
                }}
              </AppButton>
            </div>
          </AppCard>
        </div>

        <AppCard
          v-if="selectedRound"
          class="admin-card question-panel"
        >
          <small>Questions</small>

          <p
            v-if="!selectedQuestions.length"
            class="empty-state"
          >
            No questions have been added to
            this round.
          </p>

          <div
            v-else
            class="question-list"
          >
            <article
              v-for="(
                question,
                questionIndex
              ) in selectedQuestions"
              :key="question.id"
              class="question-row"
              :class="{
                inactive:
                  !question.isActive,
              }"
            >
              <div class="question-heading">
                <div>
                  <strong>
                    Question
                    {{ questionIndex + 1 }}
                  </strong>

                  <span>
                    {{
                      questionTypeLabel(
                        question.questionType,
                      )
                    }}
                    ·
                    {{ question.points }}
                    point(s)
                  </span>
                </div>

                <span
                  v-if="!question.isActive"
                  class="status-badge"
                >
                  Hidden
                </span>
              </div>

              <div
                v-if="question.imageUrl"
                class="question-list-image"
              >
                <img
                  :src="question.imageUrl"
                  :alt="
                    `Image for question ${
                      questionIndex + 1
                    }`
                  "
                />
              </div>

              <p>
                {{ question.questionText }}
              </p>

              <p
                v-if="
                  question.questionType ===
                    'multiple_choice' &&
                  question.options.length
                "
                class="question-detail"
              >
                Options:
                {{
                  question.options.join(', ')
                }}
              </p>

              <p class="question-detail">
                Correct answer:
                {{
                  question.correctAnswer ||
                  'Not set'
                }}
              </p>

              <div class="question-actions">
                <AppButton
                  variant="dark"
                  :disabled="
                    isQuestionBusy ||
                    questionIndex === 0
                  "
                  @click="
                    moveQuestion(
                      question,
                      'up',
                    )
                  "
                >
                  Up
                </AppButton>

                <AppButton
                  variant="dark"
                  :disabled="
                    isQuestionBusy ||
                    questionIndex ===
                      selectedQuestions.length -
                        1
                  "
                  @click="
                    moveQuestion(
                      question,
                      'down',
                    )
                  "
                >
                  Down
                </AppButton>

                <AppButton
                  variant="dark"
                  :disabled="isQuestionBusy"
                  @click="
                    editQuestion(question)
                  "
                >
                  Edit
                </AppButton>

                <AppButton
                  variant="dark"
                  :disabled="isQuestionBusy"
                  @click="
                    removeQuestion(question)
                  "
                >
                  Delete
                </AppButton>
              </div>
            </article>
          </div>
        </AppCard>
      </div>
    </template>
  </AdminShell>
</template>

<style scoped>
.admin-card {
  padding: 18px;
}

small {
  display: block;
  margin-bottom: 12px;
  color: var(--gold);
  font-weight: 800;
  text-transform: uppercase;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  color: var(--cream);
  font-size: 26px;
}

h2 {
  color: var(--cream);
  font-size: 22px;
}

p {
  margin-top: 8px;
  color: var(--muted);
}

.editor-layout,
.editor-main,
.question-panel,
.form-grid,
.question-list {
  display: grid;
  min-width: 0;
}

.editor-layout,
.editor-main {
  gap: 18px;
}

.form-grid {
  gap: 14px;
}

.question-list {
  gap: 10px;
}

.section-heading,
.question-heading,
.button-row,
.question-actions,
.image-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-width: 0;
}

.section-heading {
  margin-bottom: 18px;
}

.round-tabs {
  display: flex;
  width: 100%;
  min-width: 0;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.round-tabs button {
  display: grid;
  flex: 0 0 auto;
  min-width: 145px;
  gap: 4px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card);
  color: var(--muted);
  padding: 14px;
  text-align: left;
  cursor: pointer;
}

.round-tabs button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.round-tabs button strong {
  color: var(--cream);
}

.round-tabs button span {
  color: var(--muted);
  font-size: 12px;
}

.round-tabs button.active {
  border-color: var(--gold);
  box-shadow:
    0 0 18px
    rgba(214, 179, 106, 0.14);
}

.round-tabs button.active strong,
.round-tabs button.active span {
  color: var(--gold-light);
}

.round-tabs button.inactive {
  opacity: 0.55;
}

.field,
.image-upload-field {
  display: grid;
  min-width: 0;
  gap: 8px;
}

.field span,
.image-upload-label {
  color: var(--gold-light);
  font-size: 12px;
  font-weight: 700;
}

select,
textarea {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #121821;
  color: var(--cream);
  padding: 14px;
  outline: none;
  font: inherit;
}

select:focus,
textarea:focus {
  border-color: var(--gold);
  box-shadow:
    0 0 0 3px
    rgba(214, 179, 106, 0.12);
}

select:disabled,
textarea:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--cream);
  font-size: 14px;
  cursor: pointer;
}

.checkbox-field input {
  width: 18px;
  height: 18px;
  accent-color: var(--gold);
}

.hidden-file-input {
  display: none;
}

.image-preview,
.question-list-image {
  overflow: hidden;
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #121821;
}

.image-preview {
  aspect-ratio: 16 / 10;
}

.question-list-image {
  aspect-ratio: 16 / 9;
}

.image-preview img,
.question-list-image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-help {
  margin-top: 0;
  font-size: 13px;
}

.image-actions {
  justify-content: flex-start;
  flex-wrap: wrap;
}

.question-row {
  display: grid;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  gap: 12px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card);
  color: var(--cream);
  padding: 14px;
}

.question-row.inactive {
  opacity: 0.62;
}

.question-row span {
  display: block;
  margin-top: 4px;
  color: var(--gold);
  font-size: 12px;
  font-weight: 800;
}

.question-detail {
  margin-top: 0;
  font-size: 13px;
}

.question-heading > div {
  min-width: 0;
}

.question-actions {
  justify-content: flex-start;
  flex-wrap: wrap;
}

.status-badge {
  flex: 0 0 auto;
  margin: 0 !important;
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 5px 9px;
}

.empty-state {
  margin-top: 0;
  padding: 18px 0;
}

.message {
  margin-bottom: 18px;
  border-radius: 12px;
  padding: 14px 16px;
  font-weight: 700;
}

.message-error {
  border: 1px solid
    rgba(239, 68, 68, 0.4);
  background:
    rgba(239, 68, 68, 0.12);
  color: #fecaca;
}

.message-success {
  border: 1px solid
    rgba(34, 197, 94, 0.4);
  background:
    rgba(34, 197, 94, 0.12);
  color: #bbf7d0;
}

@media (min-width: 1000px) {
  .admin-card {
    padding: 24px;
  }

  .editor-layout {
    grid-template-columns:
      minmax(0, 1.15fr)
      minmax(360px, 0.85fr);
    align-items: start;
  }

  .question-panel {
    position: sticky;
    top: 24px;
    max-height: calc(100vh - 48px);
    overflow-y: auto;
  }
}

@media (max-width: 640px) {
  .admin-card {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: 18px;
  }

  .section-heading,
  .button-row {
    align-items: stretch;
    flex-direction: column;
  }

  .section-heading > *,
  .button-row > * {
    width: 100%;
    min-width: 0;
  }

  .round-tabs button {
    min-width: 150px;
    max-width: 210px;
  }

  .question-heading {
    align-items: flex-start;
  }

  .question-actions > *,
  .image-actions > * {
    flex: 1 1 calc(50% - 7px);
  }
}
</style>