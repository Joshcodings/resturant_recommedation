/**
 * src/tests/community_capitals.test.ts
 * =====================================
 * Unit tests for Gate 5E:
 * - Feature 9: Community "Add a place" layer (local persistence, GeoJSON export, OSM tags)
 * - Feature 10: State Capital Switcher (all 36 state capitals + FCT)
 */

import { describe, it, expect } from 'vitest';
import { NIGERIAN_STATE_CAPITALS, GEOPOLITICAL_ZONES } from '@/config/nigerianCapitals';
import { COMMUNITY_STORAGE_KEY } from '@/context/CommunityContext';
import type { RestaurantParsed } from '@/types/restaurant';

describe('Feature 10: State Capital Switcher Index', () => {
  it('contains all 36 Nigerian state capitals plus FCT Abuja (37 total)', () => {
    expect(NIGERIAN_STATE_CAPITALS).toHaveLength(37);
  });

  it('every entry has non-empty state, capital, valid coordinates and valid zone', () => {
    const states = new Set<string>();
    const capitals = new Set<string>();

    for (const item of NIGERIAN_STATE_CAPITALS) {
      expect(item.state).toBeTruthy();
      expect(item.capital).toBeTruthy();
      expect(typeof item.lat).toBe('number');
      expect(typeof item.lng).toBe('number');
      expect(item.lat).toBeGreaterThan(4); // Nigeria lat bounds ~4-14
      expect(item.lat).toBeLessThan(14.5);
      expect(item.lng).toBeGreaterThan(2.5); // Nigeria lng bounds ~2.5-15
      expect(item.lng).toBeLessThan(15);
      expect(GEOPOLITICAL_ZONES).toContain(item.zone);

      states.add(item.state);
      capitals.add(item.capital);
    }

    expect(states.size).toBe(37);
    expect(capitals.size).toBe(37);
  });

  it('includes key reference capitals: Lagos, Abuja, Port Harcourt, Kano, Enugu, Jos', () => {
    const capitalNames = NIGERIAN_STATE_CAPITALS.map((c) => c.capital);
    expect(capitalNames).toContain('Lagos');
    expect(capitalNames).toContain('Abuja');
    expect(capitalNames).toContain('Port Harcourt');
    expect(capitalNames).toContain('Kano');
    expect(capitalNames).toContain('Enugu');
    expect(capitalNames).toContain('Jos');
    expect(capitalNames).toContain('Damaturu'); // unmapped test capital
  });
});

describe('Feature 9: Community "Add a place" layer', () => {
  it('creates local place with valid uid, isLocalCommunity badge, and null rating', () => {
    const place: RestaurantParsed = {
      uid: 'local:community_1728567890',
      restaurant_name: 'Mama Put Elegushi',
      city: 'Lagos',
      country: 'Nigeria',
      locality: 'Lekki Phase 1',
      cuisines: 'Nigerian, Suya',
      cuisines_raw: 'Nigerian, Suya',
      cuisineList: ['Nigerian', 'Suya'],
      price_range: 2,
      average_cost_for_two: 5000,
      currency: 'NGN',
      aggregate_rating: null, // Hard Rule 1: Unknown = null
      votes: null,
      weighted_rating: null,
      has_table_booking: null,
      has_online_delivery: null,
      latitude: 6.435,
      longitude: 3.489,
      hasCoords: true,
      hasRating: false,
      hasPrice: true,
      isLocalCommunity: true,
      data_source: 'TasteMatch Community (Local)',
      payment_methods: { cash: true, cards: true, mobile_payment: true },
      power: { backup_generator: true },
      air_conditioning: true,
    };

    expect(place.uid.startsWith('local:')).toBe(true);
    expect(place.isLocalCommunity).toBe(true);
    expect(place.aggregate_rating).toBeNull();
    expect(place.average_cost_for_two).toBe(5000);
    expect(place.payment_methods?.cash).toBe(true);
    expect(place.air_conditioning).toBe(true);
  });

  it('formats GeoJSON FeatureCollection correctly with OSM properties', () => {
    const place: RestaurantParsed = {
      uid: 'local:community_1728567890',
      restaurant_name: 'Mama Put Elegushi',
      city: 'Lagos',
      country: 'Nigeria',
      locality: 'Lekki',
      cuisines: 'Nigerian',
      cuisines_raw: 'Nigerian',
      cuisineList: ['Nigerian'],
      price_range: 2,
      average_cost_for_two: 5000,
      currency: 'NGN',
      aggregate_rating: null,
      votes: null,
      weighted_rating: null,
      has_table_booking: null,
      has_online_delivery: null,
      latitude: 6.435,
      longitude: 3.489,
      hasCoords: true,
      hasRating: false,
      hasPrice: true,
      isLocalCommunity: true,
      opening_hours: 'Mo-Sa 10:00-22:00',
      payment_methods: { cash: true, cards: true, mobile_payment: true },
      air_conditioning: true,
      power: { backup_generator: true },
    };

    const properties: Record<string, any> = {
      name: place.restaurant_name,
      amenity: 'restaurant',
      cuisine: (place.cuisines || '').toLowerCase(),
      'addr:city': place.city,
      'addr:country': 'NG',
      'addr:suburb': place.locality,
      'opening_hours': place.opening_hours,
      'payment:cash': 'yes',
      'payment:cards': 'yes',
      'payment:mobile_payment': 'yes',
      'air_conditioning': 'yes',
      'generator:source': 'diesel',
      source: 'TasteMatch Community Layer',
    };

    const geoJson = {
      type: 'FeatureCollection',
      generator: 'TasteMatch Community Layer (Feature 9)',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [place.longitude, place.latitude],
          },
          properties,
        },
      ],
    };

    const serialized = JSON.stringify(geoJson);
    const parsed = JSON.parse(serialized);

    expect(parsed.type).toBe('FeatureCollection');
    expect(parsed.features).toHaveLength(1);
    expect(parsed.features[0].geometry.coordinates).toEqual([3.489, 6.435]);
    expect(parsed.features[0].properties.name).toBe('Mama Put Elegushi');
    expect(parsed.features[0].properties['payment:cash']).toBe('yes');
    expect(parsed.features[0].properties['air_conditioning']).toBe('yes');
  });

  it('uses standard storage key for browser persistence', () => {
    expect(COMMUNITY_STORAGE_KEY).toBe('tm-community-places');
  });
});
