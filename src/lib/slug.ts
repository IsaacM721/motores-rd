/**
 * Slug utilities for URL-friendly strings
 * Ported from legacy PHP admin_motorcycles.php
 */

/**
 * Convert text to a URL-friendly slug
 * Handles special characters, accents, and spaces
 */
export function slugify(text: string | null | undefined): string {
  if (!text) {
    return `item-${Date.now()}`;
  }

  let slug = text
    .toString()
    .toLowerCase()
    .trim()
    // Replace accented characters
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Replace special characters with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');

  // If slug is empty after processing, generate a unique one
  if (!slug) {
    slug = `item-${Date.now()}`;
  }

  return slug;
}

/**
 * Convert a slug back to human-readable format
 * e.g., "yamaha-mt-07" -> "Yamaha Mt 07"
 */
export function humanizeSlug(slug: string | null | undefined): string {
  if (!slug) return '';

  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Generate a unique slug by appending a number if needed
 */
export function generateUniqueSlug(
  baseSlug: string,
  existingSlugs: string[]
): string {
  let slug = slugify(baseSlug);
  let counter = 1;

  while (existingSlugs.includes(slug)) {
    slug = `${slugify(baseSlug)}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Create a motorcycle slug from brand and model
 */
export function createMotorcycleSlug(brand: string, model: string): string {
  return slugify(`${brand}-${model}`);
}

/**
 * Parse color names from a comma-separated or pipe-separated string
 * and return as an array
 */
export function parseColors(colorString: string | null | undefined): string[] {
  if (!colorString) return [];

  return colorString
    .split(/[,|]/)
    .map((color) => color.trim())
    .filter((color) => color.length > 0)
    .map((color) => humanizeSlug(slugify(color)));
}

/**
 * Convert color array to a display string
 */
export function formatColors(colors: string[]): string {
  if (!colors || colors.length === 0) return 'N/A';
  return colors.join(', ');
}
