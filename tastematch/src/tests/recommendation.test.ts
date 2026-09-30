import { describe, it, expect, beforeEach } from 'vitest';
import { recommend, DEFAULT_WEIGHTS, liveScore } from '@/lib/recommendation';
import { MOOD_PRESETS } from '@/config/presets';
import type { RestaurantParsed } from '@/types/restaurant';
import type { RecommendationQuery } from '@/types/recommendation';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let idCounter = 1;

function mkR(overrides: Partial<RestaurantParsed> = {}): RestaurantParsed {
  const id = idCounter++;
  return {
    restaurant_id:      id,
    restaurant_name:    `Restaurant ${id}`,
    locality:           'Test Locality',
    city:               'TestCity',
    country:            'India',
    cuisines:           'Continental',
    price_range:        2,
    average_cost_for_two: 500,
    currency:           'INR',
    aggregate_rating:   4.0,
    votes:              100,
    weighted_rating:    4.0,
    has_table_booking:  0,
    has_online_delivery:0,
    latitude:           28.6,
    longitude:          77.2,
    cuisineList:        ['Continental'],
    hasCoords:          true,
    ...overrides,
  };
}

const BASE_QUERY: RecommendationQuery = {
  country: 'India',
  city:    'TestCity',
  priceRange: 2,
  cuisines: [],
  needsTableBooking:    false,
  needsOnlineDelivery:  false,
  topN: 3,
};

// ─── Test Datasets ────────────────────────────────────────────────────────────

// 35 restaurants in TestCity — enough to be non-limited data
function makeTestCity(extras: RestaurantParsed[] = []): RestaurantParsed[] {
  const filler = Array.from({ length: 30 }, () =>
    mkR({ city: 'TestCity', country: 'India', price_range: 2, cuisineList: ['Fast Food'], cuisines: 'Fast Food' })
  );
  return [...filler, ...extras];
}

// ─── Stage a: exact price, cuisine match ─────────────────────────────────────

describe('Stage a — exact match', () => {
  beforeEach(() => { idCounter = 1; });

  it('returns stage exact_all when 3+ restaurants match price + cuisines exactly', () => {
    const extras = [
      mkR({ cuisines: 'North Indian, Chinese', cuisineList: ['North Indian', 'Chinese'], price_range: 2, weighted_rating: 4.5, aggregate_rating: 4.5 }),
      mkR({ cuisines: 'North Indian, Chinese', cuisineList: ['North Indian', 'Chinese'], price_range: 2, weighted_rating: 4.3, aggregate_rating: 4.3 }),
      mkR({ cuisines: 'North Indian, Chinese', cuisineList: ['North Indian', 'Chinese'], price_range: 2, weighted_rating: 4.1, aggregate_rating: 4.1 }),
    ];
    const data = makeTestCity(extras);
    const result = recommend(data, { ...BASE_QUERY, cuisines: ['North Indian', 'Chinese'] });

    expect(result.stage).toBe('exact_all');
    expect(result.notice).toBeNull(); // amendment 13: null for stage a
    expect(result.qualifyingPool.length).toBeGreaterThanOrEqual(3);
  });

  it('sorts by base score descending', () => {
    const extras = [
      mkR({ cuisines: 'Italian', cuisineList: ['Italian'], price_range: 2, weighted_rating: 4.0, aggregate_rating: 4.0 }),
      mkR({ cuisines: 'Italian', cuisineList: ['Italian'], price_range: 2, weighted_rating: 4.8, aggregate_rating: 4.8 }),
      mkR({ cuisines: 'Italian', cuisineList: ['Italian'], price_range: 2, weighted_rating: 4.4, aggregate_rating: 4.4 }),
    ];
    const data = makeTestCity(extras);
    const result = recommend(data, { ...BASE_QUERY, cuisines: ['Italian'] });

    const ratings = result.qualifyingPool.slice(0, 3).map(r => r.weighted_rating);
    expect(ratings[0]).toBeGreaterThanOrEqual(ratings[1]);
    expect(ratings[1]).toBeGreaterThanOrEqual(ratings[2]);
  });

  it('isLimitedData is false when city has >= 30 restaurants', () => {
    const data = makeTestCity();
    const result = recommend(data, BASE_QUERY);
    expect(result.isLimitedData).toBe(false);
  });
});

