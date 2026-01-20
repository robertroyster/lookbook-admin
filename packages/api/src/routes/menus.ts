/**
 * Menu routes
 * - GET /api/menus/:brand/:store/:menu - get menu
 * - PUT /api/menus/:brand/:store/:menu - save menu (edit)
 * - POST /api/menus/:brand/:store/:menu/upload - upload full menu
 */

import type { Env } from '../index'
import type { AuthContext } from '../middleware/auth'
import { corsHeaders } from '../middleware/cors'
import { writeVersion, appendAuditLog } from '../lib/versioning'
import { fetchFromBucket } from '../lib/r2'

interface MenuData {
  meta?: { categoryOrder?: string[] }
  items: Array<{
    id: string
    name: string
    category: string
    price?: number | string
    description?: string
    image?: string
  }>
}

function isMenuData(data: unknown): data is MenuData {
  if (!data || typeof data !== 'object') return false
  const obj = data as Record<string, unknown>
  return Array.isArray(obj.items)
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  })
}

/**
 * GET /api/menus/:brand/:store/:menu
 * Fetch {store}__{menu}.json from public bucket
 */
export async function handleMenu(
  env: Env,
  brand: string,
  store: string,
  menu: string
): Promise<Response> {
  try {
    const key = `${brand}/${store}__${menu}.json`
    const data = await fetchFromBucket(env, key)

    if (!data) {
      return json({ error: `Menu not found: ${brand}/${store}/${menu}` }, 404)
    }

    return json(data)
  } catch (error) {
    console.error(`Error fetching menu ${brand}/${store}/${menu}:`, error)
    return json({ error: 'Failed to fetch menu' }, 500)
  }
}

/**
 * PUT /api/menus/:brand/:store/:menu
 * Save menu JSON (edit type)
 */
export async function handleMenuSave(
  request: Request,
  env: Env,
  auth: AuthContext,
  brand: string,
  store: string,
  menu: string
): Promise<Response> {
  try {
    const rawData = await request.json()

    // Validate basic structure
    if (!isMenuData(rawData)) {
      return json({ error: 'Invalid menu data: must have items array' }, 400)
    }

    const menuData = rawData

    // Write version snapshot and update live
    const versionId = await writeVersion(env, brand, store, menu, menuData, 'edit', auth.keyId)

    // Append audit log
    await appendAuditLog(env, brand, store, menu, {
      type: 'edit',
      versionId,
      keyId: auth.keyId,
      itemCount: menuData.items.length
    })

    // Write to live (public bucket)
    const liveKey = `${brand}/${store}__${menu}.json`
    await env.MENU_BUCKET.put(liveKey, JSON.stringify(menuData, null, 2), {
      httpMetadata: { contentType: 'application/json' }
    })

    return json({
      success: true,
      versionId,
      liveUrl: `${env.R2_PUBLIC_URL}/${liveKey}`
    })
  } catch (error) {
    console.error(`Error saving menu ${brand}/${store}/${menu}:`, error)
    return json({ error: 'Failed to save menu' }, 500)
  }
}

/**
 * POST /api/menus/:brand/:store/:menu/upload
 * Upload full menu JSON (upload type)
 */
export async function handleMenuUpload(
  request: Request,
  env: Env,
  auth: AuthContext,
  brand: string,
  store: string,
  menu: string
): Promise<Response> {
  try {
    const rawData = await request.json()

    // Validate basic structure
    if (!isMenuData(rawData)) {
      return json({ error: 'Invalid menu data: must have items array' }, 400)
    }

    const menuData = rawData

    // Write version snapshot
    const versionId = await writeVersion(env, brand, store, menu, menuData, 'upload', auth.keyId)

    // Append audit log
    await appendAuditLog(env, brand, store, menu, {
      type: 'upload',
      versionId,
      keyId: auth.keyId,
      itemCount: menuData.items.length
    })

    // Write to live (public bucket)
    const liveKey = `${brand}/${store}__${menu}.json`
    await env.MENU_BUCKET.put(liveKey, JSON.stringify(menuData, null, 2), {
      httpMetadata: { contentType: 'application/json' }
    })

    return json({
      success: true,
      versionId,
      liveUrl: `${env.R2_PUBLIC_URL}/${liveKey}`
    })
  } catch (error) {
    console.error(`Error uploading menu ${brand}/${store}/${menu}:`, error)
    return json({ error: 'Failed to upload menu' }, 500)
  }
}
