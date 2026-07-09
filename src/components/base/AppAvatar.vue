<script setup>
defineProps({
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    default: '',
  },
  size: {
    type: String,
    default: 'md',
  },
})

function initials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
</script>

<template>
  <div class="avatar" :class="`avatar--${size}`">
    <img v-if="image" :src="image" :alt="name" />
    <span v-else>{{ initials(name) }}</span>
  </div>
</template>

<style scoped>
.avatar {
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: var(--gold-light);
  color: #10141a;
  font-weight: 800;
  overflow: hidden;
  border: 1px solid var(--gold);
}

.avatar--sm {
  width: 34px;
  height: 34px;
  font-size: 12px;
}

.avatar--md {
  width: 44px;
  height: 44px;
  font-size: 14px;
}

.avatar--lg {
  width: 92px;
  height: 92px;
  font-size: 30px;
}

img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>