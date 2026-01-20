import { ref, computed } from 'vue'

const API_KEY_STORAGE_KEY = 'lookbook_api_key'
const BRAND_SLUG_STORAGE_KEY = 'lookbook_brand_slug'

// Super-admin token has full access including deployment capabilities
const SUPER_ADMIN_TOKEN = 'P9WbmcPbSiNBtF1ZdhVYg2WS5ZIa6u9UkxVlSM6v'

const apiKey = ref<string | null>(localStorage.getItem(API_KEY_STORAGE_KEY))
const brandSlug = ref<string | null>(localStorage.getItem(BRAND_SLUG_STORAGE_KEY))

export function useAuth() {
  const isAuthenticated = computed(() => !!apiKey.value)
  const isSuperAdmin = computed(() => apiKey.value === SUPER_ADMIN_TOKEN)
  const isAdmin = computed(() => brandSlug.value === '*' || isSuperAdmin.value)

  function login(key: string, brand: string) {
    apiKey.value = key
    brandSlug.value = brand
    localStorage.setItem(API_KEY_STORAGE_KEY, key)
    localStorage.setItem(BRAND_SLUG_STORAGE_KEY, brand)
  }

  function logout() {
    apiKey.value = null
    brandSlug.value = null
    localStorage.removeItem(API_KEY_STORAGE_KEY)
    localStorage.removeItem(BRAND_SLUG_STORAGE_KEY)
  }

  function getApiKey(): string | null {
    return apiKey.value
  }

  return {
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    apiKey,
    brandSlug,
    login,
    logout,
    getApiKey
  }
}