// ─── Stage b: price ±1, cuisine required ─────────────────────────────────────

describe('Stage b — price relaxed, cuisine kept', () => {
  beforeEach(() => { idCounter = 100; });

  it('relaxes to ±1 price when no exact price match with cuisine', () => {
    // Italian only available at price 1 and 3 (not 2)
    const extras = [
      mkR({ cuisines: 'Italian', cuisineList: ['Italian'], price_range: 1, weighted_rating: 4.3, aggregate_rating: 4.3 }),
      mkR({ cuisines: 'Italian', cuisineList: ['Italian'], price_range: 3, weighted_rating: 4.4, aggregate_rating: 4.4 }),
      mkR({ cuisines: 'Italian', cuisineList: ['Italian'], price_range: 1, weighted_rating: 4.2, aggregate_rating: 4.2 }),
    ];
    const data = makeTestCity(extras);
    const result = recommend(data, { ...BASE_QUERY, cuisines: ['Italian'], priceRange: 2 });

    expect(result.stage).toBe('relaxed_price_1_cuisine_kept');
    expect(result.notice).not.toBeNull();
    expect(result.qualifyingPool.length).toBeGreaterThanOrEqual(3);
    // All results should be Italian
    for (const r of result.qualifyingPool) {
      expect(r.cuisineList).toContain('Italian');
    }
  });
});

// ─── Stage c: price ±1, cuisine ignored ──────────────────────────────────────

describe('Stage c — cuisine ignored, price kept ±1', () => {
  beforeEach(() => { idCounter = 200; });

  it('ignores cuisine when fewer than topN match at price ±1 with cuisine', () => {
    // Only 1 Italian at price ±1, but many others available
    const extras = [
      mkR({ cuisines: 'Italian', cuisineList: ['Italian'], price_range: 1, weighted_rating: 4.5, aggregate_rating: 4.5 }),
      // non-Italian at prices 1-3
      mkR({ cuisines: 'Chinese', cuisineList: ['Chinese'], price_range: 1, weighted_rating: 4.4, aggregate_rating: 4.4 }),
      mkR({ cuisines: 'Chinese', cuisineList: ['Chinese'], price_range: 3, weighted_rating: 4.3, aggregate_rating: 4.3 }),
    ];
    const data = makeTestCity(extras);
    const result = recommend(data, {
      ...BASE_QUERY,
      cuisines: ['Italian'],
      priceRange: 2,
      topN: 3,
    });

    // Stage b: only 1 Italian match → Stage c: price ±1 any cuisine → 3+ results
    expect(['relaxed_price_1_cuisine_ignored', 'relaxed_any_price_cuisine_ignored']).toContain(result.stage);
    expect(result.notice).not.toBeNull();
  });
});

// ─── Stage d: any price, any cuisine ─────────────────────────────────────────

describe('Stage d — any price, any cuisine', () => {
  beforeEach(() => { idCounter = 300; });

  it('falls back to all restaurants when nothing matches earlier stages', () => {
    // Very strict: price 4, Rare cuisine — nothing in city matches
    const extras = [
      mkR({ cuisines: 'Japanese', cuisineList: ['Japanese'], price_range: 1, weighted_rating: 4.6, aggregate_rating: 4.6 }),
      mkR({ cuisines: 'Japanese', cuisineList: ['Japanese'], price_range: 1, weighted_rating: 4.5, aggregate_rating: 4.5 }),
      mkR({ cuisines: 'Japanese', cuisineList: ['Japanese'], price_range: 1, weighted_rating: 4.4, aggregate_rating: 4.4 }),
    ];
    const data = makeTestCity(extras);
    const result = recommend(data, { ...BASE_QUERY, priceRange: 4, cuisines: ['Rare Cuisine'], topN: 3 });

    expect(result.stage).toBe('relaxed_any_price_cuisine_ignored');
    expect(result.notice).not.toBeNull();
  });
});

// ─── Empty results ────────────────────────────────────────────────────────────

