/**
 * Image routes
 * - POST /api/images/:brand - upload image
 */

import type { Env } from '../index'
import type { AuthContext } from '../middleware/auth'
import { corsHeaders } from '../middleware/cors'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  })
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * POST /api/images/:brand
 * Upload image to public bucket
 *
 * Expects multipart form data with:
 * - file: the image file
 * - filename: desired filename (optional, will sanitize)
 */
export async function handleImageUpload(
  request: Request,
  env: Env,
  auth: AuthContext,
  brand: string
): Promise<Response> {
  try {
    const contentType = request.headers.get('Content-Type') || ''

    if (!contentType.includes('multipart/form-data')) {
      return json({ error: 'Expected multipart/form-data' }, 400)
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    let filename = formData.get('filename') as string | null

    if (!file) {
      return json({ error: 'Missing file in form data' }, 400)
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return json({ error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(', ')}` }, 400)
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return json({ error: `File too large. Max size: ${MAX_SIZE / 1024 / 1024}MB` }, 400)
    }

    // Generate filename if not provided
    if (!filename) {
      const ext = file.type.split('/')[1] || 'jpg'
      filename = `${Date.now()}.${ext}`
    }

    // Sanitize filename
    filename = sanitizeFilename(filename)

    // Upload to R2
    const key = `${brand}/images/${filename}`
    const arrayBuffer = await file.arrayBuffer()

    await env.MENU_BUCKET.put(key, arrayBuffer, {
      httpMetadata: { contentType: file.type }
    })

    const publicUrl = `${env.R2_PUBLIC_URL}/${key}`

    return json({
      success: true,
      filename,
      url: publicUrl,
      size: file.size
    })
  } catch (error) {
    console.error(`Error uploading image for ${brand}:`, error)
    return json({ error: 'Failed to upload image' }, 500)
  }
}

/**
 * Sanitize filename for safe storage
 */
function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
}
