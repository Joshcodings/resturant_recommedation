/**
 * src/lib/landmarks.ts
 * ====================
 * Real landmark utilities for TasteMatch (Feature 4: Near a landmark).
 * Strictly conforms to:
 * - Real data only: extracted from OpenStreetMap, no invented places or coordinates.
 * - Haversine distance calculations and radius filtering.
 * - Graceful fallback when a city has no landmarks.
 */

import type { Landmark } from '@/types/restaurant';

let cachedLandmarks: Landmark[] | null = null;
let loadPromise: Promise<Landmark[]> | null = null;

export const LANDMARK_RADII = [
  { value: 0.5, label: '500m' },
  { value: 1.0, label: '1 km' },
  { value: 2.0, label: '2 km' },
  { value: 5.0, label: '5 km' },
] as const;

export const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  airport: { label: 'Airport', icon: '✈️' },
  university: { label: 'University / College', icon: '🎓' },
  hospital: { label: 'Hospital', icon: '🏥' },
  market: { label: 'Market', icon: '🛒' },
  mall: { label: 'Mall', icon: '🛍️' },
  stadium: { label: 'Stadium / Arena', icon: '🏟️' },
  bus_park: { label: 'Bus Park / Terminal', icon: '🚌' },
  hotel: { label: 'Hotel', icon: '🏨' },
  religious_centre: { label: 'Religious Centre', icon: '🏛️' },
  landmark: { label: 'Landmark', icon: '📍' },
};

/**
 * Calculates great-circle Haversine distance between two coordinates in kilometers.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    typeof lat1 !== 'number' ||
    typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lon2 !== 'number' ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return Infinity;
  }

  const R = 6371.0; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180.0;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Fetches real landmarks data from public dataset.
 */
export async function fetchLandmarks(basePath: string = ''): Promise<Landmark[]> {
  if (cachedLandmarks) return cachedLandmarks;
  if (loadPromise) return loadPromise;

  const url = `${basePath}/data/landmarks_ng.json`.replace(/\/+/g, '/');

  loadPromise = fetch(url)
    .then(async (res) => {
      if (!res.ok) {
        console.warn(`Failed to fetch landmarks from ${url}: HTTP ${res.status}`);
        return [];
      }
      const data = (await res.json()) as Landmark[];
      cachedLandmarks = data;
      return data;
    })
    .catch((err) => {
      console.warn('Could not load landmarks data:', err);
      return [];
    });

  return loadPromise;
}

/**
 * Filters landmarks belonging to the given city (accent- and case-insensitive).
 */
export function getLandmarksForCity(landmarks: Landmark[], cityName: string): Landmark[] {
  if (!cityName || !landmarks.length) return [];
  const target = cityName.trim().toLowerCase();

  return landmarks.filter((lm) => {
    const lmCity = lm.city.toLowerCase();
    return lmCity === target || lmCity.includes(target) || target.includes(lmCity);
  });
}

/**
 * Filters places within the specified radius of the landmark and sorts them by distance ascending.
 */
export function filterAndSortByLandmark<T extends { latitude: number; longitude: number; uid: string }>(
  places: T[],
  landmark: Landmark,
  radiusKm: number
): { place: T; distanceKm: number }[] {
  const withDistance = places
    .map((place) => {
      const distanceKm = haversineDistanceKm(
        landmark.latitude,
        landmark.longitude,
        place.latitude,
        place.longitude
      );
      return { place, distanceKm };
    })
    .filter((item) => item.distanceKm <= radiusKm);

  // Order strictly by distance ascending, tie-break by uid
  withDistance.sort((a, b) => {
    const diff = a.distanceKm - b.distanceKm;
    if (Math.abs(diff) > 0.0001) return diff;
    return a.place.uid.localeCompare(b.place.uid);
  });

  return withDistance;
}

/**
 * Finds the single closest landmark to a given place within an optional maximum distance.
 */
export function findNearestLandmark(
  restaurant: { latitude: number; longitude: number; city?: string },
  landmarks: Landmark[],
  maxRadiusKm: number = 50.0
): { landmark: Landmark; distanceKm: number } | null {
  if (
    !restaurant ||
    typeof restaurant.latitude !== 'number' ||
    typeof restaurant.longitude !== 'number' ||
    restaurant.latitude === 0 ||
    restaurant.longitude === 0 ||
    !landmarks ||
    landmarks.length === 0
  ) {
    return null;
  }

  // Prefer landmarks from the same city if available
  const cityLms = restaurant.city ? getLandmarksForCity(landmarks, restaurant.city) : [];
  const pool = cityLms.length > 0 ? cityLms : landmarks;

  let nearest: Landmark | null = null;
  let minDistance = Infinity;

  for (const lm of pool) {
    const dist = haversineDistanceKm(restaurant.latitude, restaurant.longitude, lm.latitude, lm.longitude);
    if (dist < minDistance && dist <= maxRadiusKm) {
      minDistance = dist;
      nearest = lm;
    }
  }

  if (!nearest || minDistance === Infinity) return null;
  return { landmark: nearest, distanceKm: minDistance };
}