describe('Empty results', () => {
  beforeEach(() => { idCounter = 400; });

  it('returns empty pool when city has no restaurants', () => {
    const data = [mkR({ city: 'OtherCity' })];
    const result = recommend(data, { ...BASE_QUERY, city: 'EmptyCity' });

    expect(result.qualifyingPool).toHaveLength(0);
    expect(result.notice).not.toBeNull();
  });

  it('returns empty pool when service filter eliminates all', () => {
    const data = makeTestCity([
      mkR({ has_table_booking: 0, has_online_delivery: 0 }),
    ]);
    const result = recommend(data, { ...BASE_QUERY, needsTableBooking: true });
    // City has 30+ filler restaurants with table_booking=0, plus above
    // All filtered out → empty
    expect(result.qualifyingPool).toHaveLength(0);
  });
});

// ─── Deduplication ───────────────────────────────────────────────────────────

describe('Deduplication — same restaurant_name keeps highest score', () => {
  beforeEach(() => { idCounter = 500; });

  it('deduplicates branches by restaurant_name, keeping highest weighted_rating', () => {
    const sharedName = 'Famous Chain';
    const extras = [
      mkR({ restaurant_name: sharedName, price_range: 2, cuisineList: ['Italian'], cuisines: 'Italian', weighted_rating: 3.8, aggregate_rating: 3.8 }),
      mkR({ restaurant_name: sharedName, price_range: 2, cuisineList: ['Italian'], cuisines: 'Italian', weighted_rating: 4.6, aggregate_rating: 4.6 }), // better branch
      mkR({ restaurant_name: sharedName, price_range: 2, cuisineList: ['Italian'], cuisines: 'Italian', weighted_rating: 4.1, aggregate_rating: 4.1 }),
    ];
    const data = makeTestCity(extras);
    const result = recommend(data, { ...BASE_QUERY, cuisines: ['Italian'] });

    const chainResults = result.qualifyingPool.filter(r => r.restaurant_name === sharedName);
    expect(chainResults).toHaveLength(1);
    expect(chainResults[0].weighted_rating).toBe(4.6);
  });
});

// ─── Cuisine matching ─────────────────────────────────────────────────────────

describe('Cuisine matching calculation', () => {
  beforeEach(() => { idCounter = 600; });

  it('cuisine_match is 0 when no cuisines requested', () => {
    const data = makeTestCity([
      mkR({ cuisineList: ['North Indian'], cuisines: 'North Indian', price_range: 2, weighted_rating: 4.5, aggregate_rating: 4.5 }),
    ]);
    const result = recommend(data, { ...BASE_QUERY, cuisines: [] });

    for (const r of result.qualifyingPool) {
      expect(r.cuisineMatch).toBe(0);
    }
  });

  it('cuisine_match is 1 when all requested cuisines served', () => {
    const extras = [
      mkR({ cuisineList: ['North Indian', 'Chinese'], cuisines: 'North Indian, Chinese', price_range: 2, weighted_rating: 4.5, aggregate_rating: 4.5 }),
      mkR({ cuisineList: ['North Indian', 'Chinese'], cuisines: 'North Indian, Chinese', price_range: 2, weighted_rating: 4.3, aggregate_rating: 4.3 }),
      mkR({ cuisineList: ['North Indian', 'Chinese'], cuisines: 'North Indian, Chinese', price_range: 2, weighted_rating: 4.1, aggregate_rating: 4.1 }),
    ];
    const data = makeTestCity(extras);
    const result = recommend(data, { ...BASE_QUERY, cuisines: ['North Indian', 'Chinese'] });

    const fullMatches = result.qualifyingPool.filter(r => r.cuisineMatch === 1);
    expect(fullMatches.length).toBeGreaterThan(0);
  });

  it('cuisine_match is 0.5 when 1 of 2 requested cuisines served', () => {
    const extras = [
      mkR({ cuisineList: ['North Indian'], cuisines: 'North Indian', price_range: 2, weighted_rating: 4.5, aggregate_rating: 4.5 }),
      mkR({ cuisineList: ['North Indian'], cuisines: 'North Indian', price_range: 2, weighted_rating: 4.3, aggregate_rating: 4.3 }),
      mkR({ cuisineList: ['North Indian'], cuisines: 'North Indian', price_range: 2, weighted_rating: 4.1, aggregate_rating: 4.1 }),
    ];
    const data = makeTestCity(extras);
    const result = recommend(data, { ...BASE_QUERY, cuisines: ['North Indian', 'Chinese'] });

    const halfMatches = result.qualifyingPool.filter(r => r.cuisineMatch === 0.5);
    expect(halfMatches.length).toBeGreaterThan(0);
  });
});

