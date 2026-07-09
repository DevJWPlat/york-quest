<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="admin-shell">
    <header class="admin-header">
      <h1>Quest Control</h1>
    </header>

    <section class="admin-content">
      <slot />
    </section>

    <nav class="admin-nav">
        <RouterLink to="/admin">Dashboard</RouterLink>
        <RouterLink to="/admin/answers">Answers</RouterLink>
        <RouterLink to="/admin/leaderboard">Scores</RouterLink>
        <RouterLink to="/admin/players">Players</RouterLink>
    </nav>
  </main>
</template>

<style scoped>
.admin-shell {
  min-height: 100vh;
  padding: 22px 22px 90px;
  background: var(--bg);
}

.admin-header h1 {
  margin: 0 0 24px;
  color: var(--gold);
  font-family: var(--font-heading);
  font-size: 28px;
  text-align: center;
}

.admin-content {
  display: grid;
  gap: 18px;
}

.admin-nav {
  position: fixed;
  right: 16px;
  bottom: 16px;
  left: 16px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: rgba(15, 19, 26, 0.96);
}

.admin-nav a {
  color: var(--muted);
  font-size: 12px;
  text-align: center;
  text-decoration: none;
}

.admin-nav a.router-link-active {
  color: var(--gold-light);
}
</style>