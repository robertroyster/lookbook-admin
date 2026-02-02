/**
 * Crypto utilities for hashing and code generation
 */

/**
 * Compute SHA-256 hash of a string
 */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate a random claim code in format XXXX-XXXX
 */
export function generateClaimCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude confusing chars (0, O, 1, I)
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)

  let code = ''
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-'
    code += chars[bytes[i] % chars.length]
  }
  return code
}

/**
 * Compress data using gzip
 */
export async function gzipCompress(data: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const inputBytes = encoder.encode(data)

  const cs = new CompressionStream('gzip')
  const writer = cs.writable.getWriter()
  writer.write(inputBytes)
  writer.close()

  const chunks: Uint8Array[] = []
  const reader = cs.readable.getReader()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }

  return result.buffer
}