// ─── Service filters ──────────────────────────────────────────────────────────

describe('Service filters', () => {
  beforeEach(() => { idCounter = 700; });

  it('table booking filter returns only booking-enabled restaurants', () => {
    const extras = [
      mkR({ has_table_booking: 1, price_range: 2, weighted_rating: 4.8, aggregate_rating: 4.8 }),
      mkR({ has_table_booking: 1, price_range: 2, weighted_rating: 4.6, aggregate_rating: 4.6 }),
      mkR({ has_table_booking: 1, price_range: 2, weighted_rating: 4.4, aggregate_rating: 4.4 }),
      mkR({ has_table_booking: 0, price_range: 2, weighted_rating: 5.0, aggregate_rating: 5.0 }),
    ];
    const data = makeTestCity(extras);
    const result = recommend(data, { ...BASE_QUERY, needsTableBooking: true });

    for (const r of result.qualifyingPool) {
      expect(r.has_table_booking).toBe(1);
    }
  });

  it('online delivery filter returns only delivery-enabled restaurants', () => {
    const extras = [
      mkR({ has_online_delivery: 1, price_range: 2, weighted_rating: 4.7, aggregate_rating: 4.7 }),
      mkR({ has_online_delivery: 1, price_range: 2, weighted_rating: 4.5, aggregate_rating: 4.5 }),
      mkR({ has_online_delivery: 1, price_range: 2, weighted_rating: 4.3, aggregate_rating: 4.3 }),
    ];
    const data = makeTestCity(extras);
    const result = recommend(data, { ...BASE_QUERY, needsOnlineDelivery: true });

    for (const r of result.qualifyingPool) {
      expect(r.has_online_delivery).toBe(1);
    }
  });
});

// ─── Limited data notice (amendment 6) ───────────────────────────────────────

describe('Limited data notice (amendment 6)', () => {
  beforeEach(() => { idCounter = 800; });

  it('isLimitedData true when city has fewer than 30 restaurants', () => {
    // Only 20 restaurants in this city
    const data = Array.from({ length: 20 }, () => mkR({ city: 'SmallCity', country: 'India' }));
    const result = recommend(data, { ...BASE_QUERY, city: 'SmallCity' });
    expect(result.isLimitedData).toBe(true);
    expect(result.cityRestaurantCount).toBe(20);
  });

  it('isLimitedData false when city has exactly 30 restaurants', () => {
    const data = Array.from({ length: 30 }, () => mkR({ city: 'ExactCity', country: 'India' }));
    const result = recommend(data, { ...BASE_QUERY, city: 'ExactCity' });
    expect(result.isLimitedData).toBe(false);
    expect(result.cityRestaurantCount).toBe(30);
  });
});

// ─── Any price mode (amendment 5) ────────────────────────────────────────────

describe('Any price mode (amendment 5)', () => {
  beforeEach(() => { idCounter = 900; });

  it('skips price-relaxation stages when priceRange is null', () => {
    const data = makeTestCity([
      mkR({ price_range: 1, cuisineList: ['Italian'], cuisines: 'Italian', weighted_rating: 4.5, aggregate_rating: 4.5 }),
      mkR({ price_range: 3, cuisineList: ['Italian'], cuisines: 'Italian', weighted_rating: 4.4, aggregate_rating: 4.4 }),
      mkR({ price_range: 4, cuisineList: ['Italian'], cuisines: 'Italian', weighted_rating: 4.3, aggregate_rating: 4.3 }),
    ]);
    const result = recommend(data, { ...BASE_QUERY, priceRange: null, cuisines: ['Italian'] });

    // Should NOT hit relaxed_price stages; should use exact_all (any price = exact match at all prices)
    expect(['exact_all', 'relaxed_price_1_cuisine_ignored', 'relaxed_any_price_cuisine_ignored']).toContain(result.stage);
    // Price-relaxation stages b and c are skipped
    expect(result.stage).not.toBe('relaxed_price_1_cuisine_kept');
  });

  it('uses cuisine-only notice text when priceRange is null and stage > a', () => {
    const data = Array.from({ length: 5 }, () => mkR({ city: 'TinyCity', country: 'India' }));
    const result = recommend(data, { ...BASE_QUERY, city: 'TinyCity', priceRange: null, cuisines: ['Rare Cuisine'] });

    if (result.notice) {
      expect(result.notice).not.toMatch(/price range/i);
    }
  });
});

