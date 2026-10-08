import type { RestaurantParsed } from '@/types/restaurant';

export interface CityCapabilities {
  hasRatings: boolean;
  hasPrices: boolean;
  hasCuisines: boolean;
  hasBooking: boolean;
  hasLocalities: boolean;
}

/**
 * Compute per-city capabilities dynamically from the dataset.
 * - hasRatings: >= 20% of records have a rating
 * - hasPrices: >= 20% of records have a price range
 * - hasCuisines: >= 15% of records have cuisines (heuristic)
 * - hasBooking: > 0 records have table booking info
 * - hasLocalities: >= 3 localities with >= 5 places each
 */
export function computeCityCapabilities(cityData: RestaurantParsed[]): CityCapabilities {
  if (cityData.length === 0) {
    return { hasRatings: false, hasPrices: false, hasCuisines: false, hasBooking: false, hasLocalities: false };
  }

  let ratingCount = 0;
  let priceCount = 0;
  let cuisineCount = 0;
  let bookingCount = 0;
  const locCounts: Record<string, number> = {};

  for (const r of cityData) {
    if (r.hasRating) ratingCount++;
    if (r.hasPrice) priceCount++;
    if (r.cuisineList.length > 0 && r.cuisines !== 'Unspecified') cuisineCount++;
    if (r.has_table_booking !== null) bookingCount++;
    if (r.locality) {
      locCounts[r.locality] = (locCounts[r.locality] || 0) + 1;
    }
  }

  const locsOver5 = Object.values(locCounts).filter(count => count >= 5).length;

  return {
    hasRatings: ratingCount / cityData.length >= 0.2,
    hasPrices: priceCount / cityData.length >= 0.2,
    hasCuisines: cuisineCount / cityData.length >= 0.15,
    hasBooking: bookingCount > 0,
    hasLocalities: locsOver5 >= 3,
  };
}
