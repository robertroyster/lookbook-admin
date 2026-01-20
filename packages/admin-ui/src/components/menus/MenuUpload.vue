<script setup lang="ts">
import { ref } from 'vue'
import { uploadMenu, type MenuData, type MenuItem } from '../../lib/api'

const props = defineProps<{
  brand: string
  store: string
  menu: string
}>()

const emit = defineEmits<{
  success: [data: MenuData]
  close: []
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const jsonText = ref('')
const uploading = ref(false)
const error = ref('')
const validationErrors = ref<string[]>([])
const dragOver = ref(false)

function validateMenuItem(item: unknown, index: number): string[] {
  const errors: string[] = []
  const prefix = `Item ${index + 1}`

  if (typeof item !== 'object' || item === null) {
    return [`${prefix}: must be an object`]
  }

  const obj = item as Record<string, unknown>

  // Required fields
  if (!obj.id || typeof obj.id !== 'string') {
    errors.push(`${prefix}: missing or invalid "id" (must be string)`)
  }
  if (!obj.name || typeof obj.name !== 'string') {
    errors.push(`${prefix}: missing or invalid "name" (must be string)`)
  }
  if (!obj.category || typeof obj.category !== 'string') {
    errors.push(`${prefix}: missing or invalid "category" (must be string)`)
  }

  // Optional fields with type checks
  if (obj.price !== undefined && typeof obj.price !== 'number' && typeof obj.price !== 'string') {
    errors.push(`${prefix}: "price" must be number or string`)
  }
  if (obj.description !== undefined && typeof obj.description !== 'string') {
    errors.push(`${prefix}: "description" must be string`)
  }
  if (obj.image !== undefined && typeof obj.image !== 'string') {
    errors.push(`${prefix}: "image" must be string`)
  }

  return errors
}

function validateMenuData(data: unknown): { valid: boolean; errors: string[]; data?: MenuData } {
  const errors: string[] = []

  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['JSON must be an object'] }
  }

  const obj = data as Record<string, unknown>

  // Check items array
  if (!Array.isArray(obj.items)) {
    return { valid: false, errors: ['Missing "items" array'] }
  }

  if (obj.items.length === 0) {
    errors.push('Warning: "items" array is empty')
  }

  // Validate each item
  const itemErrors: string[] = []
  const seenIds = new Set<string>()

  for (let i = 0; i < obj.items.length; i++) {
    const item = obj.items[i]
    itemErrors.push(...validateMenuItem(item, i))

    // Check for duplicate IDs
    if (item && typeof item === 'object' && 'id' in item) {
      const id = (item as MenuItem).id
      if (seenIds.has(id)) {
        itemErrors.push(`Item ${i + 1}: duplicate ID "${id}"`)
      }
      seenIds.add(id)
    }
  }

  // Validate meta if present
  if (obj.meta !== undefined) {
    if (typeof obj.meta !== 'object' || obj.meta === null) {
      errors.push('"meta" must be an object')
    } else {
      const meta = obj.meta as Record<string, unknown>
      if (meta.categoryOrder !== undefined && !Array.isArray(meta.categoryOrder)) {
        errors.push('"meta.categoryOrder" must be an array')
      }
    }
  }

  const allErrors = [...errors, ...itemErrors]

  // Limit displayed errors
  if (allErrors.length > 10) {
    const remaining = allErrors.length - 10
    return {
      valid: false,
      errors: [...allErrors.slice(0, 10), `... and ${remaining} more errors`]
    }
  }

  return {
    valid: itemErrors.length === 0 && errors.filter(e => !e.startsWith('Warning')).length === 0,
    errors: allErrors,
    data: allErrors.filter(e => !e.startsWith('Warning')).length === 0 ? (data as MenuData) : undefined
  }
}