// ─── Preset hard filters (amendment 4) ───────────────────────────────────────

describe('Preset hard filters (amendment 4)', () => {
  beforeEach(() => { idCounter = 1000; });

  it('applies preset before stages — filters out restaurants below minRating', () => {
    const hiddenGemsPreset = MOOD_PRESETS.find(p => p.id === 'hidden_gems')!;
    const extras = [
      mkR({ aggregate_rating: 4.5, votes: 50, weighted_rating: 4.5, price_range: 2 }),
      mkR({ aggregate_rating: 3.0, votes: 80, weighted_rating: 3.5, price_range: 2 }), // below minRating 4.2
      mkR({ aggregate_rating: 4.3, votes: 30, weighted_rating: 4.3, price_range: 2 }),
    ];
    const data = makeTestCity(extras);
    const result = recommend(data, BASE_QUERY, hiddenGemsPreset);

    for (const r of result.qualifyingPool) {
      expect(r.aggregate_rating).toBeGreaterThanOrEqual(hiddenGemsPreset.minRating!);
    }
  });
});

// ─── Stage a notice is null (amendment 13) ────────────────────────────────────

describe('Amendment 13 — stage a notice is null', () => {
  beforeEach(() => { idCounter = 1100; });

  it('returns null notice for stage a (UI shows "Exact match" label)', () => {
    const extras = [
      mkR({ cuisineList: ['Thai'], cuisines: 'Thai', price_range: 2, weighted_rating: 4.5, aggregate_rating: 4.5 }),
      mkR({ cuisineList: ['Thai'], cuisines: 'Thai', price_range: 2, weighted_rating: 4.3, aggregate_rating: 4.3 }),
      mkR({ cuisineList: ['Thai'], cuisines: 'Thai', price_range: 2, weighted_rating: 4.1, aggregate_rating: 4.1 }),
    ];
    const data = makeTestCity(extras);
    const result = recommend(data, { ...BASE_QUERY, cuisines: ['Thai'] });
    expect(result.stage).toBe('exact_all');
    expect(result.notice).toBeNull();
  });
});

// ─── liveScore: popularity clamped (amendment 11) ────────────────────────────

describe('liveScore — popularity clamped to 1 (amendment 11)', () => {
  it('popularity feature never exceeds 1.0 regardless of vote count', () => {
    const r = mkR({ votes: 999999999, aggregate_rating: 5.0, weighted_rating: 5.0, price_range: 1 }) as ReturnType<typeof mkR> & { cuisineMatch: number; score: number; rank: number; whyThisPick: string };
    r.cuisineMatch = 0;
    r.score = 5.0;
    r.rank = 1;
    r.whyThisPick = '';

    const s = liveScore(r, DEFAULT_WEIGHTS);
    // Score must be finite and <= sum of max weights
    expect(Number.isFinite(s)).toBe(true);
    expect(s).toBeLessThanOrEqual(8);
  });
});

// ─── qualifyingPool has more than topN ───────────────────────────────────────

describe('Show more — qualifyingPool returns more than topN', () => {
  beforeEach(() => { idCounter = 1200; });

  it('qualifyingPool can exceed topN so UI can show more', () => {
    const extras = Array.from({ length: 8 }, (_, i) =>
      mkR({ cuisineList: ['Thai'], cuisines: 'Thai', price_range: 2, weighted_rating: 4.0 + i * 0.05, aggregate_rating: 4.0 })
    );
    const data = makeTestCity(extras);
    const result = recommend(data, { ...BASE_QUERY, cuisines: ['Thai'], topN: 3 });

    // Pool should contain more than 3 if there are 8 matching restaurants
    expect(result.qualifyingPool.length).toBeGreaterThan(3);
  });
});
