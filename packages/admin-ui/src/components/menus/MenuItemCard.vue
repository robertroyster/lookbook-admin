<script setup lang="ts">
import { ref, watch } from 'vue'
import type { MenuItem } from '../../lib/api'

const props = defineProps<{
  item: MenuItem
  brand: string
  editing: boolean
}>()

const emit = defineEmits<{
  edit: []
  cancel: []
  save: [updates: Partial<MenuItem>]
  select: [item: MenuItem]
}>()

const R2_BASE = 'https://pub-ed2976f5bd484b6580754e1d1fef1856.r2.dev'

// Strip $ prefix from price for editing
function stripDollar(price: string | number | undefined): string {
  if (!price) return ''
  return String(price).replace(/^\$/, '')
}

// Format price for display - always show $ prefix
function formatPrice(price: string | number | undefined): string {
  if (!price) return ''
  const stripped = String(price).replace(/^\$/, '')
  return `$${stripped}`
}

const editName = ref(props.item.name)
const editPrice = ref(stripDollar(props.item.price))
const editDescription = ref(props.item.description || '')

watch(() => props.editing, (isEditing) => {
  if (isEditing) {
    editName.value = props.item.name
    editPrice.value = stripDollar(props.item.price)
    editDescription.value = props.item.description || ''
  }
})

function handleSave() {
  emit('save', {
    name: editName.value,
    price: editPrice.value,
    description: editDescription.value || undefined
  })
}

function getImageUrl(item: MenuItem): string | null {
  // Fallback chain: gif -> storeImage -> image -> expectedImage
  const filename = item.gif || item.storeImage || item.image || item.expectedImage
  if (!filename) return null
  return `${R2_BASE}/${props.brand}/images/${filename}`
}
</script>

<template>
  <div
    class="item-card card"
    :class="{ editing, clickable: !editing }"
    @click="!editing && emit('select', item)"
  >
    <div class="image-wrapper">
      <img
        v-if="getImageUrl(item)"
        :src="getImageUrl(item)!"
        :alt="item.name"
        class="image"
        @error="($event.target as HTMLImageElement).style.display = 'none'"
      />
      <div v-else class="image-placeholder">No Image</div>
    </div>

    <div class="content">
      <template v-if="!editing">
        <div class="name font-medium">{{ item.name }}</div>
        <div v-if="item.price" class="price text-primary">{{ formatPrice(item.price) }}</div>
        <div v-if="item.description" class="description text-muted text-sm">
          {{ item.description }}
        </div>
        <div class="item-id text-muted text-sm">ID: {{ item.id }}</div>
        <button @click.stop="emit('edit')" class="btn btn-secondary btn-sm edit-btn">
          Edit
        </button>
      </template>

      <template v-else>
        <div class="edit-form">
          <div class="field">
            <label class="label">Name</label>
            <input v-model="editName" class="input" />
          </div>
          <div class="field">
            <label class="label">Price</label>
            <input v-model="editPrice" class="input" placeholder="14.99" />
          </div>
          <div class="field">
            <label class="label">Description</label>
            <textarea v-model="editDescription" class="input" rows="2"></textarea>
          </div>
          <div class="edit-actions">
            <button @click="emit('cancel')" class="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button @click="handleSave" class="btn btn-primary btn-sm">
              Apply
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.item-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
}

.item-card.editing {
  border-color: var(--color-primary);
}

.item-card.clickable {
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
}

.item-card.clickable:hover {
  border-color: var(--color-text-muted);
}

.item-card.clickable:active {
  background: var(--color-bg);
}

.image-wrapper {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
}

.image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  border-radius: 8px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.content {
  flex: 1;
  min-width: 0;
  position: relative;
}

.name {
  margin-bottom: 0.25rem;
}

.price {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.description {
  margin-bottom: 0.25rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-id {
  font-family: monospace;
  font-size: 0.6875rem;
}

.edit-btn {
  position: absolute;
  top: 0;
  right: 0;
  opacity: 0;
  transition: opacity 0.15s;
}

.item-card:hover .edit-btn {
  opacity: 1;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.edit-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

.text-primary {
  color: var(--color-primary);
}
</style>
