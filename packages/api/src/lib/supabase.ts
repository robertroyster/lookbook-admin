/**
 * Supabase client for Cloudflare Workers
 * Uses direct REST API calls (no supabase-js dependency)
 */

export interface SupabaseConfig {
  url: string
  serviceRoleKey: string
}

export interface SupabaseClient {
  from: (table: string) => QueryBuilder
}

interface QueryBuilder {
  insert: (data: Record<string, unknown> | Record<string, unknown>[]) => QueryBuilder
  update: (data: Record<string, unknown>) => QueryBuilder
  upsert: (data: Record<string, unknown> | Record<string, unknown>[], options?: { onConflict?: string }) => QueryBuilder
  select: (columns?: string) => QueryBuilder
  eq: (column: string, value: unknown) => QueryBuilder
  single: () => QueryBuilder
  execute: () => Promise<{ data: unknown; error: string | null }>
}

/**
 * Create a lightweight Supabase client using REST API
 */
export function createSupabaseClient(config: SupabaseConfig): SupabaseClient {
  const { url, serviceRoleKey } = config

  const baseHeaders = {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }

  return {
    from: (table: string) => {
      let method: 'GET' | 'POST' | 'PATCH' = 'GET'
      let body: unknown = null
      let prefer = 'return=representation'
      const filters: string[] = []
      let selectColumns = '*'
      let isSingle = false

      const builder: QueryBuilder = {
        insert: (data) => {
          method = 'POST'
          body = data
          return builder
        },

        update: (data) => {
          method = 'PATCH'
          body = data
          return builder
        },

        upsert: (data, options) => {
          method = 'POST'
          body = data
          prefer = options?.onConflict
            ? `return=representation,resolution=merge-duplicates`
            : 'return=representation,resolution=merge-duplicates'
          return builder
        },

        select: (columns = '*') => {
          selectColumns = columns
          return builder
        },

        eq: (column, value) => {
          filters.push(`${column}=eq.${encodeURIComponent(String(value))}`)
          return builder
        },

        single: () => {
          isSingle = true
          return builder
        },

        execute: async () => {
          let endpoint = `${url}/rest/v1/${table}`

          const queryParams: string[] = []
          if (selectColumns !== '*') {
            queryParams.push(`select=${encodeURIComponent(selectColumns)}`)
          }
          queryParams.push(...filters)

          if (queryParams.length > 0) {
            endpoint += '?' + queryParams.join('&')
          }

          try {
            const response = await fetch(endpoint, {
              method,
              headers: {
                ...baseHeaders,
                'Prefer': prefer + (isSingle ? ',count=exact' : '')
              },
              body: body ? JSON.stringify(body) : undefined
            })

            if (!response.ok) {
              const errorText = await response.text()
              return { data: null, error: `${response.status}: ${errorText}` }
            }

            const data = await response.json()
            return {
              data: isSingle ? (Array.isArray(data) ? data[0] : data) : data,
              error: null
            }
          } catch (err) {
            return {
              data: null,
              error: err instanceof Error ? err.message : 'Unknown error'
            }
          }
        }
      }

      return builder
    }
  }
}

// Type definitions for database tables

export interface Restaurant {
  id: string
  name: string
  address1: string | null
  city: string | null
  state: string | null
  zip: string | null
  phone: string | null
  website: string | null
  created_at: string
}

export interface RestaurantSource {
  id: string
  restaurant_id: string
  source: string
  source_url: string
  external_id: string | null
  last_seen_at: string
}

export interface DraftMenu {
  id: string
  restaurant_id: string
  source: string
  source_url: string
  status: 'unclaimed' | 'claimed' | 'published'
  created_at: string
}

export interface DraftSection {
  id: string
  draft_menu_id: string
  position: number
  name: string
}

export interface DraftItem {
  id: string
  draft_section_id: string
  position: number
  name: string
  description: string | null
  price_cents: number | null
  image_url: string | null
  raw: Record<string, unknown> | null
}

export interface Import {
  id: string
  source: string
  run_id: string
  dataset_id: string
  payload_hash: string
  r2_key: string
  status: 'pending' | 'processing' | 'success' | 'failed'
  error_message: string | null
  item_count: number | null
  created_at: string
}

export interface Claim {
  id: string
  restaurant_id: string
  code_hash: string
  expires_at: string
  claimed_at: string | null
  created_at: string
}
