<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getMenu, saveMenu, getVersions, type MenuData, type VersionManifest } from '../lib/api'
import LoadingSpinner from '../components/shared/LoadingSpinner.vue'
import ErrorBanner from '../components/shared/ErrorBanner.vue'
import JsonViewer from '../components/shared/JsonViewer.vue'
import MenuItemCard from '../components/menus/MenuItemCard.vue'
import MenuStats from '../components/menus/MenuStats.vue'
import VersionHistory from '../components/versions/VersionHistory.vue'
import MenuUpload from '../components/menus/MenuUpload.vue'

const route = useRoute()
const brand = route.params.brand as string
const store = route.params.store as string
const menu = route.params.menu as string

const menuData = ref<MenuData | null>(null)
const versions = ref<VersionManifest | null>(null)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const saveError = ref('')
const saveSuccess = ref('')
const showJson = ref(false)
const showVersions = ref(false)
const showUpload = ref(false)
const editingItem = ref<string | null>(null)

const categories = computed(() => {
  if (!menuData.value) return []
  const cats = new Map<string, typeof menuData.value.items>()

  for (const item of menuData.value.items) {
    const cat = item.category || 'Uncategorized'
    if (!cats.has(cat)) {
      cats.set(cat, [])
    }
    cats.get(cat)!.push(item)
  }

  // Sort by category order if available
  const order = menuData.value.meta?.categoryOrder || []
  const sortedCats = Array.from(cats.entries()).sort((a, b) => {
    const aIdx = order.indexOf(a[0])
    const bIdx = order.indexOf(b[0])
    if (aIdx === -1 && bIdx === -1) return a[0].localeCompare(b[0])
    if (aIdx === -1) return 1
    if (bIdx === -1) return -1
    return aIdx - bIdx
  })

  return sortedCats
})

async function loadData() {
  try {
    const [menuResult, versionsResult] = await Promise.all([
      getMenu(brand, store, menu),
      getVersions(brand, store, menu)
    ])
    menuData.value = menuResult
    versions.value = versionsResult
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load menu'
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  if (!menuData.value) return

  saving.value = true
  saveError.value = ''
  saveSuccess.value = ''

  try {
    const result = await saveMenu(brand, store, menu, menuData.value)
    saveSuccess.value = `Saved! Version: ${result.versionId}`

    // Refresh versions
    versions.value = await getVersions(brand, store, menu)

    setTimeout(() => {
      saveSuccess.value = ''
    }, 3000)
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'Failed to save'
  } finally {
    saving.value = false
  }
}

function handleItemUpdate(itemId: string, updates: Partial<MenuData['items'][0]>) {
  if (!menuData.value) return

  const idx = menuData.value.items.findIndex(i => i.id === itemId)
  if (idx === -1) return

  menuData.value.items[idx] = { ...menuData.value.items[idx], ...updates }
  editingItem.value = null
}

function handleUploadSuccess(data: MenuData) {
  menuData.value = data
  showUpload.value = false
  loadData() // Refresh versions
}

onMounted(loadData)
</script>

<template>
  <div class="container">
    <div class="breadcrumb text-muted text-sm mb-2">
      <router-link to="/brands">Brands</router-link>
      <span> / </span>
      <router-link :to="`/brands/${brand}`">{{ brand }}</router-link>
      <span> / </span>
      <router-link :to="`/brands/${brand}/${store}`">{{ store }}</router-link>
      <span> / </span>
      <span>{{ menu }}</span>
    </div>

    <LoadingSpinner v-if="loading" />
    <ErrorBanner v-else-if="error" :message="error" />

    <template v-else-if="menuData">
      <div class="header flex flex-between mb-3">
        <div>
          <h1 class="text-xl font-semibold">{{ menu }}</h1>
          <p class="text-muted">{{ menuData.items.length }} items</p>
        </div>
        <div class="actions flex gap-1">
          <button @click="showUpload = !showUpload" class="btn btn-secondary">
            Upload JSON
          </button>
          <button @click="showVersions = !showVersions" class="btn btn-secondary">
            History
          </button>
          <button @click="showJson = !showJson" class="btn btn-secondary">
            Raw JSON
          </button>
          <button @click="handleSave" class="btn btn-primary" :disabled="saving">
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>

      <div v-if="saveError" class="alert alert-error mb-2">
        {{ saveError }}
      </div>
      <div v-if="saveSuccess" class="alert alert-success mb-2">
        {{ saveSuccess }}
      </div>

      <MenuUpload
        v-if="showUpload"
        :brand="brand"
        :store="store"
        :menu="menu"
        @success="handleUploadSuccess"
        @close="showUpload = false"
        class="mb-3"
      />

      <VersionHistory
        v-if="showVersions && versions"
        :versions="versions"
        class="mb-3"
      />

      <MenuStats v-if="!showJson" :menu="menuData" class="mb-3" />

      <JsonViewer v-if="showJson" :data="menuData" title="Menu JSON" class="mb-3" />

      <template v-if="!showJson">
        <div v-for="[category, items] in categories" :key="category" class="category mb-3">
          <h2 class="category-title font-medium mb-2">{{ category }}</h2>
          <div class="items-grid grid grid-2">
            <MenuItemCard
              v-for="item in items"
              :key="item.id"
              :item="item"
              :brand="brand"
              :editing="editingItem === item.id"
              @edit="editingItem = item.id"
              @cancel="editingItem = null"
              @save="(updates) => handleItemUpdate(item.id, updates)"
            />
          </div>
        </div>
      </template>
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

.category-title {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
