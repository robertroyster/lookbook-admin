/**
 * Store routes
 * - GET /api/stores/:brand/:store - get store config
 */

import type { Env } from '../index'
import { corsHeaders } from '../middleware/cors'
import { fetchFromBucket } from '../lib/r2'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  })
}

/**
 * GET /api/stores/:brand/:store
 * Fetch {store}.json from public bucket
 */
export async function handleStoreConfig(env: Env, brand: string, store: string): Promise<Response> {
  try {
    const key = `${brand}/${store}.json`
    const data = await fetchFromBucket(env, key)

    if (!data) {
      return json({ error: `Store config not found: ${brand}/${store}` }, 404)
    }

    return json(data)
  } catch (error) {
    console.error(`Error fetching store config for ${brand}/${store}:`, error)
    return json({ error: 'Failed to fetch store config' }, 500)
  }
}
