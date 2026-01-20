<script setup lang="ts">
defineProps<{
  message: string
}>()
</script>

<template>
  <div class="error-banner">
    <span class="icon">⚠️</span>
    <span>{{ message }}</span>
  </div>
</template>

<style scoped>
.error-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius);
  color: var(--color-danger);
}

.icon {
  font-size: 1.25rem;
}
</style>
