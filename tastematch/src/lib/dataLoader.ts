import type { Restaurant, RestaurantParsed } from '@/types/restaurant';

let _data: RestaurantParsed[] | null = null;

export function deriveUid(r: Partial<Restaurant> & { source_id?: string | null; data_source?: string | null }): string {
  if (r.uid) return r.uid;
  if (r.source_id) {
    const prefix = r.data_source === 'OpenStreetMap' || !r.data_source ? 'osm' : r.data_source.toLowerCase();
    return `${prefix}:${r.source_id}`;
  }
  if (typeof r.restaurant_id === 'number') {
    if (r.restaurant_id >= 10_000_000_000_000) {
      const rem = r.restaurant_id - 10_000_000_000_000;
      const typeCode = rem % 10;
      const osmId = Math.floor(rem / 10);
      const typeStr = typeCode === 1 ? 'node' : typeCode === 2 ? 'way' : 'relation';
      return `osm:${typeStr}/${osmId}`;
    }
    return `zomato:${r.restaurant_id}`;
  }
  return `unknown:${Math.random().toString(36).slice(2, 9)}`;
}

/** Parse the raw JSON and add `cuisineList`, `hasCoords`, and derive `uid`. */
export function parseRestaurants(raw: Restaurant[]): RestaurantParsed[] {
  return raw.map(r => ({
    ...r,
    uid: deriveUid(r),
    cuisineList: (r.cuisines || '')
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

/**
 * Dynamically compute the largest city by place count in a country.
 * Never hard-coded (Rule 3).
 */
export function computeLargestCity(data: RestaurantParsed[], country: string): string {
  const cityCounts: Record<string, number> = {};
  for (const r of data) {
    if (r.country === country) {
      cityCounts[r.city] = (cityCounts[r.city] || 0) + 1;
    }
  }
  let maxCount = -1;
  let largest = '';
  for (const [city, count] of Object.entries(cityCounts)) {
    if (count > maxCount) {
      maxCount = count;
      largest = city;
    }
  }
  return largest;
}

// ─── Sharded Architecture Dynamic Loader ─────────────────────────────────────

export interface CountryMetadata {
  code: string;
  name: string;
  status: string;
  places: number;
  cities: number;
  retrieved_at: string;
  sources: string[];
  licence: string;
  attribution: string;
  data_base_url: string;
}

export interface CityIndexItem {
  count: number;
  hasPrices: boolean;
  hasRatings: boolean;
  hasBooking: boolean;
  hasDelivery: boolean;
  hasHours: boolean;
  shards: string[];
}

export interface CountryIndexData {
  country: string;
  code: string;
  cities: Record<string, CityIndexItem>;
}

let _countriesCache: CountryMetadata[] | null = null;
const _countryIndexCache = new Map<string, CountryIndexData>();
// LRU Cache: keep last 5 cities loaded in memory
const _cityCache = new Map<string, RestaurantParsed[]>();
const MAX_CACHED_CITIES = 5;

async function fetchWithRetry<T>(url: string, retries = 2, delayMs = 300): Promise<T> {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return await res.json();
    } catch (err) {
      attempt++;
      if (attempt > retries) throw err;
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries`);
}

/** Load countries catalog (countries.json) */
export async function loadCountries(): Promise<CountryMetadata[]> {
  if (_countriesCache) return _countriesCache;
  const baseUrl = import.meta.env.BASE_URL;
  _countriesCache = await fetchWithRetry<CountryMetadata[]>(`${baseUrl}data/countries.json`);
  return _countriesCache;
}

/** Load city index with capabilities for a specific country (e.g. countries/NG.json) */
export async function loadCountryIndex(countryCode: string): Promise<CountryIndexData> {
  const upper = countryCode.toUpperCase();
  if (_countryIndexCache.has(upper)) return _countryIndexCache.get(upper)!;

  const baseUrl = import.meta.env.BASE_URL;
  const index = await fetchWithRetry<CountryIndexData>(`${baseUrl}data/countries/${upper}.json`);
  _countryIndexCache.set(upper, index);
  return index;
}

/** Load shards for a specific city, managing LRU cache (last 5 cities) */
export async function loadCityShards(
  countryCode: string,
  city: string,
  shardFiles: string[],
): Promise<RestaurantParsed[]> {
  const cacheKey = `${countryCode.toUpperCase()}:${city}`;
  if (_cityCache.has(cacheKey)) {
    // Refresh LRU order: delete and re-insert
    const existing = _cityCache.get(cacheKey)!;
    _cityCache.delete(cacheKey);
    _cityCache.set(cacheKey, existing);
    return existing;
  }

  const baseUrl = import.meta.env.BASE_URL;
  const rawList: Restaurant[] = [];

  for (const filename of shardFiles) {
    const shardUrl = `${baseUrl}data/shards/${countryCode.toUpperCase()}/${filename}`;
    const chunk = await fetchWithRetry<Restaurant[]>(shardUrl);
    rawList.push(...chunk);
  }

  const parsed = parseRestaurants(rawList);

  // Evict oldest if cache exceeds limit
  if (_cityCache.size >= MAX_CACHED_CITIES) {
    const oldestKey = _cityCache.keys().next().value;
    if (oldestKey) _cityCache.delete(oldestKey);
  }

  _cityCache.set(cacheKey, parsed);
  return parsed;
}

