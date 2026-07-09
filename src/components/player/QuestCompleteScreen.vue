<script setup>
import { Trophy } from 'lucide-vue-next'
</script>

<template>
  <section class="quest-complete-screen">
    <div class="trophy-circle">
      <Trophy :size="78" stroke-width="1.6" />
    </div>

    <div>
      <h1>Quest Complete</h1>
      <p>The final results are with the Quest Master.</p>
    </div>
  </section>
</template>

<style scoped>
.quest-complete-screen {
  display: grid;
  min-height: calc(100vh - 70px);
  align-content: center;
  gap: 28px;
  text-align: center;
}

.trophy-circle {
  display: grid;
  place-items: center;
  width: 155px;
  height: 155px;
  margin: 0 auto;
  border: 1px solid var(--gold);
  border-radius: 50%;
  color: var(--gold);
  box-shadow: 0 0 30px rgba(214, 179, 106, 0.18);
}

h1 {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 34px;
  color: var(--gold-light);
}

p {
  max-width: 280px;
  margin: 14px auto 0;
  color: var(--muted);
  line-height: 1.5;
}
</style>