/**
 * Stage 0 Regression Test
 *
 * Runs the real TypeScript recommendation engine against the live
 * restaurants.json and asserts the results exactly match the fixture
 * captured before any Nigeria / null-safety changes.
 *
 * If this test breaks after our changes, the Zomato data or the Zomato
 * ranking logic has been altered — which is forbidden by the implementation plan.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { recommend } from '@/lib/recommendation';
import type { RestaurantParsed } from '@/types/restaurant';
import FIXTURE from './fixtures/regression_stage0.json';

// ── Load + parse the static dataset the same way dataLoader.ts does ────────
import RAW_DATA from '../../public/data/restaurants.json';

function parseRestaurants(raw: typeof RAW_DATA): RestaurantParsed[] {
  return (raw as unknown as RestaurantParsed[]).map(r => ({
    ...r,
    cuisineList: r.cuisines
      .split(',')
      .map((c: string) => c.trim())
      .filter(Boolean),
    hasCoords: !!(
      r.latitude && r.longitude &&
      r.latitude !== 0 && r.longitude !== 0
    ),
  }));
}

let data: ReturnType<typeof parseRestaurants>;

beforeAll(() => {
  data = parseRestaurants(RAW_DATA as unknown as any[]);
});

// ── Helper: run engine and extract top-10 IDs ──────────────────────────────
function captureTop10(
  country: string,
  city: string,
  priceRange: 1 | 2 | 3 | 4 | null,
  cuisines: string[],
  needsTableBooking = false,
  needsOnlineDelivery = false,
) {
  const result = recommend(data, {
    country,
    city,
    priceRange,
    cuisines,
    needsTableBooking,
    needsOnlineDelivery,
    topN: 3,
    mode: 'flexible',
  });
  return {
    top10_ids: result.qualifyingPool.slice(0, 10).map(r => r.restaurant_id),
    stage: result.stage,
    notice: result.notice,
    cityRestaurantCount: result.cityRestaurantCount,
    isLimitedData: result.isLimitedData,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Stage 0 — Zomato regression fixture (must not change after Nigeria work)', () => {

  it('India / New Delhi (price 2, North Indian + Chinese, table booking)', () => {
    const key = 'India/New Delhi (price 2, North Indian + Chinese, table booking)';
    const expected = (FIXTURE as unknown as Record<string, { top10_ids: number[]; stage: string; notice: string | null; cityRestaurantCount: number; isLimitedData: boolean }>)[key];
    const actual = captureTop10(
      'India', 'New Delhi', 2, ['North Indian', 'Chinese'], true, false,
    );

    expect(actual.top10_ids).toEqual(expected.top10_ids);
    expect(actual.stage).toBe(expected.stage);
    expect(actual.notice).toBe(expected.notice);
    expect(actual.cityRestaurantCount).toBe(expected.cityRestaurantCount);
    expect(actual.isLimitedData).toBe(expected.isLimitedData);
  });

  it('USA / Orlando (price 4, Italian)', () => {
    const key = 'USA/Orlando (price 4, Italian)';
    const expected = (FIXTURE as unknown as Record<string, { top10_ids: number[]; stage: string; notice: string | null; cityRestaurantCount: number; isLimitedData: boolean }>)[key];
    const actual = captureTop10('USA', 'Orlando', 4, ['Italian']);

    expect(actual.top10_ids).toEqual(expected.top10_ids);
    expect(actual.stage).toBe(expected.stage);
    expect(actual.cityRestaurantCount).toBe(expected.cityRestaurantCount);
    expect(actual.isLimitedData).toBe(expected.isLimitedData);
  });

  it('India / Lucknow (price 3, Continental)', () => {
    const key = 'India/Lucknow (price 3, Continental)';
    const expected = (FIXTURE as unknown as Record<string, { top10_ids: number[]; stage: string; notice: string | null; cityRestaurantCount: number; isLimitedData: boolean }>)[key];
    const actual = captureTop10('India', 'Lucknow', 3, ['Continental']);

    expect(actual.top10_ids).toEqual(expected.top10_ids);
    expect(actual.stage).toBe(expected.stage);
    expect(actual.cityRestaurantCount).toBe(expected.cityRestaurantCount);
    expect(actual.isLimitedData).toBe(expected.isLimitedData);
  });

});
