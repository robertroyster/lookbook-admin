<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../lib/auth'
import { deployBrand } from '../lib/api'

const router = useRouter()
const { isSuperAdmin } = useAuth()

// Redirect if not super-admin
if (!isSuperAdmin.value) {
  router.push('/')
}

const brandSlug = ref('')
const brandName = ref('')
const locationSlug = ref('')
const locationName = ref('')
const logoFile = ref<File | null>(null)

const deploying = ref(false)
const error = ref('')
const success = ref('')

const isValid = computed(() => {
  return brandSlug.value.trim() &&
    brandName.value.trim() &&
    locationSlug.value.trim() &&
    locationName.value.trim()
})

// Auto-generate slug from name
function generateSlug(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .substring(0, 20)
}

function onBrandNameInput() {
  if (!brandSlug.value) {
    brandSlug.value = generateSlug(brandName.value)
  }
}

function onLocationNameInput() {
  if (!locationSlug.value) {
    locationSlug.value = generateSlug(locationName.value)
  }
}

function handleLogoSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file && file.type.startsWith('image/')) {
    logoFile.value = file
  }
}

async function handleDeploy() {
  if (!isValid.value) return

  deploying.value = true
  error.value = ''
  success.value = ''

  try {
    const result = await deployBrand({
      brandSlug: brandSlug.value.trim(),
      brandName: brandName.value.trim(),
      locationSlug: locationSlug.value.trim(),
      locationName: locationName.value.trim(),
      logoFile: logoFile.value
    })

    if (result.success) {
      success.value = `Brand "${brandName.value}" deployed successfully!`

      // Clear form
      brandSlug.value = ''
      brandName.value = ''
      locationSlug.value = ''
      locationName.value = ''
      logoFile.value = null
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Deployment failed'
  } finally {
    deploying.value = false
  }
}
</script>

<template>
  <div class="container">
    <div class="header mb-3">
      <h1 class="text-xl font-semibold">Deploy New Brand</h1>
      <p class="text-muted">Create a new brand with its first location on R2</p>
    </div>

    <div class="deploy-form card">
      <div class="section">
        <h2 class="section-title font-medium mb-2">Brand Details</h2>

        <div class="field">
          <label class="label">Brand Name *</label>
          <input
            v-model="brandName"
            @input="onBrandNameInput"
            type="text"
            class="input"
            placeholder="e.g., Crawford's"
          />
        </div>

        <div class="field">
          <label class="label">Brand Slug *</label>
          <input
            v-model="brandSlug"
            type="text"
            class="input"
            placeholder="e.g., crawfords"
          />
          <span class="hint">URL-safe identifier (lowercase, no spaces)</span>
        </div>

        <div class="field">
          <label class="label">Brand Logo (optional)</label>
          <input
            type="file"
            accept="image/*"
            class="file-input"
            @change="handleLogoSelect"
          />
          <span v-if="logoFile" class="hint">Selected: {{ logoFile.name }}</span>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title font-medium mb-2">First Location</h2>

        <div class="field">
          <label class="label">Location Name *</label>
          <input
            v-model="locationName"
            @input="onLocationNameInput"
            type="text"
            class="input"
            placeholder="e.g., Fenton"
          />
        </div>

        <div class="field">
          <label class="label">Location Slug *</label>
          <input
            v-model="locationSlug"
            type="text"
            class="input"
            placeholder="e.g., fenton"
          />
          <span class="hint">URL-safe identifier (lowercase, no spaces)</span>
        </div>
      </div>

      <div class="preview card">
        <h3 class="font-medium mb-1">Preview</h3>
        <div class="preview-content text-sm text-muted">
          <p>Brand URL: <code>/{{ brandSlug || 'brand' }}/{{ locationSlug || 'location' }}</code></p>
          <p>Files to create:</p>
          <ul>
            <li><code>/{{ brandSlug || 'brand' }}/registry.json</code></li>
            <li><code>/{{ brandSlug || 'brand' }}/{{ locationSlug || 'location' }}.json</code></li>
            <li><code>/{{ brandSlug || 'brand' }}/{{ locationSlug || 'location' }}__dinner.json</code></li>
            <li><code>/brands.json</code> (updated)</li>
          </ul>
        </div>
      </div>

      <div v-if="error" class="alert alert-error">
        {{ error }}
      </div>

      <div v-if="success" class="alert alert-success">
        {{ success }}
        <div class="mt-1">
          <router-link :to="`/brands/${brandSlug}`" class="btn btn-secondary btn-sm">
            View Brand
          </router-link>
        </div>
      </div>

      <div class="actions">
        <router-link to="/brands" class="btn btn-secondary">Cancel</router-link>
        <button
          @click="handleDeploy"
          class="btn btn-primary"
          :disabled="!isValid || deploying"
        >
          {{ deploying ? 'Deploying...' : 'Deploy Brand' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.deploy-form {
  max-width: 600px;
}

.section {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.section-title {
  color: var(--color-text);
}

.field {
  margin-bottom: 1rem;
}

.label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-muted);
  margin-bottom: 0.375rem;
}

.hint {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 0.25rem;
}

.file-input {
  display: block;
  width: 100%;
  padding: 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text);
}

.preview {
  background: var(--color-bg);
  padding: 1rem;
  margin-bottom: 1rem;
}

.preview-content code {
  background: var(--color-surface);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.8125rem;
}

.preview-content ul {
  margin: 0.5rem 0 0 1.25rem;
}

.preview-content li {
  margin-bottom: 0.25rem;
}

.alert {
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  margin-bottom: 1rem;
}

.alert-error {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-danger);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.alert-success {
  background: rgba(34, 197, 94, 0.1);
  color: var(--color-success);
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.mt-1 {
  margin-top: 0.5rem;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}
</style>
