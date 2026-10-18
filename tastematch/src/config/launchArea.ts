/**
 * tastematch/src/config/launchArea.ts
 * =====================================
 * Configuration and metrics for TasteMatch Launch Area mode.
 * 
 * "One dense area beats a thin country."
 * 
 * Allows configuring a target focus city and neighbourhood (e.g. Ikeja, Victoria Island, Lagos)
 * to concentrate data enrichment efforts, compute real-data completeness meters, and
 * surface a prioritized worklist of the 20 least-complete places for community action.
 */

import type { Restaurant } from '../types/restaurant';
import { validateNigerian234Phone } from '../lib/ownerValidation';

export interface LaunchAreaConfig {
  city: string;
  neighbourhood: string | null;
  enabled: boolean;
}

export const LAUNCH_AREA_CONFIG: LaunchAreaConfig = {
  city: 'Lagos',
  neighbourhood: 'Ikeja',
  enabled: true,
};

export interface CompletenessMetrics {
  totalPlaces: number;
  placesWithCuisine: number;
  pctWithCuisine: number;
  placesWithHours: number;
  pctWithHours: number;
  placesWithPhone: number;
  pctWithPhone: number;
  placesWithWhatsApp: number;
  pctWithWhatsApp: number;
  placesWithLocation: number;
  pctWithLocation: number;
  overallCompletenessPct: number;
}

export interface PlaceCompleteness {
  restaurant: Restaurant;
  missingFields: string[];
  completenessScore: number; // 0 - 5
}

/**
 * Checks if a restaurant belongs to the configured launch area.
 */
export function isInLaunchArea(restaurant: Restaurant, config: LaunchAreaConfig = LAUNCH_AREA_CONFIG): boolean {
  if (!config.enabled) return false;
  
  const cityMatch = (restaurant.city || '').toLowerCase().trim() === config.city.toLowerCase().trim();
  if (!cityMatch) return false;
  
  if (!config.neighbourhood) return true;
  
  const target = config.neighbourhood.toLowerCase().trim();
  const locality = (restaurant.locality || '').toLowerCase().trim();
  const address = (restaurant.address || '').toLowerCase().trim();
  const name = (restaurant.name || '').toLowerCase().trim();
  
  return locality.includes(target) || address.includes(target) || name.includes(target);
}

/**
 * Calculates field completeness for a single restaurant (0 to 5 points).
 */
export function evaluatePlaceCompleteness(restaurant: Restaurant): PlaceCompleteness {
  const missing: string[] = [];
  let score = 0;

  // 1. Cuisine
  const rawCuisines = typeof restaurant.cuisines === 'string' ? restaurant.cuisines : '';
  const cuisineArr: string[] = Array.isArray(restaurant.cuisineList) && restaurant.cuisineList.length > 0
    ? restaurant.cuisineList
    : (Array.isArray(restaurant.cuisines) ? (restaurant.cuisines as string[]) : rawCuisines.split(',').map((s: string) => s.trim()).filter(Boolean));
  const hasCuisine = Boolean(
    cuisineArr.length > 0 &&
    cuisineArr.some((c: string) => c && c.toLowerCase() !== 'unknown' && c.toLowerCase() !== 'unspecified')
  );
  if (hasCuisine) score += 1;
  else missing.push('Cuisine');

  // 2. Opening Hours
  const hasHours = Boolean(restaurant.opening_hours && restaurant.opening_hours.trim().length > 0);
  if (hasHours) score += 1;
  else missing.push('Opening Hours');

  // 3. Phone
  const rawPhone = restaurant.phone || restaurant.telephone;
  const hasPhone = Boolean(rawPhone && rawPhone.trim().length > 0);
  if (hasPhone) score += 1;
  else missing.push('Phone Number');

  // 4. WhatsApp Order capable (validated Nigerian 234 phone or owner WhatsApp)
  const phoneToTest = restaurant.owner_whatsapp || rawPhone;
  const hasWhatsApp = Boolean(phoneToTest && validateNigerian234Phone(phoneToTest).isValid);
  if (hasWhatsApp) score += 1;
  else missing.push('Order on WhatsApp');

  // 5. Confirmed location (valid non-zero coordinates)
  const hasCoords = Boolean(
    restaurant.latitude !== undefined &&
    restaurant.longitude !== undefined &&
    restaurant.latitude !== null &&
    restaurant.longitude !== null &&
    (restaurant.latitude !== 0 || restaurant.longitude !== 0)
  );
  if (hasCoords) score += 1;
  else missing.push('Confirmed Location');

  return {
    restaurant,
    missingFields: missing,
    completenessScore: score,
  };
}

/**
 * Computes exact completeness meter metrics from a set of places in the launch area.
 * Zero invented data. Unknown = null.
 */
export function computeAreaCompleteness(places: Restaurant[]): CompletenessMetrics {
  const total = places.length;
  if (total === 0) {
    return {
      totalPlaces: 0,
      placesWithCuisine: 0,
      pctWithCuisine: 0,
      placesWithHours: 0,
      pctWithHours: 0,
      placesWithPhone: 0,
      pctWithPhone: 0,
      placesWithWhatsApp: 0,
      pctWithWhatsApp: 0,
      placesWithLocation: 0,
      pctWithLocation: 0,
      overallCompletenessPct: 0,
    };
  }

  let withCuisine = 0;
  let withHours = 0;
  let withPhone = 0;
  let withWhatsApp = 0;
  let withLocation = 0;

  for (const p of places) {
    const evalResult = evaluatePlaceCompleteness(p);
    if (!evalResult.missingFields.includes('Cuisine')) withCuisine++;
    if (!evalResult.missingFields.includes('Opening Hours')) withHours++;
    if (!evalResult.missingFields.includes('Phone Number')) withPhone++;
    if (!evalResult.missingFields.includes('Order on WhatsApp')) withWhatsApp++;
    if (!evalResult.missingFields.includes('Confirmed Location')) withLocation++;
  }

  const pct = (count: number) => Math.round((count / total) * 100);
  const overallPct = Math.round(
    ((withCuisine + withHours + withPhone + withWhatsApp + withLocation) / (total * 5)) * 100
  );

  return {
    totalPlaces: total,
    placesWithCuisine: withCuisine,
    pctWithCuisine: pct(withCuisine),
    placesWithHours: withHours,
    pctWithHours: pct(withHours),
    placesWithPhone: withPhone,
    pctWithPhone: pct(withPhone),
    placesWithWhatsApp: withWhatsApp,
    pctWithWhatsApp: pct(withWhatsApp),
    placesWithLocation: withLocation,
    pctWithLocation: pct(withLocation),
    overallCompletenessPct: overallPct,
  };
}

/**
 * Extracts the worklist of the 20 least-complete places in the target area.
 * Places missing the most fields come first.
 */
export function getLeastCompleteWorklist(places: Restaurant[], limit = 20): PlaceCompleteness[] {
  const evaluated = places.map(evaluatePlaceCompleteness);
  
  // Sort by lowest completeness score first (least complete), then deterministically by name / uid
  evaluated.sort((a, b) => {
    if (a.completenessScore !== b.completenessScore) {
      return a.completenessScore - b.completenessScore;
    }
    return (a.restaurant.name || '').localeCompare(b.restaurant.name || '');
  });

  return evaluated.slice(0, limit);
}
