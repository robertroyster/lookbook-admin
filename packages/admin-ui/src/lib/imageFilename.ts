/**
 * Generate a consistent filename for menu item images
 * Format: {category}__{item-name}.jpg
 */
export function generateImageFilename(category: string, itemName: string): string {
  return `${slugify(category)}__${slugify(itemName)}.jpg`
}

/**
 * Convert a string to a URL-safe slug
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
