/**
 * Apify API client for Cloudflare Workers
 */

const APIFY_BASE_URL = 'https://api.apify.com/v2'

export interface ApifyConfig {
  token: string
  actorId: string  // Can be actor ID or task ID
}

export interface ApifyRunResponse {
  data: {
    id: string
    actId: string
    userId: string
    startedAt: string
    finishedAt: string | null
    status: string
    statusMessage: string | null
    defaultDatasetId: string
    defaultKeyValueStoreId: string
    defaultRequestQueueId: string
  }
}

export interface ApifyWebhookPayload {
  userId: string
  createdAt: string
  eventType: 'ACTOR.RUN.SUCCEEDED' | 'ACTOR.RUN.FAILED' | 'ACTOR.RUN.ABORTED' | 'ACTOR.RUN.TIMED_OUT'
  eventData: {
    actorId: string
    actorTaskId: string
    actorRunId: string
  }
  resource: {
    id: string
    actId: string
    userId: string
    startedAt: string
    finishedAt: string | null
    status: string
    statusMessage: string | null
    defaultDatasetId: string
    defaultKeyValueStoreId: string
    defaultRequestQueueId: string
  }
}

export interface DoorDashScrapedItem {
  url?: string
  name?: string
  description?: string
  price?: string | number
  imageUrl?: string
  category?: string
  menuCategory?: string
  options?: unknown[]
  nutritionInfo?: unknown
  // Additional fields from scraper
  [key: string]: unknown
}

export interface DoorDashScrapedStore {
  url?: string
  storeId?: string
  storeName?: string
  storeDescription?: string
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  phoneNumber?: string
  rating?: number
  reviewCount?: number
  priceRange?: string
  categories?: string[]
  hours?: unknown
  menu?: DoorDashScrapedItem[]
  menuCategories?: Array<{
    name?: string
    items?: DoorDashScrapedItem[]
  }>
  // Reviews - will be stripped before storage
  reviews?: unknown[]
  // Additional fields
  [key: string]: unknown
}

/**
 * Start an Apify actor run asynchronously
 */
export async function startApifyTaskRun(
  config: ApifyConfig,
  input: { startUrls: Array<{ url: string }> },
  webhookUrl?: string
): Promise<{ runId: string; defaultDatasetId: string; status: string }> {
  const url = new URL(`${APIFY_BASE_URL}/acts/${config.actorId}/runs`)
  url.searchParams.set('token', config.token)

  // Add webhook if provided
  if (webhookUrl) {
    url.searchParams.set('webhooks', btoa(JSON.stringify([
      {
        eventTypes: ['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED'],
        requestUrl: webhookUrl
      }
    ])))
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Apify API error: ${response.status} - ${errorText}`)
  }

  const result: ApifyRunResponse = await response.json()

  return {
    runId: result.data.id,
    defaultDatasetId: result.data.defaultDatasetId,
    status: result.data.status
  }
}

/**
 * Fetch dataset items from a completed run
 */
export async function fetchDatasetItems(
  token: string,
  datasetId: string
): Promise<DoorDashScrapedStore[]> {
  const url = new URL(`${APIFY_BASE_URL}/datasets/${datasetId}/items`)
  url.searchParams.set('token', token)
  url.searchParams.set('clean', 'true')
  url.searchParams.set('format', 'json')

  const response = await fetch(url.toString())

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Apify dataset fetch error: ${response.status} - ${errorText}`)
  }

  return response.json()
}

/**
 * Get run details by run ID
 */
export async function getRunDetails(
  token: string,
  runId: string
): Promise<ApifyRunResponse['data']> {
  const url = new URL(`${APIFY_BASE_URL}/actor-runs/${runId}`)
  url.searchParams.set('token', token)

  const response = await fetch(url.toString())

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Apify run details error: ${response.status} - ${errorText}`)
  }

  const result: ApifyRunResponse = await response.json()
  return result.data
}

/**
 * Parse DoorDash price string to cents
 * Handles formats like "$12.00", "12.00", "$12", "12"
 */
export function parsePriceToCents(price: string | number | undefined | null): number | null {
  if (price === undefined || price === null) return null

  if (typeof price === 'number') {
    // Assume it's in dollars if it looks reasonable
    return Math.round(price * 100)
  }

  // Remove currency symbols and whitespace
  const cleaned = String(price).replace(/[$\s,]/g, '').trim()

  if (!cleaned || cleaned === '') return null

  const parsed = parseFloat(cleaned)
  if (isNaN(parsed)) return null

  return Math.round(parsed * 100)
}

/**
 * Strip reviews from scraped data (privacy/storage)
 */
export function stripReviews(store: DoorDashScrapedStore): DoorDashScrapedStore {
  const { reviews, ...stripped } = store
  return stripped
}
