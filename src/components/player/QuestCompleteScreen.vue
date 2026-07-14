<script setup>
import {
  Hourglass,
  Trophy,
} from 'lucide-vue-next'
</script>

<template>
  <section class="quest-complete-screen">
    <div class="trophy-circle">
      <Trophy
        :size="76"
        stroke-width="1.6"
      />
    </div>

    <div class="content">
      <small>Josh's York Quest</small>

      <h1>Quest Complete</h1>

      <p>
        Six pubs conquered. The Quest Master
        is preparing the final results.
      </p>
    </div>

    <div class="waiting-pill">
      <Hourglass
        :size="18"
        stroke-width="1.8"
      />

      <span>
        Waiting for the final reveal
      </span>
    </div>
  </section>
</template>

<style scoped>
.quest-complete-screen {
  display: grid;
  min-height: calc(100vh - 70px);
  align-content: center;
  justify-items: center;
  gap: 28px;
  padding: 30px 0 52px;
  text-align: center;
}

.trophy-circle {
  display: grid;
  width: 155px;
  height: 155px;
  place-items: center;
  border: 1px solid var(--gold);
  border-radius: 50%;
  color: var(--gold);
  box-shadow:
    0 0 30px
    rgba(214, 179, 106, 0.18);
}

.content {
  display: grid;
  justify-items: center;
  gap: 8px;
}

small {
  color: var(--gold);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: var(--gold-light);
  font-family: var(--font-heading);
  font-size: 36px;
  line-height: 1.1;
}

p {
  max-width: 320px;
  margin: 4px 0 0;
  color: var(--muted);
  line-height: 1.55;
}

.waiting-pill {
  display: flex;
  align-items: center;
  gap: 9px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-soft);
  color: var(--gold-light);
  padding: 11px 16px;
  font-size: 13px;
  font-weight: 700;
}

@media (max-width: 420px) {
  .quest-complete-screen {
    gap: 24px;
  }

  .trophy-circle {
    width: 128px;
    height: 128px;
  }

  h1 {
    font-size: 32px;
  }
}
</style>