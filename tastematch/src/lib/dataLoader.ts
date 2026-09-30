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
  }));
}

/**
 * Load and parse restaurants.json exactly once.
 * Uses import.meta.env.BASE_URL so the path resolves correctly on
 * GitHub Pages, Netlify, and Vercel (amendment 7).
 */
export async function loadRestaurants(): Promise<RestaurantParsed[]> {
  if (_data) return _data;
  const url = `${import.meta.env.BASE_URL}data/restaurants.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load restaurants.json: ${res.status}`);
  const raw: Restaurant[] = await res.json();
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
