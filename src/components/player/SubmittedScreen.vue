<script setup>
import { BadgeCheck } from 'lucide-vue-next'
</script>

<template>
  <section class="submitted-screen">
    <div class="success-circle">
      <BadgeCheck :size="78" stroke-width="1.6" />
    </div>

    <div>
      <h1>Answer Submitted</h1>
      <p>Your answer has been saved. Wait for the next question.</p>
    </div>
  </section>
</template>

<style scoped>
.submitted-screen {
  display: grid;
  min-height: calc(100vh - 70px);
  align-content: center;
  gap: 28px;
  text-align: center;
}

.success-circle {
  display: grid;
  place-items: center;
  width: 155px;
  height: 155px;
  margin: 0 auto;
  border: 1px solid var(--success);
  border-radius: 50%;
  color: var(--success);
  box-shadow: 0 0 30px rgba(79, 138, 91, 0.18);
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