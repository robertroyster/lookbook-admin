<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getBrands, type Brand } from '../lib/api'
import { useAuth } from '../lib/auth'
import LoadingSpinner from '../components/shared/LoadingSpinner.vue'
import ErrorBanner from '../components/shared/ErrorBanner.vue'
import BrandCard from '../components/brands/BrandCard.vue'

const { brandSlug, isAdmin } = useAuth()
const allBrands = ref<Brand[]>([])
const loading = ref(true)
const error = ref('')

// Reactively filter brands based on auth state
const brands = computed(() => {
  console.log('Auth state:', { brandSlug: brandSlug.value, isAdmin: isAdmin.value })
  console.log('All brands:', allBrands.value.map(b => b.slug))

  if (isAdmin.value) {
    return allBrands.value
  }
  if (brandSlug.value) {
    const userBrand = brandSlug.value.toLowerCase()
    const filtered = allBrands.value.filter(b => b.slug.toLowerCase() === userBrand)
    console.log('Filtered to:', filtered.map(b => b.slug))
    return filtered
  }
  return allBrands.value
})

onMounted(async () => {
  try {
    const data = await getBrands()
    allBrands.value = data.brands
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load brands'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="container">
    <div class="header flex flex-between mb-3">
      <h1 class="text-xl font-semibold">Brands</h1>
      <span class="text-muted">{{ brands.length }} brands</span>
    </div>

    <LoadingSpinner v-if="loading" />
    <ErrorBanner v-else-if="error" :message="error" />

    <div v-else class="grid grid-3">
      <BrandCard v-for="brand in brands" :key="brand.slug" :brand="brand" />
    </div>
  </div>
</template>
