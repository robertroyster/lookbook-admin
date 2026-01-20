<script setup lang="ts">
import { ref, computed } from 'vue'
import type { MenuItem } from '../../lib/api'

const props = defineProps<{
  categories: Array<[string, MenuItem[]]>
}>()

const emit = defineEmits<{
  'scroll-to': [category: string]
  rename: [oldName: string, newName: string]
  reorder: [newOrder: string[]]
}>()

const mode = ref<'default' | 'edit' | 'reorder'>('default')
const editingCategory = ref<string | null>(null)
const editValue = ref('')
const editError = ref('')

const categoryNames = computed(() => props.categories.map(([name]) => name))

function handleChipClick(category: string) {
  if (mode.value === 'default') {
    emit('scroll-to', category)
  } else if (mode.value === 'edit') {
    startEdit(category)
  }
}

function startEdit(category: string) {
  editingCategory.value = category
  editValue.value = category
  editError.value = ''
}

function cancelEdit() {
  editingCategory.value = null
  editValue.value = ''
  editError.value = ''
}

function confirmEdit() {
  const newName = editValue.value.trim()
  const oldName = editingCategory.value

  if (!oldName || !newName) {
    editError.value = 'Name cannot be empty'
    return
  }

  if (newName === oldName) {
    cancelEdit()
    return
  }

  if (categoryNames.value.includes(newName)) {
    editError.value = 'Category already exists'
    return
  }

  emit('rename', oldName, newName)
  cancelEdit()
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    confirmEdit()
  } else if (e.key === 'Escape') {
    cancelEdit()
  }
}

function moveCategory(name: string, direction: 'up' | 'down') {
  const order = [...categoryNames.value]
  const idx = order.indexOf(name)

  if (direction === 'up' && idx > 0) {
    [order[idx], order[idx - 1]] = [order[idx - 1], order[idx]]
  } else if (direction === 'down' && idx < order.length - 1) {
    [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]]
  }

  emit('reorder', order)
}

function setMode(newMode: 'default' | 'edit' | 'reorder') {
  if (mode.value === newMode) {
    mode.value = 'default'
  } else {
    mode.value = newMode
    cancelEdit()
  }
}

</script>

<template>
  <div class="category-bar card">
    <div class="bar-header">
      <span class="bar-title text-sm text-muted">Categories</span>
      <div class="bar-actions">
        <button
          class="btn-icon"
          :class="{ active: mode === 'reorder' }"
          @click="setMode('reorder')"
          title="Reorder categories"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <polyline points="19 12 12 19 5 12"/>
          </svg>
        </button>
        <button
          class="btn-icon"
          :class="{ active: mode === 'edit' }"
          @click="setMode('edit')"
          title="Edit category names"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="chips-container">
      <div
        v-for="([category, items], index) in categories"
        :key="category"
        class="chip-wrapper"
      >
        <!-- Reorder mode: show arrows -->
        <template v-if="mode === 'reorder'">
          <button
            class="arrow-btn"
            :disabled="index === 0"
            @click="moveCategory(category, 'up')"
            title="Move up"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          </button>
        </template>

        <!-- Edit mode: inline input when editing this category -->
        <template v-if="mode === 'edit' && editingCategory === category">
          <div class="edit-input-wrapper">
            <input
              v-model="editValue"
              class="edit-input"
              @keydown="handleKeydown"
              @blur="cancelEdit"
              ref="editInput"
              autofocus
            />
            <span class="chip-count">{{ items.length }}</span>
          </div>
          <div v-if="editError" class="edit-error text-danger text-sm">{{ editError }}</div>
        </template>

        <!-- Default/Edit (not editing this one)/Reorder: show chip -->
        <template v-else>
          <button
            class="chip"
            :class="{
              clickable: mode === 'default' || mode === 'edit',
              'edit-mode': mode === 'edit'
            }"
            @click="handleChipClick(category)"
          >
            <span class="chip-name">{{ category }}</span>
            <span class="chip-count">{{ items.length }}</span>
          </button>
        </template>

        <!-- Reorder mode: show arrows -->
        <template v-if="mode === 'reorder'">
          <button
            class="arrow-btn"
            :disabled="index === categories.length - 1"
            @click="moveCategory(category, 'down')"
            title="Move down"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </template>
      </div>
    </div>

    <div v-if="mode !== 'default'" class="mode-hint text-sm text-muted">
      <template v-if="mode === 'edit'">Click a category to rename it</template>
      <template v-else-if="mode === 'reorder'">Use arrows to reorder categories</template>
    </div>
  </div>
</template>

<style scoped>
.category-bar {
  padding: 1rem;
}

.bar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.bar-title {
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
}

.bar-actions {
  display: flex;
  gap: 0.25rem;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text-muted);
  transition: all 0.15s;
}

.btn-icon:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.btn-icon.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.chips-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.chip-wrapper {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 9999px;
  color: var(--color-text);
  font-size: 0.875rem;
  min-height: 44px;
  transition: all 0.15s;
}

.chip.clickable {
  cursor: pointer;
}

.chip.clickable:hover {
  border-color: var(--color-primary);
  background: rgba(59, 130, 246, 0.1);
}

.chip.edit-mode:hover {
  border-color: var(--color-success);
  background: rgba(34, 197, 94, 0.1);
}

.chip-name {
  font-weight: 500;
}

.chip-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  height: 1.5rem;
  padding: 0 0.375rem;
  background: var(--color-border);
  border-radius: 9999px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.arrow-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text-muted);
  transition: all 0.15s;
}

.arrow-btn:not(:disabled):hover {
  background: var(--color-border);
  color: var(--color-text);
}

.arrow-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.edit-input-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  background: var(--color-bg);
  border: 2px solid var(--color-primary);
  border-radius: 9999px;
  min-height: 44px;
}

.edit-input {
  background: transparent;
  border: none;
  color: var(--color-text);
  font-size: 0.875rem;
  font-weight: 500;
  width: 120px;
  outline: none;
}

.edit-error {
  position: absolute;
  margin-top: 0.25rem;
}

.mode-hint {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
}

@media (max-width: 640px) {
  .chips-container {
    gap: 0.75rem;
  }

  .chip {
    padding: 0.625rem 1rem;
  }
}
</style>
