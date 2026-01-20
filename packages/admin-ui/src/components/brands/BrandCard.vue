<script setup lang="ts">
import type { Brand } from '../../lib/api'

defineProps<{
  brand: Brand
}>()

const R2_BASE = 'https://pub-ed2976f5bd484b6580754e1d1fef1856.r2.dev'
</script>

<template>
  <router-link :to="`/brands/${brand.slug}`" class="brand-card card">
    <div class="logo-wrapper">
      <img
        v-if="brand.logo"
        :src="`${R2_BASE}/${brand.logo}`"
        :alt="brand.name"
        class="logo"
        @error="($event.target as HTMLImageElement).style.display = 'none'"
      />
      <div v-else class="logo-placeholder">
        {{ brand.name.charAt(0) }}
      </div>
    </div>
    <div class="info">
      <div class="name font-medium">{{ brand.name }}</div>
      <div class="slug text-muted text-sm">{{ brand.slug }}</div>
    </div>
  </router-link>
</template>

<style scoped>
.brand-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: var(--color-text);
  transition: border-color 0.15s;
}

.brand-card:hover {
  border-color: var(--color-primary);
  text-decoration: none;
}

.logo-wrapper {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}

.logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 8px;
}

.logo-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);
  color: white;
  font-weight: 600;
  font-size: 1.25rem;
  border-radius: 8px;
}

.info {
  min-width: 0;
}

.name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
