<script setup lang="ts">
import { ref } from 'vue'
import { uploadMenu, type MenuData } from '../../lib/api'

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
const dragOver = ref(false)

async function handleUpload() {
  if (!jsonText.value.trim()) {
    error.value = 'Please paste or drop a JSON file'
    return
  }

  error.value = ''
  uploading.value = true

  try {
    const data = JSON.parse(jsonText.value) as MenuData

    if (!Array.isArray(data.items)) {
      throw new Error('Invalid menu format: missing items array')
    }

    const result = await uploadMenu(props.brand, props.store, props.menu, data)

    if (result.success) {
      emit('success', data)
    }
  } catch (e) {
    if (e instanceof SyntaxError) {
      error.value = 'Invalid JSON format'
    } else {
      error.value = e instanceof Error ? e.message : 'Upload failed'
    }
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
</style>
