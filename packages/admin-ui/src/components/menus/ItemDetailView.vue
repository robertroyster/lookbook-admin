<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { MenuItem } from '../../lib/api'
import PhotoCaptureModal from './PhotoCaptureModal.vue'

const props = defineProps<{
  item: MenuItem
  brand: string
}>()

const emit = defineEmits<{
  close: []
  save: [updates: Partial<MenuItem>]
  imageUpdate: [filename: string]
}>()

const R2_BASE = 'https://pub-ed2976f5bd484b6580754e1d1fef1856.r2.dev'

const showCapture = ref(false)

// Strip $ prefix from price for editing
function stripDollar(price: string | number | undefined): string {
  if (!price) return ''
  return String(price).replace(/^\$/, '')
}

// Edit state - initialize from props
const editName = ref(props.item.name)
const editPrice = ref(stripDollar(props.item.price))
const editDescription = ref(props.item.description || '')
const localImageFilename = ref<string | null>(null)

// Reset form when item changes
watch(() => props.item, (newItem) => {
  editName.value = newItem.name
  editPrice.value = stripDollar(newItem.price)
  editDescription.value = newItem.description || ''
  localImageFilename.value = null
}, { immediate: true })

// Compute image URL with local override support
const imageUrl = computed(() => {
  const filename = localImageFilename.value
    || props.item.gif
    || props.item.storeImage
    || props.item.image
    || props.item.expectedImage

  if (!filename) return null
  return `${R2_BASE}/${props.brand}/images/${filename}`
})

function openPhotoCapture() {
  showCapture.value = true
}

function onPhotoUploaded(filename: string) {
  localImageFilename.value = filename
  showCapture.value = false
  // Emit image update immediately so parent can track it
  emit('imageUpdate', filename)
}

function handleSave() {
  const updates: Partial<MenuItem> = {
    name: editName.value,
    price: editPrice.value,
    description: editDescription.value || undefined
  }

  // Include image if it was changed
  if (localImageFilename.value) {
    updates.image = localImageFilename.value
  }

  emit('save', updates)
}

function handleClose() {
  emit('close')
}

// Close on escape key
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && !showCapture.value) {
    handleClose()
  }
}
</script>

<template>
  <div class="item-detail-overlay" @keydown="handleKeydown" tabindex="-1">
    <div class="item-detail">
      <button class="close-btn" @click="handleClose" aria-label="Close">
        &#10005;
      </button>

      <div class="image-area" @click="openPhotoCapture">
        <img
          v-if="imageUrl"
          :src="imageUrl"
          :alt="item.name"
          class="detail-image"
          @error="($event.target as HTMLImageElement).style.display = 'none'"
        />
        <div v-else class="no-image">No Image</div>
        <div class="camera-badge">
          <span class="camera-icon">&#128247;</span>
          Tap to capture
        </div>
      </div>

      <div class="item-info">
        <div class="field">
          <label class="label">Name</label>
          <input v-model="editName" class="input name-input" />
        </div>

        <div class="field">
          <label class="label">Price</label>
          <div class="price-input-wrapper">
            <span class="price-prefix">$</span>
            <input v-model="editPrice" class="input price-input" placeholder="0.00" />
          </div>
        </div>

        <div class="field">
          <label class="label">Description</label>
          <textarea
            v-model="editDescription"
            class="input desc-input"
            rows="3"
            placeholder="Optional description..."
          ></textarea>
        </div>

        <div class="category-badge">
          {{ item.category }}
        </div>
      </div>

      <div class="actions">
        <button @click="handleClose" class="btn btn-secondary">
          Cancel
        </button>
        <button @click="handleSave" class="btn btn-primary">
          Apply Changes
        </button>
      </div>
    </div>

    <PhotoCaptureModal
      v-if="showCapture"
      :item="item"
      :brand="brand"
      @close="showCapture = false"
      @uploaded="onPhotoUploaded"
    />
  </div>
</template>

<style scoped>
.item-detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--color-bg);
  overflow-y: auto;
  display: flex;
  justify-content: center;
  padding: 1rem;
}

.item-detail {
  width: 100%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-bottom: 2rem;
}

.close-btn {
  position: fixed;
  top: 1rem;
  right: 1rem;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 50%;
  color: var(--color-text);
  font-size: 1.25rem;
  cursor: pointer;
  z-index: 10;
}

.close-btn:hover {
  background: var(--color-border);
}

.image-area {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  background: var(--color-surface);
  border-radius: var(--radius);
  overflow: hidden;
  cursor: pointer;
}

.image-area:active {
  opacity: 0.9;
}

.detail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-image {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-size: 1.125rem;
}

.camera-badge {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  border-radius: 999px;
  color: white;
  font-size: 0.875rem;
}

.camera-icon {
  font-size: 1.25rem;
}

.item-info {
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
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.name-input {
  font-size: 1.125rem;
  font-weight: 500;
}

.price-input-wrapper {
  display: flex;
  align-items: center;
}

.price-prefix {
  padding: 0.625rem;
  background: var(--color-border);
  border: 1px solid var(--color-border);
  border-right: none;
  border-radius: var(--radius) 0 0 var(--radius);
  color: var(--color-text-muted);
}

.price-input {
  border-radius: 0 var(--radius) var(--radius) 0;
  font-weight: 600;
  color: var(--color-primary);
}

.desc-input {
  resize: vertical;
  min-height: 80px;
}

.category-badge {
  display: inline-flex;
  align-self: flex-start;
  padding: 0.25rem 0.75rem;
  background: var(--color-border);
  border-radius: 999px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
}

/* Mobile optimizations */
@media (max-width: 480px) {
  .item-detail-overlay {
    padding: 0;
  }

  .item-detail {
    max-width: none;
    padding: 1rem;
  }

  .close-btn {
    top: 0.5rem;
    right: 0.5rem;
  }

  .actions {
    position: sticky;
    bottom: 0;
    background: var(--color-bg);
    margin: 0 -1rem -2rem;
    padding: 1rem;
    border-top: 1px solid var(--color-border);
  }

  .actions .btn {
    flex: 1;
  }
}
</style>
