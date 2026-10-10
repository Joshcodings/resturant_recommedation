import { describe, it, expect } from 'vitest';
import { recommend, liveScore, applyPresetFilter, applyMMRDiversification } from '@/lib/recommendation';
import { groupRecommend } from '@/lib/groupRecommendation';
import { morelikeThis, buildVocabulary } from '@/lib/similarity';
import { formatCost, formatVotes, whyThisPick } from '@/lib/formatters';
import { formatCurrency } from '@/lib/currency';
import { MOOD_PRESETS } from '@/config/presets';
import { DEFAULT_WEIGHTS } from '@/lib/recommendation';
import type { RestaurantParsed } from '@/types/restaurant';

/**
 * Creates a synthetic restaurant fixture with complete nulls on all optional/nullable fields.
 * Never shipped to production.
 */
function makeNullRestaurant(overrides: Partial<RestaurantParsed> = {}): RestaurantParsed {
  const uid = overrides.uid || `synthetic:${Math.random().toString(36).slice(2, 9)}`;
  return {
    uid,
    restaurant_id: null,
    restaurant_name: 'Synthetic Bukateria',
    locality: null,
    city: 'Lagos',
    country: 'Nigeria',
    cuisines: 'Nigerian, African',
    price_range: null,
    average_cost_for_two: null,
    currency: 'NGN',
    aggregate_rating: null,
    votes: null,
    weighted_rating: null,
    has_table_booking: null,
    has_online_delivery: null,
    latitude: 6.5244,
    longitude: 3.3792,
    cuisineList: ['Nigerian', 'African'],
    hasCoords: true,
    hasRating: false,
    hasPrice: false,
    state: null,
    address: null,
    place_type: 'restaurant',
    opening_hours: null,
    phone: null,
    website: null,
    contact: null,
    addr: null,
    payment_methods: null,
    diet: null,
    amenities: null,
    osm_timestamp: null,
    ...overrides,
  };
}

function assertNoInvalidStrings(obj: any, path = ''): void {
  if (obj === null || obj === undefined) return;
  if (typeof obj === 'number') {
    expect(Number.isNaN(obj), `NaN found at ${path}`).toBe(false);
    return;
  }
  if (typeof obj === 'string') {
    expect(obj).not.toContain('NaN');
    expect(obj).not.toContain('null');
    expect(obj).not.toContain('undefined');
    expect(obj).not.toContain('₦0');
    expect(obj).not.toMatch(/\b0 price\b/i);
    expect(obj).not.toContain('0 for two');
    expect(obj).not.toContain('n/a for two');
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => assertNoInvalidStrings(item, `${path}[${idx}]`));
    return;
  }
  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      assertNoInvalidStrings(value, `${path}.${key}`);
    }
  }
}

