/**
 * Auth middleware for Lookbook Admin API
 *
 * Validates API keys stored hashed in menumanager-internal bucket.
 * Keys are stored at: /_tenants/{brand}/keys.json
 *
 * Format of keys.json:
 * {
 *   "keys": [
 *     { "id": "key_abc123", "hash": "<sha256 hash>", "createdAt": "..." }
 *   ]
 * }
 */

import type { Env } from '../index'

export interface AuthContext {
  brandSlug: string
  keyId: string
  isSuperAdmin: boolean
}

// Super-admin token has full access including deployment
const SUPER_ADMIN_TOKEN = 'P9WbmcPbSiNBtF1ZdhVYg2WS5ZIa6u9UkxVlSM6v'

export interface AuthResult {
  success: boolean
  error?: string
  context?: AuthContext
}

interface StoredKey {
  id: string
  hash: string
  createdAt: string
  label?: string
}

interface KeysFile {
  keys: StoredKey[]
}

/**
 * Hash a key using SHA-256
 */
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Authenticate a request using Bearer token
 */
export async function authenticate(request: Request, env: Env): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader) {
    return { success: false, error: 'Missing Authorization header' }
  }

  if (!authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'Invalid Authorization header format' }
  }

  const apiKey = authHeader.slice(7) // Remove 'Bearer ' prefix

  if (!apiKey || apiKey.length < 32) {
    return { success: false, error: 'Invalid API key format' }
  }

  // Check for super-admin token first
  if (apiKey === SUPER_ADMIN_TOKEN) {
    return {
      success: true,
      context: {
        brandSlug: '*',
        keyId: 'super_admin',
        isSuperAdmin: true
      }
    }
  }

  // Hash the provided key
  const keyHash = await hashKey(apiKey)

  // List all tenant directories to find matching key
  const tenantPrefix = '_tenants/'
  const listed = await env.INTERNAL_BUCKET.list({ prefix: tenantPrefix })

  for (const object of listed.objects) {
    // Look for keys.json files
    if (!object.key.endsWith('/keys.json')) continue

    // Extract brand slug from path: _tenants/{brand}/keys.json
    const match = object.key.match(/^_tenants\/([^/]+)\/keys\.json$/)
    if (!match) continue

    const brandSlug = match[1]

    // Fetch and parse keys file
    const keysObject = await env.INTERNAL_BUCKET.get(object.key)
    if (!keysObject) continue

    try {
      const keysData: KeysFile = await keysObject.json()

      // Find matching key by hash
      const matchedKey = keysData.keys.find(k => k.hash === keyHash)

      if (matchedKey) {
        return {
          success: true,
          context: {
            brandSlug,
            keyId: matchedKey.id,
            isSuperAdmin: false
          }
        }
      }
    } catch {
      // Invalid JSON, skip this file
      continue
    }
  }

  return { success: false, error: 'Invalid API key' }
}

/**
 * Generate a new API key (for operator use)
 * Returns the raw key (show once) and the hash (store)
 */
export async function generateApiKey(): Promise<{ key: string; hash: string; id: string }> {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const key = 'lbk_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  const hash = await hashKey(key)
  const id = 'key_' + key.slice(4, 16) // Use first 12 chars of key as ID

  return { key, hash, id }
}
