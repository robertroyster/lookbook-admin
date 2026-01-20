<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getBrandRegistry, type BrandRegistry } from '../lib/api'
import LoadingSpinner from '../components/shared/LoadingSpinner.vue'
import ErrorBanner from '../components/shared/ErrorBanner.vue'
import StoreCard from '../components/stores/StoreCard.vue'
import JsonViewer from '../components/shared/JsonViewer.vue'

const route = useRoute()
const brand = route.params.brand as string

const registry = ref<BrandRegistry | null>(null)
const loading = ref(true)
const error = ref('')
const showJson = ref(false)

onMounted(async () => {
  try {
    registry.value = await getBrandRegistry(brand)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load brand'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="container">
    <div class="breadcrumb text-muted text-sm mb-2">
      <router-link to="/brands">Brands</router-link>
      <span> / </span>
      <span>{{ brand }}</span>
    </div>

    <LoadingSpinner v-if="loading" />
    <ErrorBanner v-else-if="error" :message="error" />

    <template v-else-if="registry">
      <div class="header flex flex-between mb-3">
        <div>
          <h1 class="text-xl font-semibold">{{ registry.brand.name }}</h1>
          <p class="text-muted">{{ registry.stores.length }} stores</p>
        </div>
        <button @click="showJson = !showJson" class="btn btn-secondary">
          {{ showJson ? 'Hide' : 'Show' }} Registry JSON
        </button>
      </div>

      <JsonViewer v-if="showJson" :data="registry" title="Registry" class="mb-3" />

      <h2 class="font-medium mb-2">Stores</h2>
      <div class="grid grid-2">
        <StoreCard
          v-for="store in registry.stores"
          :key="store.slug"
          :brand="brand"
          :store="store"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.breadcrumb a {
  color: var(--color-text-muted);
}

.breadcrumb a:hover {
  color: var(--color-primary);
}
</style>
