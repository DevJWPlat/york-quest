<script setup>
import { Shield } from 'lucide-vue-next'
import AppCard from '@/components/base/AppCard.vue'

defineProps({
  round: {
    type: Object,
    required: true,
  },
  questionsCount: {
    type: Number,
    default: 0,
  },
})
</script>

<template>
  <section class="round-intro">
    <div class="icon-circle">
      <Shield :size="72" stroke-width="1.6" />
    </div>

    <div class="intro">
      <small>Round Unlocked</small>
      <h1>{{ round.title }}</h1>
      <p>{{ round.pubName }}</p>
    </div>

    <AppCard class="info-card">
      <p>{{ questionsCount }} questions await.</p>
      <span>Wait for the first question to begin.</span>
    </AppCard>
  </section>
</template>

<style scoped>
.round-intro {
  display: grid;
  min-height: calc(100vh - 70px);
  align-content: center;
  gap: 28px;
  text-align: center;
}

.icon-circle {
  display: grid;
  place-items: center;
  width: 150px;
  height: 150px;
  margin: 0 auto;
  border: 1px solid var(--gold);
  border-radius: 50%;
  color: var(--gold);
  box-shadow: 0 0 30px rgba(214, 179, 106, 0.14);
}

small {
  color: var(--gold);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

h1 {
  margin: 12px 0 6px;
  font-family: var(--font-heading);
  font-size: 42px;
}

.intro p {
  margin: 0;
  color: var(--gold-light);
  font-size: 24px;
}

.info-card {
  padding: 20px;
}

.info-card p {
  margin: 0 0 8px;
  font-weight: 800;
}

.info-card span {
  color: var(--muted);
}
</style>