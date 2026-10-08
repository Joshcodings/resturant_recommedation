import type { RestaurantParsed } from '@/types/restaurant';

export interface GroupScoredRestaurant extends RestaurantParsed {
  matchA: number;    // 0–1
  matchB: number;    // 0–1
  consensus: number; // min(matchA, matchB)
  rank: number;
}

function computeMatch(wanted: Set<string>, r: RestaurantParsed): number {
  if (wanted.size === 0) return 1.0; // no preference = perfect match
  const served = new Set(r.cuisineList.map(c => c.toLowerCase()));
  let hits = 0;
  for (const w of wanted) {
    if (served.has(w.toLowerCase())) hits++;
  }
  return hits / wanted.size;
}

/**
 * Group mode recommendation.
 * Ranks by min(matchA, matchB) descending, then weighted_rating descending.
 * Does NOT use an additive blend (amendment 2).
 */
export function groupRecommend(
  allData: RestaurantParsed[],
  country: string,
  city: string,
  cuisinesA: string[],
  cuisinesB: string[],
  priceRange: 1 | 2 | 3 | 4 | null,
  topN = 5,
): GroupScoredRestaurant[] {
  let pool = allData.filter(r => r.country === country && r.city === city);
  if (priceRange !== null) {
    pool = pool.filter(r => r.price_range === priceRange);
  }

  const wantedA = new Set(cuisinesA);
  const wantedB = new Set(cuisinesB);

  const scored: GroupScoredRestaurant[] = pool.map(r => {
    const matchA    = computeMatch(wantedA, r);
    const matchB    = computeMatch(wantedB, r);
    const consensus = Math.min(matchA, matchB);
    return { ...r, matchA, matchB, consensus, rank: 0 };
  });

  // Sort: min(matchA, matchB) desc, then weighted_rating desc (amendment 2 — no additive blend)
  scored.sort((a, b) =>
    b.consensus - a.consensus || (b.weighted_rating || 0) - (a.weighted_rating || 0)
  );

  // Deduplicate by name
  const seen = new Set<string>();
  const deduped: GroupScoredRestaurant[] = [];
  for (const r of scored) {
    if (!seen.has(r.restaurant_name)) {
      seen.add(r.restaurant_name);
      deduped.push({ ...r, rank: deduped.length + 1 });
    }
  }

  return deduped.slice(0, topN);
}