async function handleUpload() {
  if (!jsonText.value.trim()) {
    error.value = 'Please paste or drop a JSON file'
    return
  }

  error.value = ''
  validationErrors.value = []
  uploading.value = true

  try {
    let parsed: unknown
    try {
      parsed = JSON.parse(jsonText.value)
    } catch {
      error.value = 'Invalid JSON syntax'
      uploading.value = false
      return
    }

    const validation = validateMenuData(parsed)

    if (!validation.valid || !validation.data) {
      validationErrors.value = validation.errors
      error.value = 'Validation failed - see errors below'
      uploading.value = false
      return
    }

    // Show warnings but proceed
    if (validation.errors.length > 0) {
      validationErrors.value = validation.errors
    }

    const result = await uploadMenu(props.brand, props.store, props.menu, validation.data)

    if (result.success) {
      emit('success', validation.data)
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Upload failed'
  } finally {
    uploading.value = false
  }
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    readFile(file)
  }
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false

  const file = e.dataTransfer?.files[0]
  if (file && file.type === 'application/json') {
    readFile(file)
  }
}

function readFile(file: File) {
  const reader = new FileReader()
  reader.onload = (e) => {
    jsonText.value = e.target?.result as string
  }
  reader.readAsText(file)
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  dragOver.value = true
}

function handleDragLeave() {
  dragOver.value = false
}
</script>

<template>
  <div class="upload-panel card">
    <div class="header flex flex-between mb-2">
      <h3 class="font-medium">Upload Menu JSON</h3>
      <button @click="emit('close')" class="close-btn">&times;</button>
    </div>

    <div
      class="drop-zone"
      :class="{ 'drag-over': dragOver }"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @click="fileInput?.click()"
    >
      <input
        ref="fileInput"
        type="file"
        accept=".json,application/json"
        class="file-input"
        @change="handleFileSelect"
      />
      <div class="drop-content">
        <span class="drop-icon">📄</span>
        <span>Drop JSON file here or click to browse</span>
      </div>
    </div>

    <div class="text-muted text-sm mb-2" style="margin-top: 0.5rem;">
      Or paste JSON directly:
    </div>

    <textarea
      v-model="jsonText"
      class="input json-input"
      placeholder='{"items": [...]}'
      rows="8"
    ></textarea>

    <div v-if="error" class="error text-danger text-sm" style="margin-top: 0.5rem;">
      {{ error }}
    </div>

    <div v-if="validationErrors.length > 0" class="validation-errors" style="margin-top: 0.5rem;">
      <div class="validation-header text-sm font-medium">Validation Issues:</div>
      <ul class="validation-list text-sm">
        <li
          v-for="(err, i) in validationErrors"
          :key="i"
          :class="{ warning: err.startsWith('Warning') }"
        >
          {{ err }}
        </li>
      </ul>
    </div>

    <div class="actions" style="margin-top: 1rem;">
      <button @click="emit('close')" class="btn btn-secondary">
        Cancel
      </button>
      <button @click="handleUpload" class="btn btn-primary" :disabled="uploading">
        {{ uploading ? 'Uploading...' : 'Upload & Replace' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.upload-panel {
  border-color: var(--color-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--color-text-muted);
  line-height: 1;
  padding: 0;
}

.close-btn:hover {
  color: var(--color-text);
}

.drop-zone {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius);
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
}

.drop-zone:hover,
.drop-zone.drag-over {
  border-color: var(--color-primary);
  background: rgba(59, 130, 246, 0.05);
}

.file-input {
  display: none;
}

.drop-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-muted);
}

.drop-icon {
  font-size: 2rem;
}

.json-input {
  font-family: monospace;
  font-size: 0.8125rem;
  resize: vertical;
}

.actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.error {
  padding: 0.5rem;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 4px;
}

.validation-errors {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.75rem;
  max-height: 200px;
  overflow-y: auto;
}

.validation-header {
  color: var(--color-danger);
  margin-bottom: 0.5rem;
}

.validation-list {
  margin: 0;
  padding-left: 1.25rem;
  color: var(--color-text-muted);
}

.validation-list li {
  margin-bottom: 0.25rem;
}

.validation-list li.warning {
  color: #f59e0b;
}
</style>
