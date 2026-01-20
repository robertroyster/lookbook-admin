/**
 * R2 helpers with fallback to public URL for local development
 */

import type { Env } from '../index'

/**
 * Fetch JSON from R2 bucket, with fallback to public URL
 * This allows local development without R2 credentials
 */
export async function fetchFromBucket(
  env: Env,
  key: string,
  bucket: 'public' | 'internal' = 'public'
): Promise<unknown | null> {
  const r2Bucket = bucket === 'public' ? env.MENU_BUCKET : env.INTERNAL_BUCKET

  // Try R2 bucket first
  try {
    const object = await r2Bucket.get(key)
    if (object) {
      return object.json()
    }
  } catch (error) {
    console.log(`R2 bucket read failed for ${key}, trying public URL fallback`)
  }

  // Fallback to public URL for read operations (dev mode)
  if (bucket === 'public') {
    try {
      const url = `${env.R2_PUBLIC_URL}/${key}`
      const response = await fetch(url)
      if (response.ok) {
        return response.json()
      }
    } catch (error) {
      console.error(`Public URL fallback failed for ${key}:`, error)
    }
  }

  return null
}

/**
 * Check if a key exists in R2
 */
export async function existsInBucket(
  env: Env,
  key: string,
  bucket: 'public' | 'internal' = 'public'
): Promise<boolean> {
  const r2Bucket = bucket === 'public' ? env.MENU_BUCKET : env.INTERNAL_BUCKET

  try {
    const object = await r2Bucket.head(key)
    return object !== null
  } catch {
    // Fallback check via public URL
    if (bucket === 'public') {
      try {
        const response = await fetch(`${env.R2_PUBLIC_URL}/${key}`, { method: 'HEAD' })
        return response.ok
      } catch {
        return false
      }
    }
    return false
  }
}
