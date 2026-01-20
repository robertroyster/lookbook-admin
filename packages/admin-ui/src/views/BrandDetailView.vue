<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getBrandRegistry, deployLocation, type BrandRegistry } from '../lib/api'
import { useAuth } from '../lib/auth'
import LoadingSpinner from '../components/shared/LoadingSpinner.vue'
import ErrorBanner from '../components/shared/ErrorBanner.vue'
import StoreCard from '../components/stores/StoreCard.vue'
import JsonViewer from '../components/shared/JsonViewer.vue'

const route = useRoute()
const brand = route.params.brand as string
const { isSuperAdmin } = useAuth()

const registry = ref<BrandRegistry | null>(null)
const loading = ref(true)
const error = ref('')
const showJson = ref(false)

// Add location form
const showAddLocation = ref(false)
const locationSlug = ref('')
const locationName = ref('')
const deploying = ref(false)
const deployError = ref('')
const deploySuccess = ref('')

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '').substring(0, 20)
}

function onLocationNameInput() {
  if (!locationSlug.value) {
    locationSlug.value = generateSlug(locationName.value)
  }
}

async function handleAddLocation() {
  if (!locationSlug.value.trim() || !locationName.value.trim()) {
    deployError.value = 'Location name and slug are required'
    return
  }

  deploying.value = true
  deployError.value = ''
  deploySuccess.value = ''

  try {
    const result = await deployLocation({
      brandSlug: brand,
      locationSlug: locationSlug.value.trim().toLowerCase(),
      locationName: locationName.value.trim()
    })

    if (result.success) {
      deploySuccess.value = `Location "${locationName.value}" created successfully!`

      // Refresh registry to show new location
      registry.value = await getBrandRegistry(brand)

      // Clear form
      locationSlug.value = ''
      locationName.value = ''
      showAddLocation.value = false
    }
  } catch (e) {
    deployError.value = e instanceof Error ? e.message : 'Failed to create location'
  } finally {
    deploying.value = false
  }
}

function cancelAddLocation() {
  showAddLocation.value = false
  locationSlug.value = ''
  locationName.value = ''
  deployError.value = ''
}

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
      <router-link to="/">Brands</router-link>
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
        <div class="flex gap-1">
          <button v-if="isSuperAdmin" @click="showAddLocation = true" class="btn btn-primary">
            + Add Location
          </button>
          <button @click="showJson = !showJson" class="btn btn-secondary">
            {{ showJson ? 'Hide' : 'Show' }} Registry JSON
          </button>
        </div>
      </div>

      <!-- Add Location Form -->
      <div v-if="showAddLocation" class="add-location-form card mb-3">
        <div class="form-header flex flex-between mb-2">
          <h3 class="font-medium">Add New Location</h3>
          <button @click="cancelAddLocation" class="close-btn">&times;</button>
        </div>

        <div class="field">
          <label class="label">Location Name *</label>
          <input
            v-model="locationName"
            @input="onLocationNameInput"
            type="text"
            class="input"
            placeholder="e.g., Mission Valley"
          />
        </div>

        <div class="field">
          <label class="label">Location Slug *</label>
          <input
            v-model="locationSlug"
            type="text"
            class="input"
            placeholder="e.g., missionvalley"
          />
          <span class="hint">URL-safe identifier (lowercase, no spaces)</span>
        </div>

        <div class="preview text-sm text-muted mb-2">
          URL: <code>/{{ brand }}/{{ locationSlug || 'location' }}</code>
        </div>

        <div v-if="deployError" class="alert alert-error mb-2">
          {{ deployError }}
        </div>

        <div class="form-actions">
          <button @click="cancelAddLocation" class="btn btn-secondary">Cancel</button>
          <button
            @click="handleAddLocation"
            class="btn btn-primary"
            :disabled="deploying || !locationName || !locationSlug"
          >
            {{ deploying ? 'Creating...' : 'Create Location' }}
          </button>
        </div>
      </div>

      <div v-if="deploySuccess" class="alert alert-success mb-3">
        {{ deploySuccess }}
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

.add-location-form {
  border-color: var(--color-primary);
  max-width: 500px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--color-text-muted);
  line-height: 1;
  padding: 0;
  cursor: pointer;
}

.close-btn:hover {
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

.preview code {
  background: var(--color-bg);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.8125rem;
}

.alert {
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
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

.form-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}
</style>
