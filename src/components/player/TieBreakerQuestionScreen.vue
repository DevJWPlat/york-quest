<script setup>
import {
  computed,
  ref,
  watch,
} from 'vue'

import {
  Scale,
} from 'lucide-vue-next'

import AppButton from '@/components/base/AppButton.vue'
import AppCard from '@/components/base/AppCard.vue'

const props = defineProps({
  question: {
    type: Object,
    required: true,
  },

  participant: {
    type: Object,
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

const emit = defineEmits([
  'submit',
])

const answer = ref('')

const hasSubmitted = computed(() => {
  return Boolean(
    props.participant?.hasSubmitted,
  )
})

const questionType = computed(() => {
  return (
    props.question?.questionType ||
    'text'
  )
})

const options = computed(() => {
  return Array.isArray(
    props.question?.options,
  )
    ? props.question.options
    : []
})

const canSubmit = computed(() => {
  return Boolean(
    String(answer.value || '').trim() &&
    !props.submitting &&
    !hasSubmitted.value,
  )
})

function submitAnswer() {
  if (!canSubmit.value) {
    return
  }

  emit(
    'submit',
    String(answer.value).trim(),
  )
}

watch(
  () => props.participant?.answer,
  (savedAnswer) => {
    if (
      props.participant?.hasSubmitted &&
      savedAnswer
    ) {
      answer.value = savedAnswer
    }
  },
  {
    immediate: true,
  },
)
</script>

<template>
  <section class="tie-breaker-screen">
    <header class="tie-breaker-heading">
      <div class="icon-circle">
        <Scale
          :size="58"
          stroke-width="1.6"
        />
      </div>

      <small>Round Tie-Breaker</small>

      <h1>
        Sudden Death
      </h1>

      <p>
        This question decides the official
        round winner. No points will be added.
      </p>
    </header>

    <AppCard class="question-card">
      <div
        v-if="question.imageUrl"
        class="question-image"
      >
        <img
          :src="question.imageUrl"
          alt="Tie-breaker question"
        >
      </div>

      <h2>
        {{ question.questionText }}
      </h2>

      <div
        v-if="
          questionType ===
          'multiple_choice'
        "
        class="answers"
      >
        <button
          v-for="option in options"
          :key="option"
          type="button"
          :disabled="
            submitting ||
            hasSubmitted
          "
          :class="{
            selected:
              answer === option,
          }"
          @click="answer = option"
        >
          {{ option }}
        </button>
      </div>

      <input
        v-else-if="
          questionType === 'number'
        "
        v-model="answer"
        type="number"
        placeholder="Enter your answer"
        :disabled="
          submitting ||
          hasSubmitted
        "
        @keyup.enter="submitAnswer"
      >

      <textarea
        v-else
        v-model="answer"
        rows="4"
        placeholder="Enter your answer"
        :disabled="
          submitting ||
          hasSubmitted
        "
      />

      <p
        v-if="error"
        class="submit-error"
      >
        {{ error }}
      </p>

      <div
        v-if="hasSubmitted"
        class="submitted-message"
      >
        <strong>
          Answer submitted
        </strong>

        <p>
          Wait for the Quest Master to decide
          the round winner.
        </p>
      </div>

      <AppButton
        v-else
        full
        :disabled="!canSubmit"
        @click="submitAnswer"
      >
        {{
          submitting
            ? 'Submitting...'
            : 'Submit Tie-Breaker Answer'
        }}
      </AppButton>
    </AppCard>
  </section>
</template>

<style scoped>
.tie-breaker-screen {
  display: grid;
  gap: 24px;
  padding: 24px 0 48px;
}

.tie-breaker-heading {
  text-align: center;
}

.icon-circle {
  display: grid;
  width: 116px;
  height: 116px;
  place-items: center;
  margin: 0 auto 18px;
  border: 1px solid var(--gold);
  border-radius: 50%;
  color: var(--gold);
  background: var(--bg);
  box-shadow:
    0 0 28px
    rgba(214, 179, 106, 0.16);
}

.tie-breaker-heading small {
  color: var(--gold);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.tie-breaker-heading h1 {
  margin: 8px 0 0;
  color: var(--gold-light);
  font-family: var(--font-heading);
  font-size: 34px;
}

.tie-breaker-heading p {
  max-width: 320px;
  margin: 12px auto 0;
  color: var(--muted);
  line-height: 1.5;
}

.question-card {
  display: grid;
  gap: 18px;
  padding: 22px;
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
  object-fit: cover;
}

h2 {
  margin: 0;
  color: var(--cream);
  font-family: var(--font-heading);
  font-size: 25px;
  line-height: 1.3;
}

.answers {
  display: grid;
  gap: 12px;
}

.answers button,
input,
textarea {
  width: 100%;
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
  background:
    rgba(214, 179, 106, 0.1);
  color: var(--gold-light);
}

.answers button:disabled,
input:disabled,
textarea:disabled {
  cursor: not-allowed;
  opacity: 0.68;
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

.submitted-message {
  padding: 16px;
  border: 1px solid
    rgba(34, 197, 94, 0.35);
  border-radius: 14px;
  background:
    rgba(34, 197, 94, 0.08);
  text-align: center;
}

.submitted-message strong {
  color: #bbf7d0;
}

.submitted-message p {
  margin: 6px 0 0;
  color: var(--muted);
  line-height: 1.45;
}
</style>