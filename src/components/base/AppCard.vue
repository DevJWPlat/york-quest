<template>
    <section class="app-card">
      <slot />
    </section>
  </template>
  
  <style scoped>
  .app-card {
    background: linear-gradient(180deg, rgba(255,255,255,0.025), transparent), var(--bg-soft);
    border: 1px solid var(--border);
    border-radius: 18px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
  }
  </style>