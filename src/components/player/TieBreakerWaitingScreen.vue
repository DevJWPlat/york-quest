<script setup>
import {
  Hourglass,
  Scale,
} from 'lucide-vue-next'

defineProps({
  isParticipant: {
    type: Boolean,
    default: false,
  },

  hasSubmitted: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <section class="waiting-screen">
    <div class="waiting-icons">
      <div class="icon-circle icon-circle-back">
        <Scale
          :size="44"
          stroke-width="1.5"
        />
      </div>

      <div class="icon-circle icon-circle-front">
        <Hourglass
          :size="48"
          stroke-width="1.6"
        />
      </div>
    </div>

    <div>
      <small>Round Tie-Breaker</small>

      <h1>
        {{
          isParticipant && hasSubmitted
            ? 'Answer Submitted'
            : 'Tie-Breaker In Progress'
        }}
      </h1>

      <p>
        {{
          isParticipant && hasSubmitted
            ? 'The Quest Master is deciding the official round winner.'
            : 'A few players are battling for the round win. Sit tight.'
        }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.waiting-screen {
  display: grid;
  min-height: calc(100vh - 70px);
  align-content: center;
  gap: 30px;
  padding: 24px 0 42px;
  text-align: center;
}

.waiting-icons {
  position: relative;
  width: 170px;
  height: 150px;
  margin: 0 auto;
}

.icon-circle {
  position: absolute;
  display: grid;
  place-items: center;
  border: 1px solid var(--gold);
  border-radius: 50%;
  color: var(--gold);
  background: var(--bg);
  box-shadow:
    0 0 28px
    rgba(214, 179, 106, 0.15);
}

.icon-circle-back {
  top: 0;
  left: 0;
  width: 104px;
  height: 104px;
  opacity: 0.65;
}

.icon-circle-front {
  right: 0;
  bottom: 0;
  width: 118px;
  height: 118px;
}

small {
  color: var(--gold);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

h1 {
  margin: 10px 0 0;
  color: var(--gold-light);
  font-family: var(--font-heading);
  font-size: 34px;
  line-height: 1.15;
}

p {
  max-width: 300px;
  margin: 14px auto 0;
  color: var(--muted);
  line-height: 1.55;
}
</style>