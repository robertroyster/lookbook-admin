<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from './lib/auth'

const router = useRouter()
const route = useRoute()
const { isAuthenticated, logout } = useAuth()

const showNav = computed(() => isAuthenticated.value)

// Track the active brand - persists when navigating away
const ACTIVE_BRAND_KEY = 'lookbook_active_brand'
const activeBrand = ref<string | null>(localStorage.getItem(ACTIVE_BRAND_KEY))

// Update active brand when URL brand changes
watch(
  () => route.params.brand as string | undefined,
  (brand) => {
    if (brand) {
      activeBrand.value = brand
      localStorage.setItem(ACTIVE_BRAND_KEY, brand)
    }
  },
  { immediate: true }
)

function handleLogout() {
  logout()
  activeBrand.value = null
  localStorage.removeItem(ACTIVE_BRAND_KEY)
  router.push('/login')
}
</script>

<template>
  <div class="app">
    <header v-if="showNav" class="header">
      <div class="header-content container">
        <div class="flex gap-2" style="align-items: center;">
          <router-link to="/" class="logo">Lookbook Admin</router-link>
          <span v-if="activeBrand" class="badge">{{ activeBrand }}</span>
        </div>
        <nav class="nav">
          <router-link to="/">Dashboard</router-link>
          <router-link to="/brands">Brands</router-link>
          <button @click="handleLogout" class="btn btn-secondary btn-sm">Logout</button>
        </nav>
      </div>
    </header>
    <main>
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
}

.header {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  padding-bottom: 1rem;
}

.logo {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
}

.logo:hover {
  text-decoration: none;
}

.badge {
  background: var(--color-primary);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.nav {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.nav a {
  color: var(--color-text-muted);
}

.nav a:hover,
.nav a.router-link-active {
  color: var(--color-text);
  text-decoration: none;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}
</style>
