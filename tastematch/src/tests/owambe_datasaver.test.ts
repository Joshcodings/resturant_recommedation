import { describe, it, expect } from 'vitest';
import { planOwambeCrawl, filterCrawlPool } from '@/lib/owambeCrawlPlanner';
import type { RestaurantParsed } from '@/types/restaurant';

function makeMockRestaurant(overrides: Partial<RestaurantParsed>): RestaurantParsed {
  return {
    uid: 'osm:node/101',
    restaurant_name: 'Test Spot',
    locality: 'Ikeja',
    city: 'Lagos',
    country: 'Nigeria',
    cuisines: 'Nigerian, African',
    price_range: null,
    average_cost_for_two: null,
    currency: 'NGN',
    aggregate_rating: null,
    votes: null,
    weighted_rating: 0.8,
    has_table_booking: null,
    has_online_delivery: null,
    latitude: 6.595,
    longitude: 3.355,
    cuisineList: ['Nigerian', 'African'],
    hasCoords: true,
    hasRating: false,
    hasPrice: false,
    ...overrides,
  };
}

describe('Feature 8: Owambe Crawl Planner', () => {
  const mockPool: RestaurantParsed[] = [
    makeMockRestaurant({
      uid: 'osm:node/1',
      restaurant_name: 'Suya Point',
      place_type: 'fast_food',
      cuisines: 'Suya, Grill',
      cuisineList: ['Suya', 'Grill'],
      latitude: 6.595,
      longitude: 3.355,
      diet: { halal: true },
    }),
    makeMockRestaurant({
      uid: 'osm:node/2',
      restaurant_name: 'Mama Ope Bukka',
      place_type: 'restaurant',
      cuisines: 'Nigerian',
      cuisineList: ['Nigerian'],
      latitude: 6.598,
      longitude: 3.358,
      diet: { halal: true, vegetarian: true },
    }),
    makeMockRestaurant({
      uid: 'osm:node/3',
      restaurant_name: 'Fela Shrine Bar',
      place_type: 'bar',
      cuisines: 'Bar, Drinks',
      cuisineList: ['Bar', 'Drinks'],
      latitude: 6.601,
      longitude: 3.362,
    }),
    makeMockRestaurant({
      uid: 'osm:node/4',
      restaurant_name: 'Lounge 38',
      place_type: 'pub',
      cuisines: 'Lounge, Pub',
      cuisineList: ['Lounge', 'Pub'],
      latitude: 6.603,
      longitude: 3.364,
    }),
  ];

  it('generates a 3-stop crawl with route metrics', () => {
    const plan = planOwambeCrawl(mockPool, 'Lagos', { stopsCount: 3 });
    expect(plan).not.toBeNull();
    expect(plan?.stops.length).toBe(3);
    expect(plan?.totalDistanceKm).toBeGreaterThan(0);
    expect(plan?.stops[0].stageNumber).toBe(1);
    expect(plan?.stops[1].distanceFromPreviousKm).toBeDefined();
    expect(plan?.stops[2].distanceFromPreviousKm).toBeDefined();
  });

  it('strictly displays "Prices not listed" when price data is missing (Real Data Rule)', () => {
    const plan = planOwambeCrawl(mockPool, 'Lagos', { stopsCount: 3 });
    expect(plan?.estimatedCostText).toBe('Prices not listed');
  });

  it('calculates total cost accurately when real prices are present', () => {
    const poolWithPrices = mockPool.map((r, i) => ({
      ...r,
      average_cost_for_two: (i + 1) * 5000,
      price_range: (i + 1) as 1 | 2 | 3 | 4,
    }));
    const plan = planOwambeCrawl(poolWithPrices, 'Lagos', { stopsCount: 3 });
    expect(plan?.estimatedCostText).toContain('₦');
    expect(plan?.estimatedCostText).toContain('estimated');
  });

  it('generates clean WhatsApp message and wa.me link', () => {
    const plan = planOwambeCrawl(mockPool, 'Lagos', { stopsCount: 3 });
    expect(plan?.waMessage).toContain('TasteMatch Owambe / Food Crawl');
    expect(plan?.waMessage).toContain('Itinerary');
    expect(plan?.waLink).toMatch(/^https:\/\/wa\.me\/\?text=/);
  });

  it('respects dietary constraints (Halal)', () => {
    const poolWithDiets = [
      makeMockRestaurant({
        uid: 'osm:node/1',
        restaurant_name: 'Halal Suya',
        diet: { halal: true },
      }),
      makeMockRestaurant({
        uid: 'osm:node/2',
        restaurant_name: 'Pork Chops Bar',
        diet: { halal: false },
      }),
      makeMockRestaurant({
        uid: 'osm:node/3',
        restaurant_name: 'Halal Kitchen',
        diet: { halal: true },
      }),
    ];
    const filtered = filterCrawlPool(poolWithDiets, {
      stopsCount: 2,
      diets: { halal: true },
    });
    expect(filtered.every((r) => r.diet?.halal !== false)).toBe(true);
    expect(filtered.length).toBe(2);
  });
});
