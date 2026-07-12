<script setup>
import AppButton from '@/components/base/AppButton.vue'

defineProps({
  show: Boolean,
  title: String,
  message: String,
  confirmLabel: {
    type: String,
    default: 'Confirm',
  },
})

defineEmits(['confirm', 'cancel'])
</script>

<template>
  <div v-if="show" class="modal-backdrop">
    <div class="modal">
      <h2>{{ title }}</h2>
      <p>{{ message }}</p>

      <div class="actions">
        <AppButton variant="dark" @click="$emit('cancel')">
          Cancel
        </AppButton>

        <AppButton @click="$emit('confirm')">
        {{ confirmLabel }}
      </AppButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.65);
}


.modal {
  width: 100%;
  max-width: 360px;
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--bg-soft);
  box-shadow: 0 20px 60px rgba(0,0,0,.45);
  text-align: center;
}

h2 {
  margin: 0;
  font-family: var(--font-heading);
  color: var(--gold-light);
}

p {
  margin: 12px 0 22px;
  color: var(--muted);
}

.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
</style>