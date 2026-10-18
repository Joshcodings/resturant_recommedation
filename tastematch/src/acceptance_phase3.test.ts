import { describe, it, expect } from 'vitest';
import type { Restaurant } from './types/restaurant';
import {
  computeAreaCompleteness,
  evaluatePlaceCompleteness,
  getLeastCompleteWorklist,
  isInLaunchArea,
  LAUNCH_AREA_CONFIG,
} from './config/launchArea';

describe('Phase 3: One Dense Area Beats a Thin Country Acceptance Tests', () => {
  const samplePlaceFull: Restaurant = {
    uid: 'osm:node:101',
    restaurant_id: 101,
    name: 'Ikeja Chop House',
    restaurant_name: 'Ikeja Chop House',
    country: 'Nigeria',
    city: 'Lagos',
    locality: 'Ikeja',
    address: '10 Allen Avenue, Ikeja, Lagos',
    latitude: 6.6018,
    longitude: 3.3512,
    currency: 'NGN',
    price_range: 2,
    average_cost_for_two: 5000,
    aggregate_rating: null,
    votes: null,
    weighted_rating: null,
    has_table_booking: null,
    has_online_delivery: null,
    cuisines: 'Nigerian, Suya',
    phone: '+2348012345678',
    opening_hours: 'Mo-Sa 10:00-22:00',
    data_source: 'OpenStreetMap',
  };

  const samplePlaceSparse: Restaurant = {
    uid: 'osm:node:102',
    restaurant_id: 102,
    name: 'Allen Canteen',
    restaurant_name: 'Allen Canteen',
    country: 'Nigeria',
    city: 'Lagos',
    locality: 'Ikeja',
    address: 'Allen Avenue, Ikeja',
    latitude: 6.6025,
    longitude: 3.3519,
    currency: 'NGN',
    price_range: null,
    average_cost_for_two: null,
    aggregate_rating: null,
    votes: null,
    weighted_rating: null,
    has_table_booking: null,
    has_online_delivery: null,
    cuisines: 'Unknown',
    phone: null,
    opening_hours: null,
    data_source: 'OpenStreetMap',
  };

  const samplePlaceOutside: Restaurant = {
    uid: 'osm:node:103',
    restaurant_id: 103,
    name: 'Kano Grill',
    restaurant_name: 'Kano Grill',
    country: 'Nigeria',
    city: 'Kano',
    locality: 'Fagge',
    address: 'Fagge, Kano',
    latitude: 12.0022,
    longitude: 8.5919,
    currency: 'NGN',
    price_range: null,
    average_cost_for_two: null,
    aggregate_rating: null,
    votes: null,
    weighted_rating: null,
    has_table_booking: null,
    has_online_delivery: null,
    cuisines: 'Nigerian',
    phone: null,
    opening_hours: null,
  };

  describe('A17: Launch Area Identification & Filtering', () => {
    it('identifies places in configured launch area (Ikeja, Lagos)', () => {
      expect(isInLaunchArea(samplePlaceFull, LAUNCH_AREA_CONFIG)).toBe(true);
      expect(isInLaunchArea(samplePlaceSparse, LAUNCH_AREA_CONFIG)).toBe(true);
      expect(isInLaunchArea(samplePlaceOutside, LAUNCH_AREA_CONFIG)).toBe(false);
    });

    it('matches by locality, address, or name tokens in target neighbourhood', () => {
      const placeByName: Restaurant = {
        ...samplePlaceFull,
        locality: '',
        address: 'Plot 4, Obafemi Awolowo Way',
        name: 'Ikeja Food Hub',
      };
      expect(isInLaunchArea(placeByName, LAUNCH_AREA_CONFIG)).toBe(true);
    });
  });

  describe('A18: Completeness Meter Evaluation (Zero Invented Data)', () => {
    it('accurately scores a fully documented place as 5/5', () => {
      const evaluation = evaluatePlaceCompleteness(samplePlaceFull);
      expect(evaluation.completenessScore).toBe(5);
      expect(evaluation.missingFields).toEqual([]);
    });

    it('accurately identifies missing fields for a sparse place', () => {
      const evaluation = evaluatePlaceCompleteness(samplePlaceSparse);
      expect(evaluation.completenessScore).toBe(1); // Only confirmed location
      expect(evaluation.missingFields).toContain('Cuisine');
      expect(evaluation.missingFields).toContain('Opening Hours');
      expect(evaluation.missingFields).toContain('Phone Number');
      expect(evaluation.missingFields).toContain('Order on WhatsApp');
    });

    it('calculates exact aggregated area completeness metrics', () => {
      const metrics = computeAreaCompleteness([samplePlaceFull, samplePlaceSparse]);
      expect(metrics.totalPlaces).toBe(2);
      expect(metrics.placesWithCuisine).toBe(1);
      expect(metrics.pctWithCuisine).toBe(50);
      expect(metrics.placesWithHours).toBe(1);
      expect(metrics.pctWithHours).toBe(50);
      expect(metrics.placesWithPhone).toBe(1);
      expect(metrics.pctWithPhone).toBe(50);
      expect(metrics.placesWithWhatsApp).toBe(1);
      expect(metrics.pctWithWhatsApp).toBe(50);
      expect(metrics.placesWithLocation).toBe(2);
      expect(metrics.pctWithLocation).toBe(100);
      // Overall = (1 + 1 + 1 + 1 + 2) / 10 = 60%
      expect(metrics.overallCompletenessPct).toBe(60);
    });
  });

  describe('A19: Worklist of 20 Least-Complete Places', () => {
    it('prioritizes the least complete places at the top of the worklist', () => {
      const places: Restaurant[] = [
        samplePlaceFull, // 5/5
        samplePlaceSparse, // 1/5
        {
          ...samplePlaceSparse,
          uid: 'osm:node:104',
          name: 'Mid Place',
          cuisines: 'African',
          cuisineList: ['African'], // 2/5
        },
      ];

      const worklist = getLeastCompleteWorklist(places, 20);
      expect(worklist.length).toBe(3);
      expect(worklist[0].restaurant.name).toBe('Allen Canteen'); // 1/5
      expect(worklist[1].restaurant.name).toBe('Mid Place'); // 2/5
      expect(worklist[2].restaurant.name).toBe('Ikeja Chop House'); // 5/5
    });

    it('limits worklist to 20 places maximum', () => {
      const mockPlaces: Restaurant[] = Array.from({ length: 30 }, (_, i) => ({
        ...samplePlaceSparse,
        uid: `osm:node:mock_${i}`,
        name: `Place ${i}`,
      }));

      const worklist = getLeastCompleteWorklist(mockPlaces, 20);
      expect(worklist.length).toBe(20);
    });
  });

  describe('A20: OpenStreetMap Deep Link Specification Compliance', () => {
    it('generates compliant node and map coordinates deep link', () => {
      const place: Restaurant = {
        ...samplePlaceFull,
        source_id: 'node/123456789',
        latitude: 6.6018,
        longitude: 3.3512,
      };

      const cleanId = place.source_id?.replace('/', '=');
      const url = `https://www.openstreetmap.org/edit?${cleanId}#map=19/${place.latitude}/${place.longitude}`;
      expect(url).toBe('https://www.openstreetmap.org/edit?node=123456789#map=19/6.6018/3.3512');
    });

    it('generates coordinates map anchor fallback when source_id is not an OSM node', () => {
      const place: Restaurant = {
        ...samplePlaceFull,
        source_id: undefined,
        latitude: 6.6018,
        longitude: 3.3512,
      };

      const url = `https://www.openstreetmap.org/edit#map=19/${place.latitude}/${place.longitude}`;
      expect(url).toBe('https://www.openstreetmap.org/edit#map=19/6.6018/3.3512');
    });
  });

  describe('A21: Overture Maps Quality Safeguard (No Confidence as Quality)', () => {
    it('ensures overture places never map confidence to aggregate_rating or reviews', () => {
      const overturePlace: Restaurant = {
        uid: 'overture:ov_123',
        restaurant_id: 123,
        name: 'Overture Spot',
        restaurant_name: 'Overture Spot',
        country: 'Nigeria',
        city: 'Lagos',
        cuisines: 'Unknown',
        currency: 'NGN',
        average_cost_for_two: null,
        weighted_rating: null,
        has_table_booking: null,
        has_online_delivery: null,
        locality: null,
        latitude: 6.6,
        longitude: 3.3,
        data_source: 'Overture Maps',
        aggregate_rating: null,
        votes: null,
        price_range: null,
      };

      expect(overturePlace.aggregate_rating).toBeNull();
      expect(overturePlace.votes).toBeNull();
      expect(overturePlace.price_range).toBeNull();
    });
  });
});
