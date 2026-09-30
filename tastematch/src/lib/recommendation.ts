import type { RestaurantParsed } from '@/types/restaurant';
import type {
  RecommendationQuery,
  RecommendationResult,
  RelaxationStage,
  ScoredRestaurant,
} from '@/types/recommendation';
import { STAGE_NOTICES, STAGE_NOTICES_ANY_PRICE } from '@/types/recommendation';
import { whyThisPick } from '@/lib/formatters';
import type { MoodPreset } from '@/config/presets';

// ─── Priority Slider Weights ─────────────────────────────────────────────────

export interface PriorityWeights {
  rating: number;       // 0–100
  cuisineMatch: number; // 0–100
  popularity: number;   // 0–100
  cost: number;         // 0–100 (higher = prefer cheaper)
}

export const DEFAULT_WEIGHTS: PriorityWeights = {
  rating: 50,
  cuisineMatch: 50,
  popularity: 50,
  cost: 50,
};

/**
 * Live re-ranking score from priority slider weights.
 * All features normalized to [0,1]. Popularity clamped ≤ 1 (amendment 11).
 */
export function liveScore(r: ScoredRestaurant, weights: PriorityWeights): number {
  const wR    = weights.rating       / 50;
  const wC    = weights.cuisineMatch / 50;
  const wP    = weights.popularity   / 50;
  const wCost = weights.cost         / 50;

  const fRating  = r.weighted_rating / 5.0;
  const fCuisine = r.cuisineMatch;
  const fPop     = Math.min(1.0, Math.log10(r.votes + 1) / Math.log10(5000)); // clamped (amendment 11)
  const fCost    = 1.0 - (r.price_range - 1) / 3;

  return wR * fRating + wC * fCuisine + wP * fPop + wCost * fCost;
}

// ─── Cuisine Match ───────────────────────────────────────────────────────────

function computeCuisineMatch(wanted: Set<string>, cuisineList: string[]): number {
  if (wanted.size === 0) return 0;
  const restaurantSet = new Set(cuisineList.map(c => c.toLowerCase()));
  let hits = 0;
  for (const w of wanted) {
    if (restaurantSet.has(w.toLowerCase())) hits++;
  }
  return hits / wanted.size;
}

// ─── Mood Preset Hard Filter (amendment 4) ──────────────────────────────────

export function applyPresetFilter(pool: RestaurantParsed[], preset: MoodPreset): RestaurantParsed[] {
  return pool.filter(r => {
    if (preset.minRating     !== null && r.aggregate_rating < preset.minRating)  return false;
    if (preset.minVotes      !== null && r.votes < preset.minVotes)               return false;
    if (preset.maxVotes      !== null && r.votes > preset.maxVotes)               return false;
    if (preset.requireTableBooking  && r.has_table_booking  !== 1)               return false;
    if (preset.requireOnlineDelivery && r.has_online_delivery !== 1)             return false;
    if (preset.minPriceRange !== null && r.price_range < preset.minPriceRange)   return false;
    if (preset.maxPriceRange !== null && r.price_range > preset.maxPriceRange)   return false;
    return true;
  });
}

// ─── Core Recommendation Engine ──────────────────────────────────────────────

/**
 * Pure recommendation function.
 *
 * Returns the FULL qualifying pool from the chosen relaxation stage.
 * The caller (UI) applies priority-slider live-ranking and takes topN.
 * This separation enables sliders to re-rank without re-running stage logic (amendment 1).
 *
 * Amendment 4: presets are hard filters applied before stages.
 * Amendment 5: when priceRange is null ("Any"), skip price-relaxation stages.
 * Amendment 6: cityRestaurantCount is computed dynamically from loaded data.
 * Amendment 13: stage 'exact_all' returns null notice (UI shows "Exact match" label).
 */
