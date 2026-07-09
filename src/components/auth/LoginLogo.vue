<script setup>
import logo from '@/assets/logo.png'

defineProps({
  mode: {
    type: String,
    default: 'player',
  },
})
</script>

<template>
  <button class="logo-button" type="button" aria-label="Switch login mode">
    <img :src="logo" alt="York Quest Logo" class="logo-image">

    <small v-if="mode === 'admin'">
      Tap logo to return to player login
    </small>
    <small v-if="mode === 'player'">
        A historic pub crawl quiz adventure
    </small>
  </button>
</template>

<style scoped>
.logo-button {
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    position: relative;
    display: flex;
    justify-content: center;
}

.logo-button:hover .logo-image {
  transform: scale(1.02);
  filter: drop-shadow(0 0 30px rgba(214, 179, 106, 0.18));
}

.logo-mark {
  margin: 0 auto;
  max-width: 260px;
  padding: 24px 18px;
  border: 1px solid rgba(214, 179, 106, 0.45);
  border-radius: 24px;
  background:
    radial-gradient(circle at top, rgba(242, 215, 154, 0.14), transparent 55%),
    rgba(23, 28, 36, 0.9);
  box-shadow:
    0 0 26px rgba(214, 179, 106, 0.12),
    0 12px 36px rgba(0, 0, 0, 0.35);
}

p {
  margin: 0 0 4px;
  color: var(--gold-light);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.24em;
}

h1 {
  margin: 0;
  color: var(--cream);
  font-family: Georgia, "Times New Roman", serif;
  font-size: 30px;
  line-height: 1;
  letter-spacing: 0.06em;
}

span {
  display: inline-block;
  margin-top: 8px;
  color: var(--gold);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.18em;
}

small {
  display: block;
  color: var(--muted);
  font-size: 12px;
  position: absolute;
  bottom: 0;
}

.logo-image {
  display: block;
  width: 100%;
  max-width: 240px;
  margin: 0 auto;
  filter: drop-shadow(0 0 25px rgba(214, 179, 106, 0.12));
  transition: var(--transition);
}

.logo-image:hover {
  transform: scale(1.02);
}
</style>