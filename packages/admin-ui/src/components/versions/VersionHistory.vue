<script setup lang="ts">
import type { VersionManifest } from '../../lib/api'

defineProps<{
  versions: VersionManifest
}>()

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleString()
}

function getTypeLabel(type: string): string {
  return type === 'upload' ? 'Full Upload' : 'Edit'
}

function getTypeClass(type: string): string {
  return type === 'upload' ? 'type-upload' : 'type-edit'
}
</script>

<template>
  <div class="version-history card">
    <h3 class="font-medium mb-2">Version History</h3>

    <div v-if="versions.versions.length === 0" class="empty text-muted">
      No versions yet
    </div>

    <div v-else class="timeline">
      <div
        v-for="version in versions.versions"
        :key="version.id"
        class="version-item"
        :class="{ current: version.id === versions.current }"
      >
        <div class="version-marker"></div>
        <div class="version-content">
          <div class="version-header flex flex-between">
            <span :class="['type-badge', getTypeClass(version.type)]">
              {{ getTypeLabel(version.type) }}
            </span>
            <span v-if="version.id === versions.current" class="current-badge">
              Current
            </span>
          </div>
          <div class="version-date text-sm">{{ formatDate(version.timestamp) }}</div>
          <div class="version-meta text-muted text-sm">
            {{ version.itemCount }} items
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.version-history {
  max-height: 400px;
  overflow-y: auto;
}

.empty {
  padding: 2rem;
  text-align: center;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.version-item {
  display: flex;
  gap: 1rem;
  padding: 0.75rem;
  background: var(--color-bg);
  border-radius: var(--radius);
  position: relative;
}

.version-item.current {
  border: 1px solid var(--color-primary);
}

.version-marker {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-border);
  flex-shrink: 0;
  margin-top: 4px;
}

.version-item.current .version-marker {
  background: var(--color-primary);
}

.version-content {
  flex: 1;
  min-width: 0;
}

.version-header {
  margin-bottom: 0.25rem;
}

.type-badge {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
}

.type-edit {
  background: rgba(59, 130, 246, 0.2);
  color: var(--color-primary);
}

.type-upload {
  background: rgba(34, 197, 94, 0.2);
  color: var(--color-success);
}

.current-badge {
  font-size: 0.75rem;
  color: var(--color-primary);
  font-weight: 500;
}

.version-date {
  margin-bottom: 0.125rem;
}
</style>
