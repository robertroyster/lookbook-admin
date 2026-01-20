<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getBrands, type Brand } from '../lib/api'
import { useAuth } from '../lib/auth'
import LoadingSpinner from '../components/shared/LoadingSpinner.vue'
import ErrorBanner from '../components/shared/ErrorBanner.vue'
import BrandCard from '../components/brands/BrandCard.vue'

const { brandSlug, isAdmin } = useAuth()
const brands = ref<Brand[]>([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const data = await getBrands()
    // Admins see all brands, regular users only see their own
    if (isAdmin.value) {
      brands.value = data.brands
    } else if (brandSlug.value) {
      const userBrand = brandSlug.value.toLowerCase()
      brands.value = data.brands.filter(b => b.slug.toLowerCase() === userBrand)
    } else {
      brands.value = data.brands
    }
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
