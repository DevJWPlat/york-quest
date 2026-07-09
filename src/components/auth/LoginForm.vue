<script setup>
import { ref } from 'vue'

import AppButton from '@/components/base/AppButton.vue'
import AppInput from '@/components/base/AppInput.vue'




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

    <AppInput
      v-model="password"
      type="password"
      placeholder="Enter password"
    />

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
</style>