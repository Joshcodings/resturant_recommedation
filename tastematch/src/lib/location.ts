/**
 * Location intelligence utilities using the Haversine formula
 * for computing distances across geographical coordinates.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_KM = 6371;

/**
 * Calculates the great-circle distance between two points in kilometers
 * using the Haversine formula.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  if (
    !isValidCoordinate(lat1, lon1) ||
    !isValidCoordinate(lat2, lon2)
  ) {
    return Infinity;
  }

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_KM * c * 10) / 10; // Rounded to 1 decimal
}

/**
 * Validates whether latitude and longitude are valid non-zero values
 */
export function isValidCoordinate(lat: number, lon: number): boolean {
  if (typeof lat !== 'number' || typeof lon !== 'number') return false;
  if (isNaN(lat) || isNaN(lon)) return false;
  if (lat === 0 && lon === 0) return false;
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

/**
 * Computes the geographic centroid of a group of restaurants with valid coordinates
 */
export function computeCentroid(
  items: Array<{ latitude: number; longitude: number; hasCoords?: boolean }>,
): Coordinates | null {
  const valid = items.filter(i => isValidCoordinate(i.latitude, i.longitude));
  if (valid.length === 0) return null;

  const sumLat = valid.reduce((acc, curr) => acc + curr.latitude, 0);
  const sumLon = valid.reduce((acc, curr) => acc + curr.longitude, 0);

  return {
    latitude: Math.round((sumLat / valid.length) * 1e6) / 1e6,
    longitude: Math.round((sumLon / valid.length) * 1e6) / 1e6,
  };
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
  if (!isFinite(distanceKm)) return '';
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}
