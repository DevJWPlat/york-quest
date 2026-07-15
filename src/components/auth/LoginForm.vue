<script setup>
import { ref } from 'vue'

import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'
import { Eye, EyeOff } from 'lucide-vue-next'

const showPassword = ref(false)

defineProps({
  mode: {
    type: String,
    default: 'player',
  },
  error: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['submit'])

const username = ref('')
const password = ref('')

function handleSubmit() {
  emit('submit', {
    username: username.value,
    password: password.value,
  })
}
</script>

<template>
  <form class="login-form" @submit.prevent="handleSubmit">
    <div class="form-heading">
      <h2>{{ mode === 'admin' ? 'Admin Login' : 'Player Login' }}</h2>
      <p>
        {{
          mode === 'admin'
            ? 'Quest control for the day.'
            : 'Enter your details to begin.'
        }}
      </p>
    </div>

    <AppInput
      v-model="username"
      placeholder="Enter username"
    />

    <div class="password-field">
      <AppInput
        v-model="password"
        :type="
          showPassword
            ? 'text'
            : 'password'
        "
        inputmode="numeric"
        pattern="[0-9]*"
        autocomplete="current-password"
        placeholder="Enter PIN"
      />

      <button
        type="button"
        class="password-toggle"
        :aria-label="
          showPassword
            ? 'Hide PIN'
            : 'Show PIN'
        "
        @click="
          showPassword = !showPassword
        "
      >
        <EyeOff
          v-if="showPassword"
          :size="24"
        />

        <Eye
          v-else
          :size="24"
        />
      </button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <AppButton full>
      {{ mode === 'admin' ? 'Enter Admin' : 'Begin Quest' }}
    </AppButton>
  </form>
</template>

<style scoped>
.login-form {
  display: grid;
  gap: 16px;
}

.form-heading {
  text-align: center;
}

h2 {
  margin: 0;
  color: var(--gold);
  font-family: var(--font-heading);
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

p {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 14px;
}

.error {
  margin: 0;
  color: var(--error);
  font-size: 13px;
  font-weight: 700;
}

.password-field {
  position: relative;
}

.password-field :deep(input) {
  padding-right: 58px;
}

.password-toggle {
  position: absolute;
  top: 50%;
  right: 18px;
  display: grid;
  place-items: center;
  border: 0;
  background: transparent;
  color: var(--muted);
  transform: translateY(-50%);
  cursor: pointer;
}

.password-toggle:hover {
  color: var(--gold);
}
</style>