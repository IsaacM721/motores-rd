/**
 * Utility functions for parsing numeric fields
 * Ported from legacy PHP admin_motorcycles.php
 */

export interface PriceRange {
  min: number;
  max: number;
}

/**
 * Parse a price range string into min/max values
 * Handles formats like: "RD$50,000 - RD$75,000", "$50000-75000", "50000"
 */
export function parsePriceRange(priceString: string | null | undefined): PriceRange | null {
  if (!priceString || priceString.trim() === '') {
    return null;
  }

  // Remove currency symbols, spaces, and common separators
  const clean = priceString.replace(/[RD$\s,]/gi, '');

  // Try to match a range (e.g., "50000-75000" or "50000–75000")
  const rangeMatch = clean.match(/(\d+\.?\d*)\s*[-–—]\s*(\d+\.?\d*)/);
  if (rangeMatch) {
    return {
      min: parseFloat(rangeMatch[1]),
      max: parseFloat(rangeMatch[2]),
    };
  }

  // Try to match a single value
  const singleMatch = clean.match(/(\d+\.?\d*)/);
  if (singleMatch) {
    const value = parseFloat(singleMatch[1]);
    return { min: value, max: value };
  }

  return null;
}

/**
 * Parse a numeric value from a string, removing common suffixes
 * Handles formats like: "165 cc", "18.5 Nm", "12L", "150 kg"
 */
export function parseNumeric(
  value: string | null | undefined,
  suffixes: string[] = []
): number | null {
  if (!value || value.trim() === '') {
    return null;
  }

  let clean = value;

  // Remove known suffixes (case-insensitive)
  for (const suffix of suffixes) {
    clean = clean.replace(new RegExp(suffix, 'gi'), '');
  }

  // Remove spaces and commas
  clean = clean.replace(/[\s,]/g, '');

  // Extract the numeric value
  const match = clean.match(/(\d+\.?\d*)/);
  if (match) {
    return parseFloat(match[1]);
  }

  return null;
}

/**
 * Parse engine size from various formats
 * Handles: "150cc", "150 cc", "1500", "1.5L"
 */
export function parseEngineSize(value: string | null | undefined): number | null {
  return parseNumeric(value, ['cc', 'CC', 'Cc', 'cm³', 'cm3']);
}

/**
 * Parse torque value
 * Handles: "15 Nm", "15Nm", "15 nm"
 */
export function parseTorque(value: string | null | undefined): number | null {
  return parseNumeric(value, ['Nm', 'nm', 'NM', 'N·m', 'N.m']);
}

/**
 * Parse fuel capacity
 * Handles: "12L", "12 L", "12 Litros", "12 liters"
 */
export function parseFuelCapacity(value: string | null | undefined): number | null {
  return parseNumeric(value, ['L', 'l', 'Litros', 'litros', 'Liters', 'liters', 'lts']);
}

/**
 * Parse weight value
 * Handles: "150kg", "150 kg", "150 KG"
 */
export function parseWeight(value: string | null | undefined): number | null {
  return parseNumeric(value, ['kg', 'KG', 'Kg', 'kgs', 'kilos']);
}

/**
 * Parse horsepower
 * Handles: "18.76 BHP", "150 HP", "150hp"
 */
export function parseHorsepower(value: string | null | undefined): number | null {
  return parseNumeric(value, ['BHP', 'bhp', 'HP', 'hp', 'CV', 'cv', 'PS', 'ps']);
}

/**
 * Format price for display in Dominican Pesos
 */
export function formatPrice(price: number, currency: string = 'DOP'): string {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Format a price range for display
 */
export function formatPriceRange(range: PriceRange | null, currency: string = 'DOP'): string {
  if (!range) return 'N/A';

  if (range.min === range.max) {
    return formatPrice(range.min, currency);
  }

  return `${formatPrice(range.min, currency)} - ${formatPrice(range.max, currency)}`;
}
