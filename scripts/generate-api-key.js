#!/usr/bin/env node
/**
 * Generate API key for Lookbook Admin
 *
 * Usage:
 *   node scripts/generate-api-key.js <brand>
 *   node scripts/generate-api-key.js ruckus
 *   node scripts/generate-api-key.js ruckus "Main admin key"
 *
 * Output:
 *   - Raw API key (save this securely, shown only once)
 *   - keys.json content to upload to R2
 */

const crypto = require('crypto')

const brand = process.argv[2]
const label = process.argv[3] || 'Admin key'

if (!brand) {
  console.error('Usage: node scripts/generate-api-key.js <brand> [label]')
  console.error('Example: node scripts/generate-api-key.js ruckus "Main admin key"')
  process.exit(1)
}

// Generate random key
const randomBytes = crypto.randomBytes(32)
const apiKey = 'lbk_' + randomBytes.toString('hex')

// Hash the key
const hash = crypto.createHash('sha256').update(apiKey).digest('hex')

// Generate key ID from first 12 chars
const keyId = 'key_' + apiKey.slice(4, 16)

// Create keys.json structure
const keysJson = {
  keys: [
    {
      id: keyId,
      hash: hash,
      label: label,
      createdAt: new Date().toISOString()
    }
  ]
}

console.log('\n' + '='.repeat(60))
console.log('API KEY GENERATED FOR BRAND:', brand.toUpperCase())
console.log('='.repeat(60))

console.log('\n🔑 RAW API KEY (save this - shown only once!):')
console.log('\n   ' + apiKey)

console.log('\n📁 Upload this to R2:')
console.log(`   Bucket: menumanager-internal`)
console.log(`   Path:   _tenants/${brand}/keys.json`)

console.log('\n📋 keys.json content:')
console.log('\n' + JSON.stringify(keysJson, null, 2))

console.log('\n📤 Wrangler upload command:')
console.log(`
   # Save the JSON to a temp file first:
   cat << 'EOF' > /tmp/keys.json
${JSON.stringify(keysJson, null, 2)}
EOF

   # Upload to R2:
   wrangler r2 object put menumanager-internal/_tenants/${brand}/keys.json \\
     --file /tmp/keys.json \\
     --content-type "application/json"
`)

console.log('='.repeat(60))
console.log('⚠️  Store the API key securely - it cannot be recovered!')
console.log('='.repeat(60) + '\n')
