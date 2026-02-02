/**
 * Apify webhook handler
 *
 * POST /api/integrations/apify/webhook?secret=...
 *
 * Handles RUN.SUCCEEDED and RUN.FAILED events from Apify
 */

import type { Env } from '../index'
import { corsHeaders } from '../middleware/cors'
import {
  fetchDatasetItems,
  stripReviews,
  parsePriceToCents,
  type ApifyWebhookPayload,
  type DoorDashScrapedStore
} from '../lib/apify'
import { createSupabaseClient } from '../lib/supabase'
import { sha256, gzipCompress, generateClaimCode } from '../lib/crypto'

/**
 * POST /api/integrations/apify/webhook
 * Handle Apify webhook callbacks
 */
export async function handleApifyWebhook(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url)
  const secret = url.searchParams.get('secret')

  // Validate webhook secret
  if (!env.APIFY_WEBHOOK_SECRET || secret !== env.APIFY_WEBHOOK_SECRET) {
    console.error('[webhook] Invalid or missing webhook secret')
    return json({ error: 'Unauthorized' }, 401)
  }

  // Validate required env vars
  if (!env.APIFY_TOKEN || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[webhook] Missing required environment variables')
    return json({ error: 'Server configuration error' }, 500)
  }

  try {
    const payload: ApifyWebhookPayload = await request.json()

    const runId = payload.resource?.id || payload.eventData?.actorRunId
    const datasetId = payload.resource?.defaultDatasetId
    const eventType = payload.eventType

    console.log(`[webhook] Received: eventType=${eventType}, runId=${runId}, datasetId=${datasetId}`)

    // Handle different event types
    if (eventType === 'ACTOR.RUN.FAILED' || eventType === 'ACTOR.RUN.ABORTED' || eventType === 'ACTOR.RUN.TIMED_OUT') {
      await recordFailedImport(env, runId, datasetId, eventType, payload.resource?.statusMessage)
      return json({ received: true, status: 'failed', runId })
    }

    if (eventType !== 'ACTOR.RUN.SUCCEEDED') {
      console.log(`[webhook] Ignoring event type: ${eventType}`)
      return json({ received: true, status: 'ignored', eventType })
    }

    // Process successful run
    const result = await processSuccessfulRun(env, runId, datasetId)

    return json({
      received: true,
      status: 'success',
      runId,
      ...result
    })
  } catch (error) {
    console.error('[webhook] Error processing webhook:', error)
    return json({
      error: 'Failed to process webhook',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}

/**
 * Process a successful Apify run
 */
async function processSuccessfulRun(
  env: Env,
  runId: string,
  datasetId: string
): Promise<{ r2Key: string; itemCount: number; restaurantsCreated: number; claimCodesGenerated: number }> {
  const supabase = createSupabaseClient({
    url: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY
  })

  // 1. Fetch dataset items from Apify
  console.log(`[webhook] Fetching dataset items: datasetId=${datasetId}`)
  const items = await fetchDatasetItems(env.APIFY_TOKEN, datasetId)
  console.log(`[webhook] Fetched ${items.length} items from dataset`)

  // 2. Serialize and compute hash
  const rawJson = JSON.stringify(items)
  const payloadHash = await sha256(rawJson)

  // 3. Check for duplicate import (idempotency)
  const existingImport = await supabase
    .from('imports')
    .select('id,status')
    .eq('payload_hash', payloadHash)
    .single()
    .execute()

  if (existingImport.data && (existingImport.data as { status: string }).status === 'success') {
    console.log(`[webhook] Duplicate import detected: payloadHash=${payloadHash}`)
    return {
      r2Key: `raw/dd/${runId}.json.gz`,
      itemCount: items.length,
      restaurantsCreated: 0,
      claimCodesGenerated: 0
    }
  }

  // 4. Compress and store in R2
  const r2Key = `raw/dd/${runId}.json.gz`
  const compressed = await gzipCompress(rawJson)

  await env.SCRAPE_BUCKET.put(r2Key, compressed, {
    httpMetadata: {
      contentType: 'application/gzip',
      contentEncoding: 'gzip'
    },
    customMetadata: {
      runId,
      datasetId,
      payloadHash,
      itemCount: String(items.length)
    }
  })
  console.log(`[webhook] Stored raw payload: r2Key=${r2Key}, size=${compressed.byteLength}`)

  // 5. Create import record
  await supabase.from('imports').insert({
    source: 'doordash',
    run_id: runId,
    dataset_id: datasetId,
    payload_hash: payloadHash,
    r2_key: r2Key,
    status: 'processing',
    item_count: items.length
  }).execute()

  // 6. Normalize and store data
  let restaurantsCreated = 0
  let claimCodesGenerated = 0
  const errors: string[] = []

  for (const store of items) {
    try {
      const result = await normalizeAndStoreStore(env, supabase, store)
      if (result.restaurantCreated) restaurantsCreated++
      if (result.claimCodeGenerated) claimCodesGenerated++
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[webhook] Error normalizing store: ${store.url || 'unknown'}:`, errorMsg)
      errors.push(`${store.url || 'unknown'}: ${errorMsg}`)
    }
  }

  // 7. Update import status
  await supabase
    .from('imports')
    .update({
      status: errors.length === 0 ? 'success' : 'partial',
      error_message: errors.length > 0 ? errors.join('; ').slice(0, 1000) : null
    })
    .eq('run_id', runId)
    .execute()

  console.log(`[webhook] Processing complete: runId=${runId}, restaurants=${restaurantsCreated}, claims=${claimCodesGenerated}, errors=${errors.length}`)

  return {
    r2Key,
    itemCount: items.length,
    restaurantsCreated,
    claimCodesGenerated
  }
}

/**
 * Normalize and store a single store/restaurant
 */
async function normalizeAndStoreStore(
  env: Env,
  supabase: ReturnType<typeof createSupabaseClient>,
  store: DoorDashScrapedStore
): Promise<{ restaurantCreated: boolean; claimCodeGenerated: boolean }> {
  const sourceUrl = store.url

  if (!sourceUrl) {
    throw new Error('Store has no URL')
  }

  // Strip reviews before any storage
  const strippedStore = stripReviews(store)

  // 1. Find or create restaurant
  let restaurantId: string
  let restaurantCreated = false

  // Check for existing restaurant by source URL
  const existingSource = await supabase
    .from('restaurant_sources')
    .select('restaurant_id')
    .eq('source_url', sourceUrl)
    .single()
    .execute()

  if (existingSource.data) {
    restaurantId = (existingSource.data as { restaurant_id: string }).restaurant_id
    console.log(`[normalize] Found existing restaurant: id=${restaurantId}, url=${sourceUrl}`)
  } else {
    // Create new restaurant
    const restaurantData = {
      name: strippedStore.storeName || 'Unknown Restaurant',
      address1: strippedStore.address?.street || null,
      city: strippedStore.address?.city || null,
      state: strippedStore.address?.state || null,
      zip: strippedStore.address?.zipCode || null,
      phone: strippedStore.phoneNumber || null,
      website: sourceUrl
    }

    const insertResult = await supabase
      .from('restaurants')
      .insert(restaurantData)
      .select('id')
      .single()
      .execute()

    if (insertResult.error || !insertResult.data) {
      throw new Error(`Failed to create restaurant: ${insertResult.error}`)
    }

    restaurantId = (insertResult.data as { id: string }).id
    restaurantCreated = true
    console.log(`[normalize] Created restaurant: id=${restaurantId}, name=${restaurantData.name}`)

    // Create restaurant source
    await supabase.from('restaurant_sources').insert({
      restaurant_id: restaurantId,
      source: 'doordash',
      source_url: sourceUrl,
      external_id: strippedStore.storeId || null,
      last_seen_at: new Date().toISOString()
    }).execute()
  }

  // Update last_seen_at for existing source
  if (!restaurantCreated) {
    await supabase
      .from('restaurant_sources')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('source_url', sourceUrl)
      .execute()
  }

  // 2. Create draft menu
  const draftMenuResult = await supabase
    .from('draft_menus')
    .insert({
      restaurant_id: restaurantId,
      source: 'doordash',
      source_url: sourceUrl,
      status: 'unclaimed'
    })
    .select('id')
    .single()
    .execute()

  if (draftMenuResult.error || !draftMenuResult.data) {
    throw new Error(`Failed to create draft menu: ${draftMenuResult.error}`)
  }

  const draftMenuId = (draftMenuResult.data as { id: string }).id

  // 3. Process menu categories and items
  const menuCategories = strippedStore.menuCategories || []

  // If no menuCategories, try to extract from flat menu array
  if (menuCategories.length === 0 && strippedStore.menu && strippedStore.menu.length > 0) {
    // Group items by category
    const categoryMap = new Map<string, DoorDashScrapedStore['menu']>()
    for (const item of strippedStore.menu) {
      const category = item.category || item.menuCategory || 'Uncategorized'
      if (!categoryMap.has(category)) {
        categoryMap.set(category, [])
      }
      categoryMap.get(category)!.push(item)
    }

    let position = 0
    for (const [categoryName, categoryItems] of categoryMap) {
      menuCategories.push({
        name: categoryName,
        items: categoryItems
      })
    }
  }

  // Insert sections and items
  let sectionPosition = 0
  for (const category of menuCategories) {
    const sectionResult = await supabase
      .from('draft_sections')
      .insert({
        draft_menu_id: draftMenuId,
        position: sectionPosition++,
        name: category.name || 'Uncategorized'
      })
      .select('id')
      .single()
      .execute()

    if (sectionResult.error || !sectionResult.data) {
      console.error(`[normalize] Failed to create section: ${sectionResult.error}`)
      continue
    }

    const sectionId = (sectionResult.data as { id: string }).id

    // Insert items
    const categoryItems = category.items || []
    let itemPosition = 0

    for (const item of categoryItems) {
      const priceCents = parsePriceToCents(item.price)

      await supabase.from('draft_items').insert({
        draft_section_id: sectionId,
        position: itemPosition++,
        name: item.name || 'Unknown Item',
        description: item.description || null,
        price_cents: priceCents,
        image_url: item.imageUrl || null,
        raw: {
          originalPrice: item.price,
          options: item.options,
          nutritionInfo: item.nutritionInfo
        }
      }).execute()
    }
  }

  // 4. Generate claim code if this is a new restaurant
  let claimCodeGenerated = false

  if (restaurantCreated) {
    // Check if claim already exists
    const existingClaim = await supabase
      .from('claims')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .single()
      .execute()

    if (!existingClaim.data) {
      const claimCode = generateClaimCode()
      const codeHash = await sha256(claimCode)

      await supabase.from('claims').insert({
        restaurant_id: restaurantId,
        code_hash: codeHash,
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days
      }).execute()

      claimCodeGenerated = true

      // Log the claim code (only place it's visible)
      console.log(`[claim] Generated claim code for restaurant ${restaurantId}: ${claimCode}`)
    }
  }

  return { restaurantCreated, claimCodeGenerated }
}

/**
 * Record a failed import
 */
async function recordFailedImport(
  env: Env,
  runId: string,
  datasetId: string | undefined,
  eventType: string,
  statusMessage: string | null | undefined
): Promise<void> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[webhook] Cannot record failed import - Supabase not configured')
    return
  }

  const supabase = createSupabaseClient({
    url: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY
  })

  await supabase.from('imports').insert({
    source: 'doordash',
    run_id: runId,
    dataset_id: datasetId || '',
    payload_hash: '',
    r2_key: '',
    status: 'failed',
    error_message: `${eventType}: ${statusMessage || 'No message'}`
  }).execute()

  console.log(`[webhook] Recorded failed import: runId=${runId}, event=${eventType}`)
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  })
}
