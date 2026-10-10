import { describe, it, expect } from 'vitest';
import { matchDishOrKeyword } from '@/lib/dishSearch';
import { PAYMENT_FILTERS } from '@/components/search/PaymentChips';
import type { RestaurantParsed } from '@/types/restaurant';

function createMockRestaurant(overrides: Partial<RestaurantParsed> = {}): RestaurantParsed {
  return {
    uid: 'osm:node/12345',
    restaurant_name: 'Test Spot',
    locality: 'Ikeja',
    city: 'Lagos',
    country: 'Nigeria',
    cuisines: 'Nigerian',
    cuisineList: ['Nigerian'],
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
    hasCoords: true,
    hasRating: false,
    hasPrice: false,
    ...overrides,
  };
}

describe('Feature 1: Dish-First Search & Attribution', () => {
  it('identifies cuisine tag match with strict "cuisine tag: <tag>" attribution', () => {
    const restaurant = createMockRestaurant({
      restaurant_name: 'Calabar Kitchen',
      cuisines: 'Nigerian, African',
      cuisineList: ['Nigerian', 'African'],
    });

    // Query for "jollof" (which maps to cuisine tags: ["nigerian", "african", "west african"])
    const match = matchDishOrKeyword(restaurant, 'jollof');
    expect(match).not.toBeNull();
    expect(match?.type).toBe('cuisine_tag');
    expect(match?.text).toBe('cuisine tag: nigerian');
  });

  it('identifies name-only match with strict "matched in name" attribution and does NOT claim cuisine match', () => {
    const restaurant = createMockRestaurant({
      restaurant_name: 'Mega Suya Spot',
      cuisines: 'Fast Food', // no suya or nigerian tag
      cuisineList: ['Fast Food'],
    });

    const match = matchDishOrKeyword(restaurant, 'suya');
    expect(match).not.toBeNull();
    expect(match?.type).toBe('name_match');
    expect(match?.text).toBe('matched in name');
  });

  it('never mixes both claims and prioritizes cuisine tag when present', () => {
    const restaurant = createMockRestaurant({
      restaurant_name: 'Buka Hut Special',
      cuisines: 'Nigerian, African',
      cuisineList: ['Nigerian', 'African'],
    });

    const match = matchDishOrKeyword(restaurant, 'buka');
    expect(match).not.toBeNull();
    // Rule: Never mix both claims; cuisine tag verifies food offering
    expect(match?.type).toBe('cuisine_tag');
    expect(match?.text).toBe('cuisine tag: nigerian');
  });

  it('returns null when neither cuisine tag nor name matches the dish', () => {
    const restaurant = createMockRestaurant({
      restaurant_name: 'Tokyo Sushi Bar',
      cuisines: 'Japanese, Sushi',
      cuisineList: ['Japanese', 'Sushi'],
    });

    const match = matchDishOrKeyword(restaurant, 'amala');
    expect(match).toBeNull();
  });
});

describe('Feature 2: Pay-How Filter', () => {
  const cashFilter = PAYMENT_FILTERS.find(f => f.id === 'cash')!;
  const cardFilter = PAYMENT_FILTERS.find(f => f.id === 'cards')!;
  const mobileFilter = PAYMENT_FILTERS.find(f => f.id === 'mobile_payment')!;

  it('matches cash filter only when real payment_methods.cash is true', () => {
    const withCash = createMockRestaurant({
      payment_methods: { cash: true },
    });
    const withoutCash = createMockRestaurant({
      payment_methods: null,
    });

    expect(cashFilter.check(withCash)).toBe(true);
    expect(cashFilter.check(withoutCash)).toBe(false);
  });

  it('matches cards filter with cards, debit_cards, or credit_cards tags', () => {
    const withCard = createMockRestaurant({
      payment_methods: { cards: true },
    });
    const withDebit = createMockRestaurant({
      payment_methods: { debit_cards: true },
    });
    const withNeither = createMockRestaurant({
      payment_methods: { cash: true },
    });

    expect(cardFilter.check(withCard)).toBe(true);
    expect(cardFilter.check(withDebit)).toBe(true);
    expect(cardFilter.check(withNeither)).toBe(false);
  });

  it('matches mobile payment with mobile_payment, bank_transfer, or pos tags', () => {
    const withMobile = createMockRestaurant({
      payment_methods: { mobile_payment: true },
    });
    const withTransfer = createMockRestaurant({
      payment_methods: { bank_transfer: true },
    });
    const withoutMobile = createMockRestaurant({
      payment_methods: { cash: true },
    });

    expect(mobileFilter.check(withMobile)).toBe(true);
    expect(mobileFilter.check(withTransfer)).toBe(true);
    expect(mobileFilter.check(withoutMobile)).toBe(false);
  });

  it('places without payment tags return false for all filters and never default to "cash only"', () => {
    const unlistedPayment = createMockRestaurant({
      payment_methods: null,
    });

    expect(cashFilter.check(unlistedPayment)).toBe(false);
    expect(cardFilter.check(unlistedPayment)).toBe(false);
    expect(mobileFilter.check(unlistedPayment)).toBe(false);
  });
});
