import { useAuth } from './auth'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

interface ApiError {
  error: string
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { getApiKey } = useAuth()
  const apiKey = getApiKey()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers
  }

  if (apiKey) {
    ;(headers as Record<string, string>)['Authorization'] = `Bearer ${apiKey}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error((data as ApiError).error || 'Request failed')
  }

  return data as T
}

// Types
export interface Brand {
  slug: string
  name: string
  logo?: string
}

export interface BrandsResponse {
  brands: Brand[]
  defaultBrand: string
}

export interface BrandRegistry {
  brand: { slug: string; name: string }
  defaultStore: string
  stores: { slug: string; name: string; file: string }[]
  paths: { images: string; placeholder: string }
}

export interface StoreConfig {
  slug: string
  name: string
  menus: { id: string; label: string; file: string; categoryOrder?: string[] }[]
}

export interface MenuItem {
  id: string
  name: string
  category: string
  price?: number | string
  description?: string
  image?: string
  gif?: string
  storeImage?: string
  expectedImage?: string
}

export interface MenuData {
  meta?: { categoryOrder?: string[] }
  items: MenuItem[]
}

export interface VersionEntry {
  id: string
  type: 'edit' | 'upload'
  timestamp: string
  keyId: string
  itemCount: number
}

export interface VersionManifest {
  current: string | null
  versions: VersionEntry[]
}

// API functions

export async function healthCheck() {
  return request<{ status: string; timestamp: string }>('/health')
}

export async function validateApiKey(apiKey: string): Promise<{ valid: boolean; brand?: string }> {
  try {
    // Try to fetch brands with the key to validate it
    const response = await fetch(`${API_BASE}/brands`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (response.ok) {
      // Key is valid, but we need to determine the brand
      // For now, we'll extract it from a protected endpoint
      // This is a simplified check - in production you'd have a /validate endpoint
      return { valid: true }
    }

    return { valid: false }
  } catch {
    return { valid: false }
  }
}

export async function getBrands() {
  return request<BrandsResponse>('/brands')
}

export async function getBrandRegistry(brand: string) {
  return request<BrandRegistry>(`/brands/${brand}`)
}

export async function getStoreConfig(brand: string, store: string) {
  return request<StoreConfig>(`/stores/${brand}/${store}`)
}

export async function getMenu(brand: string, store: string, menu: string) {
  return request<MenuData>(`/menus/${brand}/${store}/${menu}`)
}

export async function saveMenu(brand: string, store: string, menu: string, data: MenuData) {
  return request<{ success: boolean; versionId: string; liveUrl: string }>(
    `/menus/${brand}/${store}/${menu}`,
    {
      method: 'PUT',
      body: JSON.stringify(data)
    }
  )
}

export async function uploadMenu(brand: string, store: string, menu: string, data: MenuData) {
  return request<{ success: boolean; versionId: string; liveUrl: string }>(
    `/menus/${brand}/${store}/${menu}/upload`,
    {
      method: 'POST',
      body: JSON.stringify(data)
    }
  )
}

export async function getVersions(brand: string, store: string, menu: string) {
  return request<VersionManifest>(`/versions/${brand}/${store}/${menu}`)
}

export async function uploadImage(brand: string, file: File, filename?: string) {
  const { getApiKey } = useAuth()
  const apiKey = getApiKey()

  const formData = new FormData()
  formData.append('file', file)
  if (filename) {
    formData.append('filename', filename)
  }

  const response = await fetch(`${API_BASE}/images/${brand}`, {
    method: 'POST',
    headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
    body: formData
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error((data as ApiError).error || 'Upload failed')
  }

  return data as { success: boolean; filename: string; url: string; size: number }
}

export interface DeployBrandRequest {
  brandSlug: string
  brandName: string
  locationSlug: string
  locationName: string
  logoFile?: File | null
}

export interface DeployLocationRequest {
  brandSlug: string
  locationSlug: string
  locationName: string
}

export async function deployLocation(params: DeployLocationRequest) {
  const { getApiKey } = useAuth()
  const apiKey = getApiKey()

  const response = await fetch(`${API_BASE}/deploy/location`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
    },
    body: JSON.stringify(params)
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error((data as ApiError).error || 'Deployment failed')
  }

  return data as { success: boolean; locationUrl: string; filesCreated: string[] }
}

export async function deployBrand(params: DeployBrandRequest) {
  const { getApiKey } = useAuth()
  const apiKey = getApiKey()

  const formData = new FormData()
  formData.append('brandSlug', params.brandSlug)
  formData.append('brandName', params.brandName)
  formData.append('locationSlug', params.locationSlug)
  formData.append('locationName', params.locationName)
  if (params.logoFile) {
    formData.append('logo', params.logoFile)
  }

  const response = await fetch(`${API_BASE}/deploy/brand`, {
    method: 'POST',
    headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
    body: formData
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error((data as ApiError).error || 'Deployment failed')
  }

  return data as { success: boolean; brandUrl: string; filesCreated: string[] }
}
