import { describe, it, expect } from 'vitest';
import {
  haversineDistanceKm,
  getLandmarksForCity,
  filterAndSortByLandmark,
} from '@/lib/landmarks';
import type { Landmark } from '@/types/restaurant';

describe('Landmarks and Distance calculation (Feature 4)', () => {
  const dummyLandmark: Landmark = {
    uid: 'osm:node/100',
    name: 'Ikotun Terminal',
    category: 'bus_park',
    city: 'Lagos',
    latitude: 6.548011,
    longitude: 3.267787,
  };

  const dummyPlaces = [
    {
      uid: 'osm:node/1',
      restaurant_name: 'Nearby Spot 300m',
      latitude: 6.5495,
      longitude: 3.2690,
    },
    {
      uid: 'osm:node/2',
      restaurant_name: 'Midway Spot 1.2km',
      latitude: 6.5580,
      longitude: 3.2720,
    },
    {
      uid: 'osm:node/3',
      restaurant_name: 'Far Spot 6km',
      latitude: 6.6000,
      longitude: 3.3000,
    },
  ];

  it('computes accurate Haversine distance in kilometers', () => {
    // 0 distance between identical coords
    expect(haversineDistanceKm(6.548011, 3.267787, 6.548011, 3.267787)).toBe(0);

    // Known approximate distance
    const dist = haversineDistanceKm(6.548011, 3.267787, 6.5495, 3.2690);
    expect(dist).toBeGreaterThan(0.1);
    expect(dist).toBeLessThan(0.4);

    // Invalid coords return Infinity
    expect(haversineDistanceKm(NaN, 3.2, 6.5, 3.2)).toBe(Infinity);
  });

  it('filters landmarks by city name (case-insensitive and trimmed)', () => {
    const list: Landmark[] = [
      dummyLandmark,
      {
        uid: 'osm:node/200',
        name: 'National Mosque',
        category: 'religious_centre',
        city: 'Abuja',
        latitude: 9.05,
        longitude: 7.48,
      },
    ];

    const lagosLms = getLandmarksForCity(list, 'Lagos');
    expect(lagosLms).toHaveLength(1);
    expect(lagosLms[0].name).toBe('Ikotun Terminal');

    const abujaLms = getLandmarksForCity(list, 'abuja');
    expect(abujaLms).toHaveLength(1);
    expect(abujaLms[0].name).toBe('National Mosque');

    const empty = getLandmarksForCity(list, 'NonExistentCity');
    expect(empty).toHaveLength(0);
  });

  it('filters and sorts restaurants within specified radius of landmark', () => {
    // Radius 2.0 km: should include Spot 1 (approx 0.2km) and Spot 2 (approx 1.2km), exclude Spot 3 (6km)
    const results = filterAndSortByLandmark(dummyPlaces, dummyLandmark, 2.0);
    expect(results).toHaveLength(2);
    expect(results[0].place.uid).toBe('osm:node/1'); // Closest first
    expect(results[1].place.uid).toBe('osm:node/2');
    expect(results[0].distanceKm).toBeLessThan(results[1].distanceKm);

    // Radius 0.5 km: should only include Spot 1
    const tight = filterAndSortByLandmark(dummyPlaces, dummyLandmark, 0.5);
    expect(tight).toHaveLength(1);
    expect(tight[0].place.uid).toBe('osm:node/1');
  });

  it('gracefully handles empty list or out-of-range radius', () => {
    const none = filterAndSortByLandmark(dummyPlaces, dummyLandmark, 0.05);
    expect(none).toHaveLength(0);
  });
});
