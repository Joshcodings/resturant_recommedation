import { describe, it, expect, beforeAll } from 'vitest';
import { recommend } from '@/lib/recommendation';
import type { Restaurant, RestaurantParsed } from '@/types/restaurant';
import fs from 'fs';
import path from 'path';

let realData: RestaurantParsed[] = [];

beforeAll(() => {
  const filePath = path.resolve(process.cwd(), 'public/data/restaurants.json');
  const raw: Restaurant[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  realData = raw.map(r => ({
    ...r,
    cuisineList: r.cuisines
      .split(',')
      .map(c => c.trim())
      .filter(Boolean),
    hasCoords: !!(r.latitude && r.longitude && r.latitude !== 0 && r.longitude !== 0),
    hasRating: typeof r.aggregate_rating === 'number' && r.aggregate_rating !== null,
    hasPrice: typeof r.price_range === 'number' && r.price_range !== null,
  }));
});

describe('Acceptance Test Cases on Real Dataset', () => {
  it('Test Case 1: New Delhi (price 2, North Indian + Chinese, table booking)', () => {
    const result = recommend(realData, {
      country: 'India',
      city: 'New Delhi',
      priceRange: 2,
      cuisines: ['North Indian', 'Chinese'],
      needsTableBooking: true,
      needsOnlineDelivery: false,
      topN: 3,
    });

    expect(result.stage).toBe('exact_all');
    expect(result.notice).toBeNull();
    expect(result.isLimitedData).toBe(false);
    expect(result.qualifyingPool.length).toBeGreaterThanOrEqual(3);

    // Verify top 3 restaurants meet all exact constraints
    const top3 = result.qualifyingPool.slice(0, 3);
    for (const r of top3) {
      expect(r.city).toBe('New Delhi');
      expect(r.price_range).toBe(2);
      expect(r.has_table_booking).toBe(1);
      const lower = r.cuisineList.map(c => c.toLowerCase());
      expect(lower.includes('north indian') || lower.includes('chinese')).toBe(true);
    }
  });

  it('Test Case 2: Orlando (price 4, Italian) -> expect relaxation notice & limited data', () => {
    const result = recommend(realData, {
      country: 'USA',
      city: 'Orlando',
      priceRange: 4,
      cuisines: ['Italian'],
      needsTableBooking: false,
      needsOnlineDelivery: false,
      topN: 3,
    });

    // Amendment 6: check that limited data notice appears
    expect(result.isLimitedData).toBe(true);
    // In Orlando there is only 1 Italian restaurant (Maggiano's Little Italy), so topN=3 triggers relaxation
    expect(result.stage).toBe('relaxed_price_1_cuisine_ignored');
    expect(result.notice).not.toBeNull();
    expect(result.notice).toMatch(/No exact cuisine match|cuisine filter relaxed/i);
    expect(result.qualifyingPool.length).toBeGreaterThanOrEqual(3);
  });

  it('Test Case 3: Lucknow (price 3, Continental) -> exact match with limited data warning', () => {
    const result = recommend(realData, {
      country: 'India',
      city: 'Lucknow',
      priceRange: 3,
      cuisines: ['Continental'],
      needsTableBooking: false,
      needsOnlineDelivery: false,
      topN: 3,
    });

    // Amendment 6: check limited data notice appears
    expect(result.isLimitedData).toBe(true);
    // Exact match succeeds because Lucknow has 5 restaurants serving Continental at price 3
    expect(result.stage).toBe('exact_all');
    expect(result.notice).toBeNull();
    expect(result.qualifyingPool.length).toBeGreaterThanOrEqual(3);

    const top3 = result.qualifyingPool.slice(0, 3);
    for (const r of top3) {
      expect(r.city).toBe('Lucknow');
      expect(r.price_range).toBe(3);
      expect(r.cuisineList.map(c => c.toLowerCase())).toContain('continental');
    }
  });
});
