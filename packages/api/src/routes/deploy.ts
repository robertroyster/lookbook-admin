/**
 * Deploy route handler
 * Creates new brands with all required files on R2
 */

import type { Env } from '../index'
import type { AuthContext } from '../middleware/auth'
import { corsHeaders } from '../middleware/cors'

interface DeployBrandRequest {
  brandSlug: string
  brandName: string
  locationSlug: string
  locationName: string
}

/**
 * POST /api/deploy/brand
 * Creates a new brand with its first location
 */
export async function handleDeployBrand(
  request: Request,
  env: Env,
  auth: AuthContext
): Promise<Response> {
  // Only super-admins can deploy
  if (!auth.isSuperAdmin) {
    return json({ error: 'Forbidden: super-admin access required' }, 403)
  }

  try {
    const formData = await request.formData()

    const brandSlug = formData.get('brandSlug')?.toString().trim().toLowerCase()
    const brandName = formData.get('brandName')?.toString().trim()
    const locationSlug = formData.get('locationSlug')?.toString().trim().toLowerCase()
    const locationName = formData.get('locationName')?.toString().trim()
    const logoFile = formData.get('logo') as File | null

    // Validate required fields
    if (!brandSlug || !brandName || !locationSlug || !locationName) {
      return json({ error: 'Missing required fields' }, 400)
    }

    // Validate slugs (alphanumeric only)
    if (!/^[a-z0-9]+$/.test(brandSlug) || !/^[a-z0-9]+$/.test(locationSlug)) {
      return json({ error: 'Slugs must be lowercase alphanumeric only' }, 400)
    }

    // Check if brand already exists
    const existingRegistry = await env.MENU_BUCKET.get(`${brandSlug}/registry.json`)
    if (existingRegistry) {
      return json({ error: `Brand "${brandSlug}" already exists` }, 409)
    }

    const filesCreated: string[] = []

    // 1. Create registry.json
    const registry = {
      brand: { slug: brandSlug, name: brandName },
      defaultStore: locationSlug,
      stores: [
        { slug: locationSlug, name: locationName, file: `${locationSlug}.json` }
      ],
      paths: {
        images: `${brandSlug}/images`,
        placeholder: `${brandSlug}/images/placeholder.jpg`
      }
    }

    await env.MENU_BUCKET.put(
      `${brandSlug}/registry.json`,
      JSON.stringify(registry, null, 2),
      { httpMetadata: { contentType: 'application/json' } }
    )
    filesCreated.push(`${brandSlug}/registry.json`)

    // 2. Create store config
    const storeConfig = {
      slug: locationSlug,
      name: `${brandName} ${locationName}`,
      menus: [
        {
          id: 'dinner',
          label: 'Dinner',
          file: `${brandSlug}/${locationSlug}__dinner.json`
        }
      ]
    }

    await env.MENU_BUCKET.put(
      `${brandSlug}/${locationSlug}.json`,
      JSON.stringify(storeConfig, null, 2),
      { httpMetadata: { contentType: 'application/json' } }
    )
    filesCreated.push(`${brandSlug}/${locationSlug}.json`)

    // 3. Create initial menu
    const initialMenu = {
      meta: {
        brand: brandSlug,
        store: locationSlug,
        menuType: 'dinner',
        title: 'Dinner Menu',
        categoryOrder: ['Appetizers', 'Entrees', 'Desserts']
      },
      items: [
        {
          id: 'sample-item-1',
          name: 'Sample Item',
          category: 'Appetizers',
          price: '$9.99',
          description: 'This is a sample menu item. Edit or replace this item.',
          image: ''
        }
      ]
    }

    await env.MENU_BUCKET.put(
      `${brandSlug}/${locationSlug}__dinner.json`,
      JSON.stringify(initialMenu, null, 2),
      { httpMetadata: { contentType: 'application/json' } }
    )
    filesCreated.push(`${brandSlug}/${locationSlug}__dinner.json`)

    // 4. Upload logo if provided
    if (logoFile && logoFile.size > 0) {
      const logoBuffer = await logoFile.arrayBuffer()
      const logoExt = logoFile.name.split('.').pop() || 'jpg'
      const logoPath = `${brandSlug}/images/logo.${logoExt}`

      await env.MENU_BUCKET.put(logoPath, logoBuffer, {
        httpMetadata: { contentType: logoFile.type }
      })
      filesCreated.push(logoPath)
    }

    // 5. Update brands.json
    const brandsFile = await env.MENU_BUCKET.get('brands.json')
    let brandsData: { brands: Array<{ slug: string; name: string; logo?: string }>; defaultBrand: string }

    if (brandsFile) {
      brandsData = await brandsFile.json()
    } else {
      brandsData = { brands: [], defaultBrand: brandSlug }
    }

    // Check if brand already in list
    const existingBrand = brandsData.brands.find(b => b.slug === brandSlug)
    if (!existingBrand) {
      brandsData.brands.push({
        slug: brandSlug,
        name: brandName,
        logo: `${brandSlug}/images/logo.jpg`
      })

      await env.MENU_BUCKET.put(
        'brands.json',
        JSON.stringify(brandsData, null, 2),
        { httpMetadata: { contentType: 'application/json' } }
      )
      filesCreated.push('brands.json (updated)')
    }

    // 6. Create tenant keys file for the new brand
    const { generateApiKey } = await import('../middleware/auth')
    const newKey = await generateApiKey()

    const keysFile = {
      keys: [
        {
          id: newKey.id,
          hash: newKey.hash,
          createdAt: new Date().toISOString(),
          label: 'Initial key'
        }
      ]
    }

    await env.INTERNAL_BUCKET.put(
      `_tenants/${brandSlug}/keys.json`,
      JSON.stringify(keysFile, null, 2),
      { httpMetadata: { contentType: 'application/json' } }
    )
    filesCreated.push(`_tenants/${brandSlug}/keys.json`)

    return json({
      success: true,
      brandUrl: `/${brandSlug}/${locationSlug}`,
      filesCreated,
      apiKey: newKey.key, // Show once - user should save this
      message: `Brand "${brandName}" deployed successfully. Save the API key - it won't be shown again.`
    })

  } catch (error) {
    console.error('Deploy error:', error)
    return json({ error: 'Deployment failed: ' + (error instanceof Error ? error.message : 'Unknown error') }, 500)
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
