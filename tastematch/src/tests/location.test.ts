import { describe, it, expect } from 'vitest';
import {
  haversineDistance,
  isValidCoordinate,
  computeCentroid,
  formatDistance,
} from '@/lib/location';

describe('Location Intelligence (Haversine & Coordinates)', () => {
  it('validates coordinates accurately', () => {
    expect(isValidCoordinate(28.6139, 77.2090)).toBe(true);
    expect(isValidCoordinate(0, 0)).toBe(false); // 0,0 is invalid/missing in this dataset
    expect(isValidCoordinate(NaN, 77.2)).toBe(false);
    expect(isValidCoordinate(95.0, 77.2)).toBe(false); // Latitude out of range
    expect(isValidCoordinate(28.6, 200.0)).toBe(false); // Longitude out of range
  });

  it('calculates accurate Haversine distance between real coordinates', () => {
    // Connaught Place (28.6315, 77.2167) to India Gate (28.6129, 77.2295) in New Delhi ~ 2.4 km
    const dist = haversineDistance(28.6315, 77.2167, 28.6129, 77.2295);
    expect(dist).toBeGreaterThan(2.0);
    expect(dist).toBeLessThan(2.8);
  });

  it('returns 0 distance for identical coordinates', () => {
    const dist = haversineDistance(28.5, 77.2, 28.5, 77.2);
    expect(dist).toBe(0);
  });

  it('returns Infinity if coordinates are invalid or missing', () => {
    expect(haversineDistance(0, 0, 28.5, 77.2)).toBe(Infinity);
    expect(haversineDistance(28.5, 77.2, NaN, 77.2)).toBe(Infinity);
  });

  it('computes centroid correctly for cluster of points', () => {
    const points = [
      { latitude: 28.6, longitude: 77.2 },
      { latitude: 28.8, longitude: 77.4 },
    ];
    const centroid = computeCentroid(points);
    expect(centroid).not.toBeNull();
    expect(centroid!.latitude).toBeCloseTo(28.7, 2);
    expect(centroid!.longitude).toBeCloseTo(77.3, 2);
  });

  it('formats distance nicely for meters and kilometers', () => {
    expect(formatDistance(0.4)).toBe('400 m');
    expect(formatDistance(2.35)).toBe('2.4 km');
    expect(formatDistance(Infinity)).toBe('');
  });
});
