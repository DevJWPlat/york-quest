<script setup>
import {
  nextTick,
  onMounted,
  ref,
} from 'vue'

import { CircleCheck } from 'lucide-vue-next'
import confetti from 'canvas-confetti'

const confettiCanvas = ref(null)

onMounted(async () => {
  await nextTick()

  const fireConfetti = confetti.create(
    confettiCanvas.value,
    {
      resize: true,
      useWorker: true,
    },
  )

  fireConfetti({
    particleCount: 90,
    spread: 75,
    startVelocity: 30,

    origin: {
      x: 0.5,
      y: 0.36,
    },

    colors: [
      '#d6b36a',
      '#f1d28d',
      '#ffe0a0',
      '#b88b3f',
    ],

    scalar: 0.9,
    gravity: 0.9,
    ticks: 180,
  })
})
</script>

<template>
  <section class="complete-screen">
    <canvas
      ref="confettiCanvas"
      class="confetti-canvas"
    />

    <div class="complete-circle">
      <CircleCheck
        :size="78"
        stroke-width="1.6"
      />
    </div>

    <div>
      <h1>Round Complete</h1>

      <p>
        Grab a drink and wait for the next
        round.
      </p>
    </div>
  </section>
</template>

<style scoped>
.complete-screen {
  position: relative;
  isolation: isolate;

  display: grid;
  min-height: calc(100vh - 70px);
  align-content: center;
  gap: 28px;
  text-align: center;
}

.confetti-canvas {
  position: fixed;
  z-index: 1;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.complete-circle {
  position: relative;
  z-index: 2;

  display: grid;
  place-items: center;
  width: 155px;
  height: 155px;
  margin: 0 auto;
  border: 1px solid var(--gold);
  border-radius: 50%;
  background: var(--bg);
  color: var(--gold);
  box-shadow:
    0 0 30px
    rgba(214, 179, 106, 0.18);
}

h1 {
  margin: 0;
  color: var(--gold-light);
  font-family: var(--font-heading);
  font-size: 34px;
}

p {
  max-width: 280px;
  margin: 14px auto 0;
  color: var(--muted);
  line-height: 1.5;
}
</style>