export function recommend(
  allData: RestaurantParsed[],
  query: RecommendationQuery,
  activePreset: MoodPreset | null = null,
): RecommendationResult {
  const { country, city, priceRange, cuisines, needsTableBooking, needsOnlineDelivery, topN } = query;

  // ── 1. Base pool ─────────────────────────────────────────────────────────
  let pool = allData.filter(r => r.country === country && r.city === city);
  const cityRestaurantCount = pool.length;   // dynamic (amendment 6)
  const isLimitedData = cityRestaurantCount < 30;

  if (needsTableBooking)   pool = pool.filter(r => r.has_table_booking   === 1);
  if (needsOnlineDelivery) pool = pool.filter(r => r.has_online_delivery  === 1);

  // ── 2. Mood preset hard filters (amendment 4) ─────────────────────────────
  if (activePreset) pool = applyPresetFilter(pool, activePreset);

  if (pool.length === 0) {
    return {
      qualifyingPool: [],
      stage: 'exact_all',
      notice: 'No rated restaurants match this city and these service needs.',
      cityRestaurantCount,
      isLimitedData,
    };
  }

  // ── 3. Cuisine match & base score ────────────────────────────────────────
  const wanted  = new Set(cuisines);
  const anyPrice = priceRange === null;

  const scored: ScoredRestaurant[] = pool.map(r => {
    const cuisineMatch = computeCuisineMatch(wanted, r.cuisineList);
    const score        = r.weighted_rating + 0.5 * cuisineMatch;
    return { ...r, cuisineMatch, score, rank: 0, whyThisPick: '' };
  });

  // ── 4. Progressive relaxation stages ─────────────────────────────────────
  type StageSpec = {
    id: RelaxationStage;
    priceTol: number | 'any';
    needCuisine: boolean;
    skipWhenAnyPrice?: boolean;
  };

  const stages: StageSpec[] = [
    { id: 'exact_all',                         priceTol: 0,     needCuisine: true  },
    { id: 'relaxed_price_1_cuisine_kept',       priceTol: 1,     needCuisine: true,  skipWhenAnyPrice: true },
    { id: 'relaxed_price_1_cuisine_ignored',    priceTol: 1,     needCuisine: false, skipWhenAnyPrice: true },
    { id: 'relaxed_any_price_cuisine_ignored',  priceTol: 'any', needCuisine: false },
  ];

  let chosenStage: RelaxationStage = 'relaxed_any_price_cuisine_ignored';
  let finalPool: ScoredRestaurant[] = [];

  for (const stage of stages) {
    if (anyPrice && stage.skipWhenAnyPrice) continue;

    let sub = scored;

    if (!anyPrice && stage.priceTol !== 'any') {
      sub = sub.filter(r => Math.abs(r.price_range - priceRange!) <= (stage.priceTol as number));
    }
    if (stage.needCuisine && wanted.size > 0) {
      sub = sub.filter(r => r.cuisineMatch > 0);
    }

    // Sort by base score; deduplicate by name
    const sorted = [...sub].sort((a, b) => b.score - a.score || b.votes - a.votes);
    const seen = new Set<string>();
    const deduped: ScoredRestaurant[] = [];
    for (const r of sorted) {
      if (!seen.has(r.restaurant_name)) {
        seen.add(r.restaurant_name);
        deduped.push(r);
      }
    }

    if (deduped.length >= topN || stage.id === 'relaxed_any_price_cuisine_ignored') {
      chosenStage = stage.id;
      finalPool   = deduped;
      break;
    }
  }

  // ── 5. Generate "Why this pick" per restaurant ────────────────────────────
  const noticeMap = anyPrice ? STAGE_NOTICES_ANY_PRICE : STAGE_NOTICES;
  const notice    = noticeMap[chosenStage];

  const qualifyingPool: ScoredRestaurant[] = finalPool.map(r => ({
    ...r,
    whyThisPick: whyThisPick({
      cuisineMatch:     r.cuisineMatch,
      chosenCuisines:   cuisines,
      servedCuisines:   r.cuisineList,
      rating:           r.aggregate_rating,
      votes:            r.votes,
      priceRange:       r.price_range,
      inputPriceRange:  priceRange,
      stage:            chosenStage,
      locality:         r.locality,
    }),
  }));

  return { qualifyingPool, stage: chosenStage, notice, cityRestaurantCount, isLimitedData };
}