describe('Stage 2: Synthetic Null-Safety & UID Regression', () => {
  const syntheticCatalog: RestaurantParsed[] = [
    makeNullRestaurant({ uid: 'synthetic:1', restaurant_name: 'Suya Spot A', locality: 'Yaba' }),
    makeNullRestaurant({ uid: 'synthetic:2', restaurant_name: 'Buka Central', locality: 'Ikeja', cuisines: 'African', cuisineList: ['African'] }),
    makeNullRestaurant({ uid: 'synthetic:3', restaurant_name: 'Mama Put Corner', locality: 'Surulere', cuisines: 'Nigerian', cuisineList: ['Nigerian'] }),
    makeNullRestaurant({ uid: 'synthetic:4', restaurant_name: 'Lekki Shawarma', locality: 'Lekki', cuisines: 'Fast Food', cuisineList: ['Fast Food'] }),
    makeNullRestaurant({ uid: 'synthetic:5', restaurant_name: 'Victoria Chops', locality: 'VI', cuisines: 'Snacks', cuisineList: ['Snacks'] }),
  ];

  it('recommend() with null ratings, null prices, null votes produces clean outputs', () => {
    const result = recommend(syntheticCatalog, {
      country: 'Nigeria',
      city: 'Lagos',
      priceRange: null,
      cuisines: ['Nigerian'],
      needsTableBooking: false,
      needsOnlineDelivery: false,
      topN: 3,
      mode: 'flexible',
    });

    expect(result.qualifyingPool.length).toBeGreaterThan(0);
    assertNoInvalidStrings(result);

    for (const r of result.qualifyingPool) {
      expect(typeof r.uid).toBe('string');
      expect(r.uid).toBeTruthy();
      expect(r.aggregate_rating).toBeNull();
      expect(r.price_range).toBeNull();
      expect(r.votes).toBeNull();
      expect(Number.isNaN(r.score)).toBe(false);
      expect(r.whyThisPick).toBeTruthy();
      expect(r.explanation).toBeDefined();
    }
  });

  it('groupRecommend() runs without NaN or string corruptions on null attributes', () => {
    const groupResult = groupRecommend(
      syntheticCatalog,
      'Nigeria',
      'Lagos',
      ['Nigerian'],
      ['African'],
      null,
      3
    );

    expect(groupResult.length).toBeGreaterThan(0);
    assertNoInvalidStrings(groupResult);

    for (const r of groupResult) {
      expect(typeof r.uid).toBe('string');
      expect(Number.isNaN(r.consensus)).toBe(false);
    }
  });

  it('morelikeThis() handles null prices and null ratings without NaN', () => {
    const vocab = buildVocabulary(syntheticCatalog);
    const similar = morelikeThis(syntheticCatalog[0], syntheticCatalog, vocab, 3);

    expect(similar.length).toBeGreaterThan(0);
    assertNoInvalidStrings(similar);

    for (const s of similar) {
      expect(typeof s.uid).toBe('string');
      expect(s.uid).not.toBe(syntheticCatalog[0].uid);
      expect(Number.isNaN(s.similarity)).toBe(false);
    }
  });

  it('applyPresetFilter() gracefully handles unrated restaurants without throwing', () => {
    for (const preset of MOOD_PRESETS) {
      const filtered = applyPresetFilter(syntheticCatalog, preset);
      expect(Array.isArray(filtered)).toBe(true);
      assertNoInvalidStrings(filtered);
    }
  });

  it('liveScore() calculates valid numeric scores for slider weights on null fields', () => {
    const recs = recommend(syntheticCatalog, {
      country: 'Nigeria',
      city: 'Lagos',
      priceRange: null,
      cuisines: ['Nigerian'],
      needsTableBooking: false,
      needsOnlineDelivery: false,
      topN: 3,
      mode: 'flexible',
    });

    for (const r of recs.qualifyingPool) {
      const score = liveScore(r, DEFAULT_WEIGHTS);
      expect(Number.isNaN(score)).toBe(false);
      expect(typeof score).toBe('number');
    }
  });

  it('applyMMRDiversification() operates deterministically on null-price/null-rating pools', () => {
    const scoredPool = syntheticCatalog.map((r, i) => ({
      ...r,
      cuisineMatch: 1.0,
      score: 1.0 - i * 0.1,
      rank: i + 1,
      whyThisPick: 'Sample pick',
    }));

    const diversified = applyMMRDiversification(scoredPool, 0.85, 3);
    expect(diversified.length).toBe(scoredPool.length);
    assertNoInvalidStrings(diversified);
  });

  it('formatters and currency return clean fallbacks without inventing values', () => {
    expect(formatCost(null, 'NGN')).toBe('n/a');
    expect(formatVotes(null)).toBe('n/a');
    expect(formatCurrency(null, 'NGN')).toBe('n/a');

    const why = whyThisPick({
      cuisineMatch: 1.0,
      chosenCuisines: ['Nigerian'],
      servedCuisines: ['Nigerian'],
      rating: null,
      votes: null,
      priceRange: null,
      inputPriceRange: null,
      stage: 'exact_all',
      locality: 'Yaba',
    });

    expect(why).toBe('Serves 1 of your 1 cuisine in Yaba.');
    assertNoInvalidStrings({ why });
  });
});
