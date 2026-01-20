/**
 * Brand routes
 * - GET /api/brands - list all brands
 * - GET /api/brands/:brand - get brand registry
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
 * GET /api/brands
 * Fetch brands.json from public bucket
 */
export async function handleBrands(env: Env): Promise<Response> {
  try {
    const data = await fetchFromBucket(env, 'brands.json')

    if (!data) {
      return json({ error: 'brands.json not found' }, 404)
    }

    return json(data)
  } catch (error) {
    console.error('Error fetching brands:', error)
    return json({ error: 'Failed to fetch brands' }, 500)
  }
}

/**
 * GET /api/brands/:brand
 * Fetch registry_{brand}.json from public bucket
 */
export async function handleBrandRegistry(env: Env, brand: string): Promise<Response> {
  try {
    const key = `${brand}/registry_${brand}.json`
    const data = await fetchFromBucket(env, key)

    if (!data) {
      return json({ error: `Registry not found for brand: ${brand}` }, 404)
    }

    return json(data)
  } catch (error) {
    console.error(`Error fetching registry for ${brand}:`, error)
    return json({ error: 'Failed to fetch brand registry' }, 500)
  }
}
