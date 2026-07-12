<script setup>
import { onMounted } from 'vue'
import PlayerShell from '@/components/layout/PlayerShell.vue'
import WaitingScreen from '@/components/player/WaitingScreen.vue'
import RoundIntroCard from '@/components/player/RoundIntroCard.vue'
import LiveQuestionCard from '@/components/player/LiveQuestionCard.vue'
import SubmittedScreen from '@/components/player/SubmittedScreen.vue'
import RoundCompleteScreen from '@/components/player/RoundCompleteScreen.vue'
import QuestCompleteScreen from '@/components/player/QuestCompleteScreen.vue'

import { useAuthStore } from '@/stores/authStore'
import { useGameStore } from '@/stores/gameStore'

const authStore = useAuthStore()
const gameStore = useGameStore()

function submitAnswer(answer) {
  gameStore.submitAnswer({
    userId: authStore.user.id,
    answer,
  })
}

onMounted(() => {
  gameStore.loadGameState()
})
</script>

<template>
  <PlayerShell>
    <WaitingScreen
      v-if="gameStore.gameState === 'waiting'"
      :next-round="gameStore.nextRound"
    />

    <RoundIntroCard
      v-else-if="gameStore.gameState === 'roundIntro'"
      :round="gameStore.currentRound"
      :questions-count="gameStore.currentRoundQuestions.length"
    />

    <LiveQuestionCard
      v-else-if="gameStore.gameState === 'question'"
      :question="gameStore.currentQuestion"
      :question-number="
        gameStore.currentRoundQuestions.findIndex(
          (question) => question.id === gameStore.currentQuestion.id,
        ) + 1
      "
      :total-questions="gameStore.currentRoundQuestions.length"
      @submit="submitAnswer"
    />

    <SubmittedScreen v-else-if="gameStore.gameState === 'submitted'" />
    <RoundCompleteScreen v-else-if="gameStore.gameState === 'roundComplete'" />
  
    <QuestCompleteScreen v-else-if="gameStore.gameState === 'questComplete'" />

    <div class="dev-controls">
      <button @click="gameStore.startRound(1)">Start Round</button>
      <button @click="gameStore.startNextQuestion()">Next Question</button>
      <button @click="gameStore.completeRound()">Complete Round</button>
    </div>
    
  </PlayerShell>


</template>

<style scoped>
.dev-controls {
  position: fixed;
  z-index: 99;
  right: 12px;
  bottom: 12px;
  display: flex;
  gap: 8px;
}

.dev-controls button {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card);
  color: var(--cream);
  padding: 8px;
  font-size: 12px;
}
</style>