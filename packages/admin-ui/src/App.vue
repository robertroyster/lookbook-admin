<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from './lib/auth'

const router = useRouter()
const { isAuthenticated, isAdmin, isSuperAdmin, logout, brandSlug } = useAuth()

const showNav = computed(() => isAuthenticated.value)
const brandLink = computed(() => {
  if (isAdmin.value) return '/brands'
  return brandSlug.value ? `/brands/${brandSlug.value}` : '/brands'
})
const brandLinkText = computed(() => isAdmin.value ? 'All Brands' : 'My Brand')
const badgeText = computed(() => {
  if (isSuperAdmin.value) return 'Super Admin'
  if (isAdmin.value) return 'Admin'
  return brandSlug.value
})
const badgeClass = computed(() => {
  if (isSuperAdmin.value) return 'badge-super'
  if (isAdmin.value) return 'badge-admin'
  return ''
})

function handleLogout() {
  logout()
  router.push('/login')
}
</script>

<template>
  <div class="app">
    <header v-if="showNav" class="header">
      <div class="header-content container">
        <div class="flex gap-2" style="align-items: center;">
          <router-link to="/" class="logo">Lookbook Admin</router-link>
          <span v-if="badgeText" class="badge" :class="badgeClass">{{ badgeText }}</span>
        </div>
        <nav class="nav">
          <router-link to="/">Dashboard</router-link>
          <router-link :to="brandLink">{{ brandLinkText }}</router-link>
          <router-link v-if="isSuperAdmin" to="/deploy" class="deploy-link">Deploy</router-link>
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

.badge-admin {
  background: var(--color-success);
}

.badge-super {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
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
