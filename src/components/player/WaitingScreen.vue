<script setup>
import AppCard from '@/components/base/AppCard.vue'
import { Hourglass } from 'lucide-vue-next'
import { Beer } from 'lucide-vue-next'
import { Swords } from 'lucide-vue-next'



defineProps({
  nextRound: {
    type: Object,
    default: null,
  },
})
</script>

<template>
  <section class="waiting-screen">
    <div class="icon-wrap">
      <div class="icon-circle">
        <Hourglass :size="70" class="hourglass" />
      </div>
    </div>

    <div class="intro">
      <h1>Waiting for the next round...</h1>
      <p>The Emperor will start the next round soon.</p>
    </div>

    <div class="divider">
      <span />
    </div>

    <AppCard v-if="nextRound" class="next-card">
        <div class="next-card__content">
            <div>
            <small>Up Next</small>
            <h2>{{ nextRound.title }}</h2>
            <p>{{ nextRound.pubName }}</p>
            </div>

            <div class="beer-ring">
            <div class="beer-inner">
                <Beer :size="32" stroke-width="1.7" />
            </div>
            </div>
        </div>
    </AppCard>

    <AppCard class="quest-card">
      <small class="title-font">The Quest</small>
      <p>
        Answer 3 (or more) questions at each pub.
        The person with the highest score will win a free pint, 
        the person with the lowest has to down their pint!
      </p>
      <Swords
        :size="28"
        :stroke-width="2"
        class="quest-icon"
        />
    </AppCard>
  </section>
</template>

<style scoped>
.waiting-screen {
  display: grid;
  min-height: calc(100vh - 70px);
  align-content: center;
  gap: 26px;
  padding-bottom: 32px;
  text-align: center;
}

.title-font {
    font-size: 14px !important;
    font-weight: 500 !important;


}


.icon-wrap {
  display: flex;
  justify-content: center;
}

.icon-circle {
  display: grid;
  place-items: center;

  width: 150px;
  height: 150px;

  border-radius: 999px;
  border: 1px solid rgba(214, 179, 106, .35);

  background:
    radial-gradient(circle at top,
      rgba(214,179,106,.08),
      transparent 65%);

  animation: rotateCircle 8s linear infinite;
}

.hourglass {
  color: var(--gold);
  filter: drop-shadow(0 0 14px rgba(214,179,106,.25));

  /* Counter-rotate so the icon stays upright */
  animation: counterRotate 8s linear infinite;
}

@keyframes rotateCircle {
  from {
    transform: rotate(0deg);
    box-shadow:
      0 0 18px rgba(214,179,106,.12),
      0 0 40px rgba(214,179,106,.06);
  }

  50% {
    box-shadow:
      0 0 28px rgba(214,179,106,.22),
      0 0 55px rgba(214,179,106,.10);
  }

  to {
    transform: rotate(360deg);
    box-shadow:
      0 0 18px rgba(214,179,106,.12),
      0 0 40px rgba(214,179,106,.06);
  }
}

@keyframes counterRotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(-360deg);
  }
}

.intro h1 {
  max-width: 310px;
  margin: 0 auto;
  color: var(--gold-light);
  font-family: var(--font-heading);
  font-size: 28px;
  line-height: 1.15;
}

.intro p {
  max-width: 260px;
  margin: 14px auto 0;
  color: var(--cream);
  font-size: 14px;
}

.divider {
  display: flex;
  justify-content: center;
}

.divider span {
  width: 80px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
}

.next-card,
.quest-card {
  padding: 18px;
  text-align: left;
}

.next-card small,
.quest-card small {
  color: var(--gold);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

.next-card h2 {
  margin: 8px 0 2px;
  color: var(--cream);
  font-size: 22px;
}

.next-card p {
  margin: 0;
  color: var(--gold-light);
}

.next-card {
  padding: 24px;
  text-align: left;
}

.next-card__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
}

.beer-ring {
    display: grid;
    place-items: center;
    width: 80px;
    height: 80px;
    flex: 0 0 80px;
    border-radius: 50%;
    border: 2px solid rgba(42, 49, 61, 0.95);
    box-shadow: 0 0 0 3px rgba(42, 49, 61, 0.45);

}

.beer-inner {
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  border-radius: 50%;
  border: 1px solid var(--gold);
  color: var(--gold);
  background: rgba(214, 179, 106, 0.035);
}

.quest-card {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.quest-card p {
  margin: 10px 0 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}

.quest-icon {
    color: var(--gold);
    margin-top: 24px;
    filter: drop-shadow(0 0 10px rgba(214,179,106,.18));
}
</style>