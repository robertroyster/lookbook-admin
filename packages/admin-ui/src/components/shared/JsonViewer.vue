<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  data: unknown
  title?: string
}>()

const formattedJson = computed(() => {
  return JSON.stringify(props.data, null, 2)
})
</script>

<template>
  <div class="json-viewer card">
    <div v-if="title" class="title font-medium mb-2">{{ title }}</div>
    <pre class="code"><code>{{ formattedJson }}</code></pre>
  </div>
</template>

<style scoped>
.json-viewer {
  overflow: hidden;
}

.code {
  background: var(--color-bg);
  padding: 1rem;
  border-radius: var(--radius);
  overflow-x: auto;
  font-size: 0.8125rem;
  line-height: 1.6;
  margin: 0;
}

code {
  color: var(--color-text-muted);
}
</style>
