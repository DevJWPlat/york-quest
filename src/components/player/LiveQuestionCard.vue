<script setup>
import { ref, watch } from 'vue'
import {
  Image as ImageIcon,
  ScrollText,
} from 'lucide-vue-next'

import AppButton from '@/components/base/AppButton.vue'
import AppCard from '@/components/base/AppCard.vue'

const props = defineProps({
  question: {
    type: Object,
    required: true,
  },

  questionNumber: {
    type: Number,
    required: true,
  },

  totalQuestions: {
    type: Number,
    required: true,
  },

  submitting: {
    type: Boolean,
    default: false,
  },

  error: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['submit'])

const answer = ref('')

function submitAnswer() {
  const value = String(answer.value).trim()

  if (!value || props.submitting) {
    return
  }

  emit('submit', value)
}

watch(
  () => props.question.id,
  () => {
    answer.value = ''
  },
)
</script>

<template>
  <section class="question-screen">
    <div class="question-header">
      <small>
        Question {{ questionNumber }} /
        {{ totalQuestions }}
      </small>

      <div class="progress">
        <span
          :style="{
            width: `${
              (questionNumber / totalQuestions) * 100
            }%`,
          }"
        />
      </div>
    </div>

    <div class="icon-circle">
      <ImageIcon
        v-if="question.type === 'image'"
        :size="64"
        stroke-width="1.6"
      />

      <ScrollText
        v-else
        :size="64"
        stroke-width="1.6"
      />
    </div>

    <AppCard class="question-card">
      <h1>{{ question.text }}</h1>

      <div
        v-if="
          question.type === 'image' &&
          question.image
        "
        class="question-image"
      >
        <img
          :src="question.image"
          :alt="question.text"
        >
      </div>

      <div
        v-if="
          question.type === 'multiple-choice'
        "
        class="answers"
      >
        <button
          v-for="option in question.options"
          :key="option"
          type="button"
          :disabled="submitting"
          :class="{
            selected: answer === option,
          }"
          @click="answer = option"
        >
          {{ option }}
        </button>
      </div>

      <input
        v-else-if="question.type === 'number'"
        v-model="answer"
        type="number"
        inputmode="numeric"
        placeholder="Enter your answer"
        :disabled="submitting"
        @keyup.enter="submitAnswer"
      >

      <textarea
        v-else-if="question.type === 'long-text'"
        v-model="answer"
        rows="6"
        placeholder="Enter your answer"
        :disabled="submitting"
      />

      <input
        v-else
        v-model="answer"
        type="text"
        placeholder="Enter your answer"
        :disabled="submitting"
        @keyup.enter="submitAnswer"
      >

      <p
        v-if="error"
        class="submit-error"
      >
        {{ error }}
      </p>

      <AppButton
        full
        :disabled="
          !String(answer).trim() ||
          submitting
        "
        @click="submitAnswer"
      >
        {{
          submitting
            ? 'Submitting...'
            : 'Submit Answer'
        }}
      </AppButton>
    </AppCard>
  </section>
</template>

<style scoped>
.question-screen {
  display: grid;
  gap: 22px;
  padding-top: 22px;
}

.question-header {
  display: grid;
  gap: 10px;
}

.question-header small {
  color: var(--gold);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.progress {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    var(--gold),
    var(--gold-light)
  );
}

.icon-circle {
  display: grid;
  place-items: center;
  width: 118px;
  height: 118px;
  margin: 10px auto;
  border: 1px solid var(--gold);
  border-radius: 50%;
  color: var(--gold);
  box-shadow:
    0 0 24px
    rgba(214, 179, 106, 0.14);
}

.question-card {
  display: grid;
  gap: 18px;
  min-width: 0;
  padding: 22px;
}

h1 {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 26px;
  line-height: 1.2;
}

.question-image {
  overflow: hidden;
  width: 100%;
  aspect-ratio: 16 / 10;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #121821;
}

.question-image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.answers {
  display: grid;
  gap: 12px;
}

.answers button,
input,
textarea {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #121821;
  color: var(--cream);
  padding: 15px;
  text-align: left;
  outline: none;
  font: inherit;
}

.answers button {
  cursor: pointer;
}

.answers button.selected {
  border-color: var(--gold);
  background: rgba(214, 179, 106, 0.1);
  color: var(--gold-light);
}

.answers button:disabled,
input:disabled,
textarea:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

input:focus,
textarea:focus {
  border-color: var(--gold);
  box-shadow:
    0 0 0 3px
    rgba(214, 179, 106, 0.12);
}

.submit-error {
  margin: 0;
  color: var(--error);
  font-size: 13px;
  font-weight: 700;
}

@media (max-width: 480px) {
  .question-card {
    padding: 18px;
  }

  h1 {
    font-size: 23px;
  }

  .question-image {
    aspect-ratio: 4 / 3;
  }
}
</style>