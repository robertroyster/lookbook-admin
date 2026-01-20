<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getStoreConfig, type StoreConfig } from '../lib/api'
import LoadingSpinner from '../components/shared/LoadingSpinner.vue'
import ErrorBanner from '../components/shared/ErrorBanner.vue'
import JsonViewer from '../components/shared/JsonViewer.vue'

const route = useRoute()
const brand = route.params.brand as string
const store = route.params.store as string

const config = ref<StoreConfig | null>(null)
const loading = ref(true)
const error = ref('')
const showJson = ref(false)

onMounted(async () => {
  try {
    config.value = await getStoreConfig(brand, store)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load store'
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
      <router-link :to="`/brands/${brand}`">{{ brand }}</router-link>
      <span> / </span>
      <span>{{ store }}</span>
    </div>

    <LoadingSpinner v-if="loading" />
    <ErrorBanner v-else-if="error" :message="error" />

    <template v-else-if="config">
      <div class="header flex flex-between mb-3">
        <div>
          <h1 class="text-xl font-semibold">{{ config.name }}</h1>
          <p class="text-muted">{{ config.menus.length }} menus</p>
        </div>
        <button @click="showJson = !showJson" class="btn btn-secondary">
          {{ showJson ? 'Hide' : 'Show' }} Config JSON
        </button>
      </div>

      <JsonViewer v-if="showJson" :data="config" title="Store Config" class="mb-3" />

      <h2 class="font-medium mb-2">Menus</h2>
      <div class="menu-list">
        <router-link
          v-for="menu in config.menus"
          :key="menu.id"
          :to="`/brands/${brand}/${store}/${menu.id}`"
          class="menu-card card"
        >
          <div class="menu-icon">📄</div>
          <div class="menu-info">
            <div class="menu-name font-medium">{{ menu.label }}</div>
            <div class="menu-id text-muted text-sm">{{ menu.id }}</div>
          </div>
          <div class="menu-arrow text-muted">→</div>
        </router-link>
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

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.menu-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: var(--color-text);
  transition: border-color 0.15s;
}

.menu-card:hover {
  border-color: var(--color-primary);
  text-decoration: none;
}

.menu-icon {
  font-size: 1.5rem;
}

.menu-info {
  flex: 1;
  min-width: 0;
}

.menu-arrow {
  font-size: 1.25rem;
}
</style>
