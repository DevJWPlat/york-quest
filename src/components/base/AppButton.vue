<script setup>
defineProps({
  variant: {
    type: String,
    default: 'primary',
  },
  full: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <button
    class="app-button"
    :class="[`app-button--${variant}`, { 'app-button--full': full }]"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<style scoped>
.app-button {
  border: 0;
  border-radius: 10px;
  padding: 14px 18px;
  color: var(--cream);
  font-weight: 700;
  text-transform: uppercase;
  transition: 0.2s ease;
}

.app-button--full {
  width: 100%;
}

.app-button--primary {
  background: linear-gradient(180deg, #963638, var(--burgundy));
  box-shadow: 0 8px 20px rgba(123, 45, 47, 0.35);
}

.app-button--secondary {
  background: transparent;
  border: 1px solid var(--gold);
  color: var(--gold-light);
}

.app-button--dark {
  background: var(--card);
  border: 1px solid var(--border);
}

.app-button:hover {
  transform: translateY(-2px);
}

.app-button:active {
  transform: scale(0.98);
}

.app-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>