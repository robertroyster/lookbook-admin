/**
 * Scrape route handler - Admin endpoint to initiate DoorDash scraping
 *
 * POST /api/admin/scrape/dd
 */

import type { Env } from '../index'
import type { AuthContext } from '../middleware/auth'
import { corsHeaders } from '../middleware/cors'
import { startApifyTaskRun } from '../lib/apify'

interface StartScrapeRequest {
  storeUrls: string[]
  eventId?: string
}

interface StartScrapeResponse {
  apifyRunId: string
  defaultDatasetId: string
  status: string
  storeCount: number
  webhookConfigured: boolean
}

/**
 * POST /api/admin/scrape/dd
 * Start a DoorDash scrape run via Apify
 */
export async function handleStartScrape(
  request: Request,
  env: Env,
  auth: AuthContext
): Promise<Response> {
  // Only super-admins can initiate scrapes
  if (!auth.isSuperAdmin) {
    return json({ error: 'Forbidden: super-admin access required' }, 403)
  }

  // Validate environment variables
  if (!env.APIFY_TOKEN || !env.APIFY_ACTOR_ID) {
    return json({ error: 'Apify integration not configured' }, 500)
  }

  try {
    const body: StartScrapeRequest = await request.json()

    // Validate request
    if (!body.storeUrls || !Array.isArray(body.storeUrls) || body.storeUrls.length === 0) {
      return json({ error: 'storeUrls array is required and must not be empty' }, 400)
    }

    // Validate URLs are DoorDash store URLs
    const invalidUrls = body.storeUrls.filter(url => {
      try {
        const parsed = new URL(url)
        return !parsed.hostname.includes('doordash.com')
      } catch {
        return true
      }
    })

    if (invalidUrls.length > 0) {
      return json({
        error: 'Invalid DoorDash URLs provided',
        invalidUrls
      }, 400)
    }

    // Build webhook URL
    const requestUrl = new URL(request.url)
    const webhookUrl = env.APIFY_WEBHOOK_SECRET
      ? `${requestUrl.origin}/api/integrations/apify/webhook?secret=${env.APIFY_WEBHOOK_SECRET}`
      : undefined

    // Start the Apify actor run
    const result = await startApifyTaskRun(
      {
        token: env.APIFY_TOKEN,
        actorId: env.APIFY_ACTOR_ID
      },
      {
        startUrls: body.storeUrls.map(url => ({ url }))
      },
      webhookUrl
    )

    console.log(`[scrape] Started Apify run: runId=${result.runId}, datasetId=${result.defaultDatasetId}, storeCount=${body.storeUrls.length}`)

    const response: StartScrapeResponse = {
      apifyRunId: result.runId,
      defaultDatasetId: result.defaultDatasetId,
      status: result.status,
      storeCount: body.storeUrls.length,
      webhookConfigured: !!webhookUrl
    }

    // If eventId provided, log it for correlation
    if (body.eventId) {
      console.log(`[scrape] Event correlation: eventId=${body.eventId}, runId=${result.runId}`)
    }

    return json(response, 202)
  } catch (error) {
    console.error('[scrape] Error starting scrape:', error)
    return json({
      error: 'Failed to start scrape',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
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
