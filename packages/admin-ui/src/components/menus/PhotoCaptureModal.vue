<script setup lang="ts">
import { ref } from 'vue'
import { uploadImage, type MenuItem } from '../../lib/api'
import { generateImageFilename } from '../../lib/imageFilename'
import ImageCropper from '../shared/ImageCropper.vue'

const props = defineProps<{
  item: MenuItem
  brand: string
}>()

const emit = defineEmits<{
  close: []
  uploaded: [filename: string]
}>()

type Step = 'capture' | 'crop' | 'upload' | 'done' | 'error'

const step = ref<Step>('capture')
const capturedSrc = ref('')
const errorMessage = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

function onFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // Create object URL for cropping
  capturedSrc.value = URL.createObjectURL(file)
  step.value = 'crop'
}

async function onCrop(blob: Blob) {
  step.value = 'upload'

  try {
    // Generate filename from category and item name
    const filename = generateImageFilename(props.item.category, props.item.name)

    // Convert blob to File
    const file = new File([blob], filename, { type: 'image/jpeg' })

    // Upload to R2
    const result = await uploadImage(props.brand, file, filename)

    step.value = 'done'
    emit('uploaded', result.filename)
  } catch (e) {
    step.value = 'error'
    errorMessage.value = e instanceof Error ? e.message : 'Upload failed'
  }
}

function handleCancel() {
  // Clean up object URL if exists
  if (capturedSrc.value) {
    URL.revokeObjectURL(capturedSrc.value)
    capturedSrc.value = ''
  }
  step.value = 'capture'
}

function handleRetry() {
  errorMessage.value = ''
  step.value = 'capture'
}

function triggerFileInput() {
  fileInput.value?.click()
}
</script>

<template>
  <div class="capture-modal">
    <div class="modal-content">
      <!-- Step 1: Capture -->
      <div v-if="step === 'capture'" class="step step-capture">
        <h2>Take Photo</h2>
        <p class="item-name">{{ item.name }}</p>

        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          capture="environment"
          @change="onFileSelect"
          class="file-input"
        />

        <button @click="triggerFileInput" class="capture-btn">
          <span class="camera-icon">&#128247;</span>
          <span>Open Camera</span>
        </button>

        <p class="hint">Or select a file from your device</p>

        <button @click="emit('close')" class="btn btn-secondary">
          Cancel
        </button>
      </div>

      <!-- Step 2: Crop -->
      <div v-else-if="step === 'crop'" class="step step-crop">
        <h2>Crop Photo</h2>
        <p class="crop-hint">Drag to position, pinch to zoom</p>
        <ImageCropper
          :src="capturedSrc"
          @crop="onCrop"
          @cancel="handleCancel"
        />
      </div>

      <!-- Step 3: Upload -->
      <div v-else-if="step === 'upload'" class="step step-upload">
        <div class="spinner"></div>
        <p>Uploading...</p>
      </div>

      <!-- Step 4: Done -->
      <div v-else-if="step === 'done'" class="step step-done">
        <span class="success-icon">&#10003;</span>
        <p>Photo uploaded!</p>
        <button @click="emit('close')" class="btn btn-primary">
          Done
        </button>
      </div>

      <!-- Step 5: Error -->
      <div v-else-if="step === 'error'" class="step step-error">
        <span class="error-icon">&#10005;</span>
        <p class="error-message">{{ errorMessage }}</p>
        <div class="error-actions">
          <button @click="emit('close')" class="btn btn-secondary">
            Cancel
          </button>
          <button @click="handleRetry" class="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.capture-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal-content {
  background: var(--color-surface);
  border-radius: var(--radius);
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.step {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.step h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.item-name {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.capture-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem 3rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background-color 0.15s;
}

.capture-btn:hover {
  background: var(--color-primary-hover);
}

.camera-icon {
  font-size: 2.5rem;
}

.hint {
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.step-crop {
  padding: 1rem;
  height: 80vh;
  max-height: 600px;
}

.step-crop h2 {
  flex-shrink: 0;
}

.crop-hint {
  color: var(--color-text-muted);
  font-size: 0.75rem;
  flex-shrink: 0;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.success-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-success);
  color: white;
  border-radius: 50%;
  font-size: 2rem;
}

.error-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-danger);
  color: white;
  border-radius: 50%;
  font-size: 2rem;
}

.error-message {
  color: var(--color-danger);
  text-align: center;
}

.error-actions {
  display: flex;
  gap: 0.75rem;
}
</style>
