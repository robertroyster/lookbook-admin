<script setup lang="ts">
import { computed } from 'vue'
import type { MenuData } from '../../lib/api'

const props = defineProps<{
  menu: MenuData
}>()

const stats = computed(() => {
  const items = props.menu.items
  const categories = new Set(items.map(i => i.category))
  const withImages = items.filter(i => i.image).length
  const withPrices = items.filter(i => i.price).length

  return {
    totalItems: items.length,
    categories: categories.size,
    withImages,
    withPrices,
    imagePercent: items.length ? Math.round((withImages / items.length) * 100) : 0
  }
})
</script>

<template>
  <div class="stats-grid">
    <div class="stat card">
      <div class="stat-value">{{ stats.totalItems }}</div>
      <div class="stat-label text-muted text-sm">Total Items</div>
    </div>
    <div class="stat card">
      <div class="stat-value">{{ stats.categories }}</div>
      <div class="stat-label text-muted text-sm">Categories</div>
    </div>
    <div class="stat card">
      <div class="stat-value">{{ stats.withImages }}</div>
      <div class="stat-label text-muted text-sm">With Images</div>
    </div>
    <div class="stat card">
      <div class="stat-value">{{ stats.imagePercent }}%</div>
      <div class="stat-label text-muted text-sm">Image Coverage</div>
    </div>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.stat {
  text-align: center;
  padding: 1rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-primary);
}
</style>
