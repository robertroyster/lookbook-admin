<script setup lang="ts">
defineProps<{
  brand: string
  store: {
    slug: string
    name: string
    file: string
  }
}>()
</script>

<template>
  <router-link :to="`/brands/${brand}/${store.slug}`" class="store-card card">
    <div class="icon">🏪</div>
    <div class="info">
      <div class="name font-medium">{{ store.name }}</div>
      <div class="slug text-muted text-sm">{{ store.slug }}</div>
    </div>
    <div class="arrow text-muted">→</div>
  </router-link>
</template>

<style scoped>
.store-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: var(--color-text);
  transition: border-color 0.15s;
}

.store-card:hover {
  border-color: var(--color-primary);
  text-decoration: none;
}

.icon {
  font-size: 1.5rem;
}

.info {
  flex: 1;
  min-width: 0;
}

.name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.arrow {
  font-size: 1.25rem;
}
</style>
