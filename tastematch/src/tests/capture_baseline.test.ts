import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { recommend } from '@/lib/recommendation';
import type { RestaurantParsed } from '@/types/restaurant';

function loadAllData(): RestaurantParsed[] {
  const zomatoPath = path.resolve(process.cwd(), 'public/data/restaurants.json');
  const ngPath = path.resolve(process.cwd(), 'public/data/restaurants_ng.json');
  
  const zomatoRaw: any[] = JSON.parse(fs.readFileSync(zomatoPath, 'utf-8'));
  const ngRaw: any[] = JSON.parse(fs.readFileSync(ngPath, 'utf-8'));

  const parseItem = (r: any): RestaurantParsed => {
    const uid = r.source_id ? `osm:${r.source_id}` : `zomato:${r.restaurant_id}`;
    return {
      ...r,
      uid,
      cuisineList: (r.cuisines || '')
        .split(',')
        .map((c: string) => c.trim())
        .filter(Boolean),
      hasCoords: !!(r.latitude && r.longitude && r.latitude !== 0 && r.longitude !== 0),
      hasRating: typeof r.aggregate_rating === 'number' && r.aggregate_rating !== null,
      hasPrice: typeof r.price_range === 'number' && r.price_range !== null,
    };
  };

  return [...zomatoRaw.map(parseItem), ...ngRaw.map(parseItem)];
}

describe('Capture Baseline Fixtures', () => {
  it('captures baseline top-10 for the 4 Stage 0 queries', () => {
    const data = loadAllData();

    // Query 1: India / New Delhi (price 2, North Indian+Chinese, table booking)
    const res1 = recommend(data, {
      country: 'India',
      city: 'New Delhi',
      priceRange: 2,
      cuisines: ['North Indian', 'Chinese'],
      needsTableBooking: true,
      needsOnlineDelivery: false,
      topN: 10,
      mode: 'flexible',
    });

    // Query 2: USA / Orlando (price 4, Italian)
    const res2 = recommend(data, {
      country: 'USA',
      city: 'Orlando',
      priceRange: 4,
      cuisines: ['Italian'],
      needsTableBooking: false,
      needsOnlineDelivery: false,
      topN: 10,
      mode: 'flexible',
    });

    // Query 3: India / Lucknow (price 3, Continental)
    const res3 = recommend(data, {
      country: 'India',
      city: 'Lucknow',
      priceRange: 3,
      cuisines: ['Continental'],
      needsTableBooking: false,
      needsOnlineDelivery: false,
      topN: 10,
      mode: 'flexible',
    });

    // Query 4: Nigeria / Lagos (cuisine Nigerian, no price)
    const res4 = recommend(data, {
      country: 'Nigeria',
      city: 'Lagos',
      priceRange: null,
      cuisines: ['Nigerian'],
      needsTableBooking: false,
      needsOnlineDelivery: false,
      topN: 10,
      mode: 'flexible',
    });

    const formatOutput = (res: any) => ({
      stage: res.stage,
      notice: res.notice,
      scoringMode: res.scoringMode,
      isLimitedData: res.isLimitedData,
      cityRestaurantCount: res.cityRestaurantCount,
      top10_uids: res.qualifyingPool.slice(0, 10).map((r: any) => r.uid || `zomato:${r.restaurant_id}`),
      top10_restaurant_ids: res.qualifyingPool.slice(0, 10).map((r: any) => r.restaurant_id),
      top10_names: res.qualifyingPool.slice(0, 10).map((r: any) => r.restaurant_name),
      top10_scores: res.qualifyingPool.slice(0, 10).map((r: any) => Number(r.score.toFixed(3))),
    });

    const baseline = {
      capturedAt: new Date().toISOString(),
      description: 'Stage 0 regression fixtures for New Delhi, Orlando, Lucknow, and Lagos',
      'India/New Delhi (price 2, North Indian + Chinese, table booking)': formatOutput(res1),
      'USA/Orlando (price 4, Italian)': formatOutput(res2),
      'India/Lucknow (price 3, Continental)': formatOutput(res3),
      'Nigeria/Lagos (cuisine Nigerian, no price)': formatOutput(res4),
    };

    const outPath = path.resolve(process.cwd(), 'src/tests/fixtures/regression_fixtures.json');
    fs.writeFileSync(outPath, JSON.stringify(baseline, null, 2), 'utf-8');
    console.log('BASELINE_CAPTURED_SUCCESSFULLY');
    console.log(JSON.stringify(baseline, null, 2));

    expect(res1.qualifyingPool.length).toBeGreaterThan(0);
    expect(res2.qualifyingPool.length).toBeGreaterThan(0);
    expect(res3.qualifyingPool.length).toBeGreaterThan(0);
    expect(res4.qualifyingPool.length).toBeGreaterThan(0);
  });
});
