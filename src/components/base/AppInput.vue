<script setup>
defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  label: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    default: 'text',
  },
  placeholder: {
    type: String,
    default: '',
  },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <label class="field">
    <span v-if="label">{{ label }}</span>

    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  </label>
</template>

<style scoped>
.field {
  display: grid;
  gap: 8px;
}

span {
  color: var(--gold-light);
  font-size: 12px;
  font-weight: 700;
}

input {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #121821;
  color: var(--cream);
  padding: 14px;
  outline: none;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.03),
    0 2px 12px rgba(0,0,0,.25);
}

input:focus {
  border-color: var(--gold);
  box-shadow: 0 0 0 3px rgba(214, 179, 106, 0.12);
}
</style>