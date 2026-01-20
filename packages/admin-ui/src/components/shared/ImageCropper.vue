<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'

defineProps<{
  src: string
}>()

const emit = defineEmits<{
  crop: [blob: Blob]
  cancel: []
}>()

const imageRef = ref<HTMLImageElement | null>(null)
let cropper: Cropper | null = null

onMounted(() => {
  if (imageRef.value) {
    cropper = new Cropper(imageRef.value, {
      aspectRatio: 1,
      viewMode: 1,
      dragMode: 'move',
      autoCropArea: 1,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
      minCropBoxWidth: 100,
      minCropBoxHeight: 100,
      background: false,
      responsive: true
    })
  }
})

onUnmounted(() => {
  cropper?.destroy()
})

function handleCrop() {
  if (!cropper) return

  const canvas = cropper.getCroppedCanvas({
    width: 600,
    height: 600,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high'
  })

  canvas.toBlob(
    (blob) => {
      if (blob) {
        emit('crop', blob)
      }
    },
    'image/jpeg',
    0.85
  )
}
</script>

<template>
  <div class="image-cropper">
    <div class="cropper-container">
      <img ref="imageRef" :src="src" alt="Crop preview" />
    </div>
    <div class="cropper-actions">
      <button @click="emit('cancel')" class="btn btn-secondary">
        Cancel
      </button>
      <button @click="handleCrop" class="btn btn-primary">
        Use Photo
      </button>
    </div>
  </div>
</template>

<style scoped>
.image-cropper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.cropper-container {
  flex: 1;
  min-height: 0;
  background: var(--color-bg);
  border-radius: var(--radius);
  overflow: hidden;
}

.cropper-container img {
  display: block;
  max-width: 100%;
}

.cropper-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  padding-top: 1rem;
}

/* Override cropper.js styles for dark theme */
:deep(.cropper-modal) {
  background: rgba(0, 0, 0, 0.8);
}

:deep(.cropper-view-box) {
  outline: 2px solid var(--color-primary);
  outline-color: rgba(59, 130, 246, 0.75);
}

:deep(.cropper-line) {
  background-color: var(--color-primary);
}

:deep(.cropper-point) {
  background-color: var(--color-primary);
  width: 10px;
  height: 10px;
}

:deep(.cropper-dashed) {
  border-color: rgba(255, 255, 255, 0.3);
}
</style>
