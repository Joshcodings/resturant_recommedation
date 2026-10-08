import { describe, it, expect } from 'vitest';
import { recommend } from '../lib/recommendation';
import type { RestaurantParsed } from '../types/restaurant';

// Synthetic Nigeria-like fixtures (clearly marked fake, never shipped)
const MOCK_NIGERIA_DATA: RestaurantParsed[] = [
  {
    restaurant_id: 10000000000001,
    restaurant_name: 'Fake Suya Spot',
    country: 'Nigeria',
    city: 'Lagos',
    locality: 'Ikeja',
    cuisines: 'Nigerian, Grill',
    cuisineList: ['Nigerian', 'Grill'],
    average_cost_for_two: null,
    currency: 'NGN',
    has_table_booking: null,
    has_online_delivery: null,
    aggregate_rating: null,
    price_range: null,
    votes: null,
    weighted_rating: null,
    latitude: 6.5244,
    longitude: 3.3792,
    hasCoords: true,
    hasRating: false,
    hasPrice: false,
    opening_hours: 'Mo-Su 10:00-22:00',
    phone: '+234 123 456 7890',
  },
  {
    restaurant_id: 10000000000002,
    restaurant_name: 'Fake Buka',
    country: 'Nigeria',
    city: 'Lagos',
    locality: 'Yaba',
    cuisines: 'Nigerian',
    cuisineList: ['Nigerian'],
    average_cost_for_two: null,
    currency: 'NGN',
    has_table_booking: null,
    has_online_delivery: null,
    aggregate_rating: null,
    price_range: null,
    votes: null,
    weighted_rating: null,
    latitude: 6.5095,
    longitude: 3.3711,
    hasCoords: true,
    hasRating: false,
    hasPrice: false,
  },
];

describe('Null Safety in Recommendation Engine', () => {
  it('should recommend without crashing and format nulls safely', () => {
    const res = recommend(MOCK_NIGERIA_DATA, {
      country: 'Nigeria',
      city: 'Lagos',
      priceRange: null, // any price
      cuisines: ['Nigerian'],
      needsTableBooking: false,
      needsOnlineDelivery: false,
      topN: 5,
    });

    expect(res.qualifyingPool.length).toBeGreaterThan(0);
    expect(res.scoringMode).toBe('unrated');

    for (const r of res.qualifyingPool) {
      expect(r.score).not.toBeNaN();
      // Ensure 'NaN', 'undefined', 'null' strings are NOT in whyThisPick or explain text
      expect(r.whyThisPick).not.toMatch(/NaN|undefined|null/i);
      expect(r.explanation?.qualitySummary).not.toMatch(/NaN|undefined|null/i);
      expect(r.explanation?.priceSummary).not.toMatch(/NaN|undefined|null/i);
      expect(r.explanation?.popularitySummary).not.toMatch(/NaN|undefined|null/i);
    }
  });

  it('handles nulls safely in strict mode with missing capabilities', () => {
    const res = recommend(MOCK_NIGERIA_DATA, {
      country: 'Nigeria',
      city: 'Lagos',
      priceRange: 2, 
      cuisines: ['Grill'],
      needsTableBooking: false,
      needsOnlineDelivery: false,
      topN: 5,
      mode: 'strict',
    });

    expect(res.scoringMode).toBe('unrated');
    // For unrated cities, price filtering is skipped, so it should still find the Grill spot.
    expect(res.qualifyingPool.some(r => r.restaurant_name === 'Fake Suya Spot')).toBe(true);
  });
});
