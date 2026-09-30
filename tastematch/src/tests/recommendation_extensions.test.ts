import { describe, it, expect } from 'vitest';
import {
  recommend,
  applyMMRDiversification,
  computePairwiseSimilarity,
} from '@/lib/recommendation';
import type { RestaurantParsed } from '@/types/restaurant';

function makeMock(overrides: Partial<RestaurantParsed> = {}): RestaurantParsed {
  return {
    restaurant_id: Math.floor(Math.random() * 100000),
    restaurant_name: 'Test Diner',
    locality: 'Connaught Place',
    city: 'New Delhi',
    country: 'India',
    cuisines: 'North Indian, Mughlai',
    cuisineList: ['North Indian', 'Mughlai'],
    price_range: 2,
    average_cost_for_two: 600,
    currency: 'INR',
    aggregate_rating: 4.5,
    votes: 350,
    weighted_rating: 4.4,
    has_table_booking: 1,
    has_online_delivery: 1,
    latitude: 28.63,
    longitude: 77.22,
    hasCoords: true,
    ...overrides,
  };
}

describe('Recommender Extensions: Strict Mode, MMR & Explainability', () => {
  const pool = [
    makeMock({ restaurant_id: 1, restaurant_name: 'Dhaba 1', price_range: 2, cuisineList: ['North Indian'], locality: 'CP' }),
    makeMock({ restaurant_id: 2, restaurant_name: 'Dhaba 2', price_range: 2, cuisineList: ['North Indian'], locality: 'CP' }),
    makeMock({ restaurant_id: 3, restaurant_name: 'Pasta Corner', price_range: 2, cuisineList: ['Italian'], locality: 'Khan Market' }),
    makeMock({ restaurant_id: 4, restaurant_name: 'Sushi Zen', price_range: 4, cuisineList: ['Japanese'], locality: 'Aerocity' }),
    makeMock({ restaurant_id: 5, restaurant_name: 'Dimsum House', price_range: 3, cuisineList: ['Chinese'], locality: 'CP' }),
  ];

  it('Strict Mode returns only exact matches and does not relax', () => {
    // Only Japanese and price 4
    const res = recommend(pool, {
      country: 'India',
      city: 'New Delhi',
      priceRange: 4,
      cuisines: ['Japanese'],
      needsTableBooking: false,
      needsOnlineDelivery: false,
      topN: 3,
      mode: 'strict',
    });

    expect(res.stage).toBe('exact_all');
    expect(res.qualifyingPool.length).toBe(1);
    expect(res.qualifyingPool[0].restaurant_name).toBe('Sushi Zen');
  });

  it('Strict Mode returns 0 items with strict notice when no exact match exists', () => {
    const res = recommend(pool, {
      country: 'India',
      city: 'New Delhi',
      priceRange: 1, // none in pool
      cuisines: ['French'],
      needsTableBooking: false,
      needsOnlineDelivery: false,
      topN: 3,
      mode: 'strict',
    });

    expect(res.qualifyingPool.length).toBe(0);
    expect(res.notice).toContain('Strict Mode');
  });

  it('Flexible Mode applies progressive relaxation and records relaxed criteria', () => {
    const res = recommend(pool, {
      country: 'India',
      city: 'New Delhi',
      priceRange: 1, // no price 1, so must relax to price 2 (+/- 1)
      cuisines: ['North Indian'],
      needsTableBooking: false,
      needsOnlineDelivery: false,
      topN: 2,
      mode: 'flexible',
    });

    expect(res.stage).toBe('relaxed_price_1_cuisine_kept');
    expect(res.relaxedCriteria).toBeDefined();
    expect(res.relaxedCriteria!.length).toBeGreaterThan(0);
  });

  it('MMR Diversification avoids clustering identical cuisines & localities', () => {
    const candidates = [
      { ...pool[0], score: 4.8, cuisineMatch: 1, rank: 1, whyThisPick: '' },
      { ...pool[1], score: 4.79, cuisineMatch: 1, rank: 2, whyThisPick: '' }, // near identical to pool[0]
      { ...pool[2], score: 4.70, cuisineMatch: 0.5, rank: 3, whyThisPick: '' }, // diverse cuisine & locality
    ];

    // High diversity lambda (e.g. 0.3) should promote pool[2] over the redundant duplicate pool[1]
    const diversified = applyMMRDiversification(candidates, 0.3, 2);
    expect(diversified.length).toBe(3); // preserving full pool
    expect(diversified[0].restaurant_id).toBe(pool[0].restaurant_id);
    expect(diversified[1].restaurant_id).toBe(pool[2].restaurant_id); // Italian picked before duplicate North Indian!
  });

  it('Pairwise similarity returns higher value for identical cuisines & locality', () => {
    const simHigh = computePairwiseSimilarity(pool[0], pool[1]);
    const simLow = computePairwiseSimilarity(pool[0], pool[3]);
    expect(simHigh).toBeGreaterThan(simLow);
  });

  it('Generates structured Explainable AI breakdown on all recommended items', () => {
    const res = recommend(pool, {
      country: 'India',
      city: 'New Delhi',
      priceRange: 2,
      cuisines: ['North Indian'],
      needsTableBooking: false,
      needsOnlineDelivery: false,
      topN: 2,
    });

    const first = res.qualifyingPool[0];
    expect(first.explanation).toBeDefined();
    expect(first.explanation!.cuisineSummary).toBeDefined();
    expect(first.explanation!.qualitySummary).toBeDefined();
    expect(first.explanation!.priceSummary).toBeDefined();
    expect(first.explanation!.popularitySummary).toBeDefined();
  });
});
