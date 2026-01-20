<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../lib/auth'

const router = useRouter()
const { login } = useAuth()

const apiKey = ref('')
const brandSlug = ref('')
const error = ref('')
const loading = ref(false)

async function handleSubmit() {
  if (!apiKey.value.trim()) {
    error.value = 'API key is required'
    return
  }

  if (!brandSlug.value.trim()) {
    error.value = 'Brand slug is required'
    return
  }

  error.value = ''
  loading.value = true

  try {
    // Store the credentials
    const brand = brandSlug.value.trim()
    login(apiKey.value.trim(), brand)

    // Navigate to brands (home)
    router.push('/')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Login failed'
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card card">
      <h1 class="text-xl font-semibold mb-3">Lookbook Admin</h1>
      <p class="text-muted mb-3">Enter your API key to continue</p>

      <form @submit.prevent="handleSubmit" class="form">
        <div class="field">
          <label for="brand" class="label">Brand Slug</label>
          <input
            id="brand"
            v-model="brandSlug"
            type="text"
            class="input"
            placeholder="e.g., ruckus"
            autocomplete="off"
          />
        </div>

        <div class="field">
          <label for="apiKey" class="label">API Key</label>
          <input
            id="apiKey"
            v-model="apiKey"
            type="password"
            class="input"
            placeholder="lbk_..."
            autocomplete="off"
          />
        </div>

        <div v-if="error" class="error text-danger text-sm">
          {{ error }}
        </div>

        <button type="submit" class="btn btn-primary btn-full" :disabled="loading">
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.login-card {
  width: 100%;
  max-width: 400px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-muted);
}

.error {
  padding: 0.5rem;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 4px;
}

.btn-full {
  width: 100%;
  justify-content: center;
}
</style>
