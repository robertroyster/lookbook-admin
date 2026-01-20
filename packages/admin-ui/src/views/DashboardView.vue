<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getBrands, getBrandRegistry, type Brand, type BrandRegistry } from '../lib/api'
import { useAuth } from '../lib/auth'
import LoadingSpinner from '../components/shared/LoadingSpinner.vue'
import ErrorBanner from '../components/shared/ErrorBanner.vue'

const { brandSlug } = useAuth()

const brands = ref<Brand[]>([])
const registry = ref<BrandRegistry | null>(null)
const loading = ref(true)
const error = ref('')

const totalStores = computed(() => {
  if (registry.value) {
    return registry.value.stores.length
  }
  return 0
})

onMounted(async () => {
  try {
    // Fetch all brands for context
    const brandsData = await getBrands()
    brands.value = brandsData.brands

    // Fetch registry for the authenticated brand
    if (brandSlug.value) {
      registry.value = await getBrandRegistry(brandSlug.value)
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load data'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="container">
    <h1 class="text-xl font-semibold mb-3">Dashboard</h1>

    <LoadingSpinner v-if="loading" />
    <ErrorBanner v-else-if="error" :message="error" />

    <template v-else>
      <div class="stats grid grid-3 mb-3">
        <div class="stat card">
          <div class="stat-value">{{ brands.length }}</div>
          <div class="stat-label text-muted">Total Brands</div>
        </div>
        <div class="stat card">
          <div class="stat-value">{{ totalStores }}</div>
          <div class="stat-label text-muted">Your Stores</div>
        </div>
        <div class="stat card">
          <div class="stat-value">{{ brandSlug }}</div>
          <div class="stat-label text-muted">Current Brand</div>
        </div>
      </div>

      <div class="quick-links card">
        <h2 class="font-medium mb-2">Quick Actions</h2>
        <div class="links">
          <router-link :to="`/brands/${brandSlug}`" class="link-card">
            <span class="link-icon">📋</span>
            <span>View Your Stores</span>
          </router-link>
          <router-link to="/brands" class="link-card">
            <span class="link-icon">🏪</span>
            <span>Browse All Brands</span>
          </router-link>
        </div>
      </div>

      <div v-if="registry" class="stores-preview card" style="margin-top: 1rem;">
        <h2 class="font-medium mb-2">Your Stores</h2>
        <div class="store-list">
          <router-link
            v-for="store in registry.stores"
            :key="store.slug"
            :to="`/brands/${brandSlug}/${store.slug}`"
            class="store-item"
          >
            <span class="store-name">{{ store.name }}</span>
            <span class="text-muted text-sm">{{ store.slug }}</span>
          </router-link>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.stat {
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: 600;
  color: var(--color-primary);
}

.stat-label {
  font-size: 0.875rem;
}

.links {
  display: flex;
  gap: 1rem;
}

.link-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--color-bg);
  border-radius: var(--radius);
  color: var(--color-text);
  flex: 1;
}

.link-card:hover {
  background: var(--color-border);
  text-decoration: none;
}

.link-icon {
  font-size: 1.5rem;
}

.store-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.store-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--color-bg);
  border-radius: var(--radius);
  color: var(--color-text);
}

.store-item:hover {
  background: var(--color-border);
  text-decoration: none;
}
</style>
