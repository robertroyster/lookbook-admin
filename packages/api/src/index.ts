/**
 * Lookbook Admin API
 * Cloudflare Worker for managing photo-first restaurant menus
 */

import { handleCors, corsHeaders } from './middleware/cors'
import { authenticate, AuthContext } from './middleware/auth'
import { handleBrands, handleBrandRegistry } from './routes/brands'
import { handleStoreConfig } from './routes/stores'
import { handleMenu, handleMenuSave, handleMenuUpload } from './routes/menus'
import { handleVersions } from './routes/versions'
import { handleImageUpload } from './routes/images'

export interface Env {
  MENU_BUCKET: R2Bucket
  INTERNAL_BUCKET: R2Bucket
  R2_PUBLIC_URL: string
}

export interface RequestContext {
  env: Env
  auth?: AuthContext
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCors()
    }

    const url = new URL(request.url)
    const path = url.pathname

    try {
      // Health check (no auth)
      if (path === '/api/health') {
        return json({ status: 'ok', timestamp: new Date().toISOString() })
      }

      // Public read routes (no auth required)
      if (request.method === 'GET') {
        // GET /api/brands
        if (path === '/api/brands') {
          return handleBrands(env)
        }

        // GET /api/brands/:brand
        const brandMatch = path.match(/^\/api\/brands\/([^/]+)$/)
        if (brandMatch) {
          return handleBrandRegistry(env, brandMatch[1])
        }

        // GET /api/stores/:brand/:store
        const storeMatch = path.match(/^\/api\/stores\/([^/]+)\/([^/]+)$/)
        if (storeMatch) {
          return handleStoreConfig(env, storeMatch[1], storeMatch[2])
        }

        // GET /api/menus/:brand/:store/:menu
        const menuMatch = path.match(/^\/api\/menus\/([^/]+)\/([^/]+)\/([^/]+)$/)
        if (menuMatch) {
          return handleMenu(env, menuMatch[1], menuMatch[2], menuMatch[3])
        }

        // GET /api/versions/:brand/:store/:menu
        const versionsMatch = path.match(/^\/api\/versions\/([^/]+)\/([^/]+)\/([^/]+)$/)
        if (versionsMatch) {
          return handleVersions(env, versionsMatch[1], versionsMatch[2], versionsMatch[3])
        }
      }

      // Write routes require auth
      if (request.method === 'PUT' || request.method === 'POST') {
        const authResult = await authenticate(request, env)
        if (!authResult.success) {
          return json({ error: authResult.error }, 401)
        }

        const auth = authResult.context!

        // PUT /api/menus/:brand/:store/:menu - save menu (edit)
        if (request.method === 'PUT') {
          const menuMatch = path.match(/^\/api\/menus\/([^/]+)\/([^/]+)\/([^/]+)$/)
          if (menuMatch) {
            // Enforce tenant isolation
            if (menuMatch[1] !== auth.brandSlug) {
              return json({ error: 'Forbidden: brand mismatch' }, 403)
            }
            return handleMenuSave(request, env, auth, menuMatch[1], menuMatch[2], menuMatch[3])
          }
        }

        // POST /api/menus/:brand/:store/:menu/upload - upload full menu
        if (request.method === 'POST') {
          const uploadMatch = path.match(/^\/api\/menus\/([^/]+)\/([^/]+)\/([^/]+)\/upload$/)
          if (uploadMatch) {
            if (uploadMatch[1] !== auth.brandSlug) {
              return json({ error: 'Forbidden: brand mismatch' }, 403)
            }
            return handleMenuUpload(request, env, auth, uploadMatch[1], uploadMatch[2], uploadMatch[3])
          }

          // POST /api/images/:brand - upload image
          const imageMatch = path.match(/^\/api\/images\/([^/]+)$/)
          if (imageMatch) {
            if (imageMatch[1] !== auth.brandSlug) {
              return json({ error: 'Forbidden: brand mismatch' }, 403)
            }
            return handleImageUpload(request, env, auth, imageMatch[1])
          }
        }
      }

      return json({ error: 'Not found' }, 404)
    } catch (error) {
      console.error('Worker error:', error)
      return json({ error: 'Internal server error' }, 500)
    }
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
