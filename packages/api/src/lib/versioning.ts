/**
 * Versioning library
 *
 * Every write creates:
 * 1. Snapshot JSON at /_versions/{brand}/{store}__{menu}/{timestamp}.json
 * 2. Manifest entry at /_versions/{brand}/{store}__{menu}/manifest.json
 * 3. Audit log line at /_logs/{brand}/{store}__{menu}/{date}.jsonl
 */

import type { Env } from '../index'

interface VersionEntry {
  id: string
  type: 'edit' | 'upload'
  timestamp: string
  keyId: string
  itemCount: number
}

interface Manifest {
  current: string
  versions: VersionEntry[]
}

interface AuditEntry {
  type: 'edit' | 'upload'
  versionId: string
  keyId: string
  itemCount: number
}

/**
 * Generate timestamp ID (filesystem-safe)
 */
function generateTimestampId(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

/**
 * Write a version snapshot and update manifest
 */
export async function writeVersion(
  env: Env,
  brand: string,
  store: string,
  menu: string,
  data: unknown,
  type: 'edit' | 'upload',
  keyId: string
): Promise<string> {
  const versionId = generateTimestampId()
  const basePath = `_versions/${brand}/${store}__${menu}`

  // Write snapshot
  const snapshotKey = `${basePath}/${versionId}.json`
  await env.INTERNAL_BUCKET.put(snapshotKey, JSON.stringify(data, null, 2), {
    httpMetadata: { contentType: 'application/json' }
  })

  // Update manifest
  const manifestKey = `${basePath}/manifest.json`
  let manifest: Manifest = { current: versionId, versions: [] }

  // Try to load existing manifest
  const existingManifest = await env.INTERNAL_BUCKET.get(manifestKey)
  if (existingManifest) {
    try {
      manifest = await existingManifest.json()
    } catch {
      // Start fresh if manifest is corrupted
    }
  }

  // Add new version entry
  const entry: VersionEntry = {
    id: versionId,
    type,
    timestamp: new Date().toISOString(),
    keyId,
    itemCount: Array.isArray((data as { items?: unknown[] }).items)
      ? (data as { items: unknown[] }).items.length
      : 0
  }

  manifest.current = versionId
  manifest.versions.unshift(entry) // Newest first

  // Keep only last 100 versions in manifest
  if (manifest.versions.length > 100) {
    manifest.versions = manifest.versions.slice(0, 100)
  }

  await env.INTERNAL_BUCKET.put(manifestKey, JSON.stringify(manifest, null, 2), {
    httpMetadata: { contentType: 'application/json' }
  })

  return versionId
}

/**
 * Append to audit log (JSONL format)
 */
export async function appendAuditLog(
  env: Env,
  brand: string,
  store: string,
  menu: string,
  entry: AuditEntry
): Promise<void> {
  const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const logKey = `_logs/${brand}/${store}__${menu}/${date}.jsonl`

  const logEntry = {
    ...entry,
    timestamp: new Date().toISOString()
  }

  // Try to append to existing log
  const existingLog = await env.INTERNAL_BUCKET.get(logKey)
  let content = ''

  if (existingLog) {
    content = await existingLog.text()
  }

  content += JSON.stringify(logEntry) + '\n'

  await env.INTERNAL_BUCKET.put(logKey, content, {
    httpMetadata: { contentType: 'application/x-ndjson' }
  })
}

/**
 * Get a specific version snapshot
 */
export async function getVersion(
  env: Env,
  brand: string,
  store: string,
  menu: string,
  versionId: string
): Promise<unknown | null> {
  const key = `_versions/${brand}/${store}__${menu}/${versionId}.json`
  const object = await env.INTERNAL_BUCKET.get(key)

  if (!object) {
    return null
  }

  return object.json()
}
