import type { Restaurant, RestaurantParsed } from '@/types/restaurant';

let _data: RestaurantParsed[] | null = null;

/** Parse the raw JSON and add `cuisineList` and `hasCoords`. */
function parseRestaurants(raw: Restaurant[]): RestaurantParsed[] {
  return raw.map(r => ({
    ...r,
    cuisineList: r.cuisines
      .split(',')
      .map(c => c.trim())
      .filter(Boolean),
    hasCoords: !!(r.latitude && r.longitude && r.latitude !== 0 && r.longitude !== 0),
    hasRating: typeof r.aggregate_rating === 'number' && r.aggregate_rating !== null,
    hasPrice: typeof r.price_range === 'number' && r.price_range !== null,
  }));
}

export async function loadRestaurants(): Promise<RestaurantParsed[]> {
  if (_data) return _data;
  
  // 1. Load original Zomato data
  const baseUrl = import.meta.env.BASE_URL;
  const res = await fetch(`${baseUrl}data/restaurants.json`);
  if (!res.ok) throw new Error(`Failed to load restaurants.json: ${res.status}`);
  const raw: Restaurant[] = await res.json();
  
  // 2. Discover extra datasets via manifest
  try {
    const manifestRes = await fetch(`${baseUrl}data/manifest.json`);
    if (manifestRes.ok) {
      const manifest = await manifestRes.json();
      for (const entry of manifest) {
        if (entry.file) {
          try {
            const extraRes = await fetch(`${baseUrl}data/${entry.file}`);
            if (extraRes.ok) {
              const extraData = await extraRes.json();
              raw.push(...extraData);
            } else {
              console.warn(`Failed to load extra dataset ${entry.file}: ${extraRes.status}`);
            }
          } catch (err) {
            console.warn(`Error loading extra dataset ${entry.file}:`, err);
          }
        }
      }
    }
  } catch (err) {
    console.warn('No valid manifest.json found, or failed to parse. Proceeding with base data only.');
  }

  _data = parseRestaurants(raw);
  return _data;
}

/** Build a lookup index: country → cities (sorted). */
export function buildCountryCityIndex(data: RestaurantParsed[]): Record<string, string[]> {
  const map: Record<string, Set<string>> = {};
  for (const r of data) {
    if (!map[r.country]) map[r.country] = new Set();
    map[r.country].add(r.city);
  }
  return Object.fromEntries(
    Object.entries(map).map(([country, cities]) => [country, [...cities].sort()])
  );
}

/** Get all unique cuisines available in a specific city (sorted). */
export function getCityCuisines(data: RestaurantParsed[], city: string): string[] {
  const set = new Set<string>();
  for (const r of data) {
    if (r.city === city) {
      for (const c of r.cuisineList) set.add(c);
    }
  }
  return [...set].sort();
}

/**
 * Count rated restaurants in a city (amendment 6: dynamic, never hard-coded).
 */
export function getCityCount(data: RestaurantParsed[], city: string): number {
  return data.filter(r => r.city === city).length;
}
