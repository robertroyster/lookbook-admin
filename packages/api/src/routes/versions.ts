/**
 * Version routes
 * - GET /api/versions/:brand/:store/:menu - get version history
 */

import type { Env } from '../index'
import { corsHeaders } from '../middleware/cors'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  })
}

/**
 * GET /api/versions/:brand/:store/:menu
 * Fetch version manifest from internal bucket
 */
export async function handleVersions(
  env: Env,
  brand: string,
  store: string,
  menu: string
): Promise<Response> {
  try {
    const key = `_versions/${brand}/${store}__${menu}/manifest.json`
    const object = await env.INTERNAL_BUCKET.get(key)

    if (!object) {
      // No versions yet, return empty
      return json({
        current: null,
        versions: []
      })
    }

    const data = await object.json()
    return json(data)
  } catch (error) {
    console.error(`Error fetching versions for ${brand}/${store}/${menu}:`, error)
    return json({ error: 'Failed to fetch versions' }, 500)
  }
}
