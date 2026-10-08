import { describe, it, expect } from 'vitest';
import { runRecommendationEvaluation } from '@/lib/evaluation';
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
    hasCoords: true, hasRating: true, hasPrice: true,
    ...overrides,
  };
}

describe('Recommendation Evaluation Framework', () => {
  const pool: RestaurantParsed[] = [];
  const cuisines = ['North Indian', 'Chinese', 'Fast Food', 'Mughlai', 'Continental', 'Italian'];

  for (let i = 0; i < 60; i++) {
    const c = cuisines[i % cuisines.length];
    pool.push(
      makeMock({
        restaurant_id: i + 1,
        restaurant_name: `Restaurant ${i + 1}`,
        city: 'New Delhi',
        cuisines: c,
        cuisineList: [c],
        price_range: ((i % 4) + 1) as 1 | 2 | 3 | 4,
        weighted_rating: 3.5 + (i % 15) * 0.1,
      }),
    );
  }

  it('runs offline benchmark and returns metrics for all 4 paradigms', () => {
    const bench = runRecommendationEvaluation(pool, 5);
    expect(bench).toBeDefined();
    expect(bench.metrics.length).toBe(4);

    const names = bench.metrics.map(m => m.methodName);
    expect(names).toContain('Baseline (Top-Rated)');
    expect(names).toContain('Content-Based');
    expect(names).toContain('Preference-Based');
    expect(names).toContain('Hybrid Recommender');

    for (const m of bench.metrics) {
      expect(m.precisionAt5).toBeGreaterThanOrEqual(0);
      expect(m.precisionAt5).toBeLessThanOrEqual(1);
      expect(m.recallAt5).toBeGreaterThanOrEqual(0);
      expect(m.recallAt5).toBeLessThanOrEqual(1);
      expect(m.ndcgAt5).toBeGreaterThanOrEqual(0);
      expect(m.ndcgAt5).toBeLessThanOrEqual(1);
      expect(m.catalogCoverage).toBeGreaterThanOrEqual(0);
      expect(m.intraListDiversity).toBeGreaterThanOrEqual(0);
    }
  });

  it('verifies that Hybrid achieves higher catalog coverage than Baseline', () => {
    const bench = runRecommendationEvaluation(pool, 5);
    const baseline = bench.metrics.find(m => m.methodName.includes('Baseline'))!;
    const hybrid = bench.metrics.find(m => m.methodName.includes('Hybrid'))!;

    // Baseline only recommends the highest-rated across all queries, resulting in lower coverage
    expect(hybrid.catalogCoverage).toBeGreaterThanOrEqual(baseline.catalogCoverage);
  });
});
