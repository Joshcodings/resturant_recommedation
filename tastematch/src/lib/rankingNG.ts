import type { RestaurantParsed } from '@/types/restaurant';

/**
 * Heuristic weights for ranking unrated restaurants (e.g. Nigerian OSM data).
 * Marked heuristic: These formulas rank by listing completeness, freshness,
 * proximity, and cuisine alignment — never by inferred food quality.
 */
export const HEURISTIC_WEIGHTS = {
  withCuisines: {
    cuisineMatch: 0.45,
    proximity: 0.25,
    listingDetail: 0.20,
    freshness: 0.10,
  },
  withoutCuisines: {
    proximity: 0.50,
    listingDetail: 0.35,
    freshness: 0.15,
  },
} as const;

/**
 * Calculate freshness score from element's last-edit timestamp:
 * freshness = 1 - min(months since last OSM edit, 36) / 36
 * Returns null if timestamp is absent/invalid.
 */
export function computeFreshness(osmTimestamp?: string | null, referenceDate = new Date()): number | null {
  if (!osmTimestamp) return null;
  const editDate = new Date(osmTimestamp);
  if (isNaN(editDate.getTime())) return null;

  const diffMs = referenceDate.getTime() - editDate.getTime();
  if (diffMs < 0) return 1.0; // future or clock skew
  const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.4375);
  const clampedMonths = Math.min(Math.max(0, diffMonths), 36);
  return 1.0 - clampedMonths / 36.0;
}

/**
 * Calculate listing detail completeness:
 * Based on presence of contact, opening hours, address, phone, website, cuisines.
 */
export function computeListingDetail(r: RestaurantParsed): number {
  let fieldsPresent = 0;
  const totalFields = 5;

  if (r.cuisineList && r.cuisineList.length > 0 && r.cuisines !== 'Unspecified') fieldsPresent++;
  if (r.opening_hours) fieldsPresent++;
  if (r.phone) fieldsPresent++;
  if (r.website) fieldsPresent++;
  if (r.address || r.locality) fieldsPresent++;

  return fieldsPresent / totalFields;
}

/**
 * Calculate unrated heuristic score:
 * With cuisines: 0.45 cuisineMatch + 0.25 proximity + 0.20 listingDetail + 0.10 freshness
 * Without cuisines: 0.50 proximity + 0.35 listingDetail + 0.15 freshness
 * If freshness is null, renormalises across the remaining components.
 */
export function computeUnratedScore(params: {
  cuisineMatch: number;
  hasCuisineQuery: boolean;
  proximity: number; // 0–1
  listingDetail: number; // 0–1
  freshness: number | null; // 0–1 or null
}): number {
  const { cuisineMatch, hasCuisineQuery, proximity, listingDetail, freshness } = params;

  if (hasCuisineQuery) {
    if (freshness !== null) {
      return (
        HEURISTIC_WEIGHTS.withCuisines.cuisineMatch * cuisineMatch +
        HEURISTIC_WEIGHTS.withCuisines.proximity * proximity +
        HEURISTIC_WEIGHTS.withCuisines.listingDetail * listingDetail +
        HEURISTIC_WEIGHTS.withCuisines.freshness * freshness
      );
    } else {
      // Renormalise without freshness: sum of remaining weights = 0.45 + 0.25 + 0.20 = 0.90
      const norm = 0.90;
      return (
        (HEURISTIC_WEIGHTS.withCuisines.cuisineMatch / norm) * cuisineMatch +
        (HEURISTIC_WEIGHTS.withCuisines.proximity / norm) * proximity +
        (HEURISTIC_WEIGHTS.withCuisines.listingDetail / norm) * listingDetail
      );
    }
  } else {
    if (freshness !== null) {
      return (
        HEURISTIC_WEIGHTS.withoutCuisines.proximity * proximity +
        HEURISTIC_WEIGHTS.withoutCuisines.listingDetail * listingDetail +
        HEURISTIC_WEIGHTS.withoutCuisines.freshness * freshness
      );
    } else {
      // Renormalise without freshness: sum of remaining weights = 0.50 + 0.35 = 0.85
      const norm = 0.85;
      return (
        (HEURISTIC_WEIGHTS.withoutCuisines.proximity / norm) * proximity +
        (HEURISTIC_WEIGHTS.withoutCuisines.listingDetail / norm) * listingDetail
      );
    }
  }
}
