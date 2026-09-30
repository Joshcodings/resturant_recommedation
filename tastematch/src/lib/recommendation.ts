import type { RestaurantParsed } from '@/types/restaurant';
import type {
  RecommendationQuery,
  RecommendationResult,
  RelaxationStage,
  ScoredRestaurant,
  ExplanationBreakdown,
} from '@/types/recommendation';
import { STAGE_NOTICES, STAGE_NOTICES_ANY_PRICE } from '@/types/recommendation';
import { whyThisPick } from '@/lib/formatters';
import type { MoodPreset } from '@/config/presets';
import { haversineDistance, computeCentroid, isValidCoordinate } from '@/lib/location';
import { PRICE_TIERS } from '@/lib/currency';

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

// ─── Diversification (Maximal Marginal Relevance - MMR) ──────────────────────

/**
 * Computes pairwise similarity between two restaurants based on cuisine Jaccard and locality.
 * Returns a value in [0, 1].
 */
export function computePairwiseSimilarity(a: RestaurantParsed, b: RestaurantParsed): number {
  const setA = new Set(a.cuisineList.map(c => c.toLowerCase()));
  const setB = new Set(b.cuisineList.map(c => c.toLowerCase()));

  let intersection = 0;
  for (const c of setA) {
    if (setB.has(c)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  const cuisineJaccard = union > 0 ? intersection / union : 0;
  const sameLocality = a.locality.toLowerCase() === b.locality.toLowerCase() ? 1.0 : 0.0;

  return 0.7 * cuisineJaccard + 0.3 * sameLocality;
}

/**
 * Applies Maximal Marginal Relevance (MMR) diversification to candidate restaurants.
 * Balances relevance (higher score) with novelty (dissimilarity to already picked items).
 */
export function applyMMRDiversification(
  candidates: ScoredRestaurant[],
  lambda = 0.85,
  topN = 10,
): ScoredRestaurant[] {
  if (candidates.length <= 1) return candidates;

  const maxScore = Math.max(...candidates.map(c => c.score));
  const minScore = Math.min(...candidates.map(c => c.score));
  const scoreSpan = maxScore - minScore || 1;

  const remaining = [...candidates];
  const selected: ScoredRestaurant[] = [];

  while (remaining.length > 0 && selected.length < topN) {
    let bestIdx = 0;
    let bestMMR = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const normScore = (candidate.score - minScore) / scoreSpan;

      let maxSimToSelected = 0;
      for (const sel of selected) {
        const sim = computePairwiseSimilarity(candidate, sel);
        if (sim > maxSimToSelected) maxSimToSelected = sim;
      }

      const mmr = lambda * normScore - (1 - lambda) * maxSimToSelected;
      if (mmr > bestMMR) {
        bestMMR = mmr;
        bestIdx = i;
      }
    }

    const [chosen] = remaining.splice(bestIdx, 1);
    selected.push(chosen);
  }

  // Append any remaining candidates so full qualifying pool is preserved
  return [...selected, ...remaining];
}

// ─── Explainability Generator ────────────────────────────────────────────────

function buildExplanation(
  r: ScoredRestaurant,
  query: RecommendationQuery,
  _stage: RelaxationStage,
  relaxedCriteria: string[],
): ExplanationBreakdown {
  const { cuisines, priceRange } = query;
  const matched = cuisines.filter(c =>
    r.cuisineList.some(rc => rc.toLowerCase() === c.toLowerCase())
  );

  const cuisineSummary =
    cuisines.length === 0
      ? `Serves ${r.cuisineList.slice(0, 3).join(', ')}`
      : matched.length > 0
      ? `Matches ${matched.length} of ${cuisines.length} requested cuisines (${matched.join(', ')})`
      : `Popular choice serving ${r.cuisineList.slice(0, 2).join(', ')}`;

  const qualitySummary = `Bayesian weighted rating ${r.weighted_rating.toFixed(2)}/5.0 (${r.aggregate_rating.toFixed(1)} raw from ${r.votes.toLocaleString()} votes)`;

  const tier = PRICE_TIERS[(r.price_range as 1 | 2 | 3 | 4) || 2];
  const priceSummary =
    priceRange === null
      ? `${tier.name} tier (${tier.dots})`
      : r.price_range === priceRange
      ? `Exact match for ${tier.name} tier (${tier.dots})`
      : `${tier.name} tier (${tier.dots}), within tolerance of your requested tier`;

  const popularitySummary =
    r.votes >= 500
      ? `High crowd confidence with ${r.votes.toLocaleString()} verified ratings`
      : r.votes >= 50
      ? `Solid community feedback (${r.votes.toLocaleString()} reviews)`
      : `Boutique discovery (${r.votes.toLocaleString()} reviews)`;

  const services: string[] = [];
  if (r.has_table_booking === 1) services.push('table booking');
  if (r.has_online_delivery === 1) services.push('online delivery');
  const servicesSummary = services.length > 0 ? `Offers ${services.join(' & ')}` : undefined;

  const locationSummary = r.distanceKm !== undefined
    ? `${r.locality}, ${r.city} (${r.distanceKm.toFixed(1)} km from center)`
    : `${r.locality}, ${r.city}`;

  return {
    cuisineSummary,
    qualitySummary,
    priceSummary,
    popularitySummary,
    servicesSummary,
    locationSummary,
    relaxedItems: relaxedCriteria.length > 0 ? relaxedCriteria : undefined,
  };
}

// ─── Core Recommendation Engine ──────────────────────────────────────────────

/**
 * Pure recommendation pipeline function.
 *
 * Architecture:
 * User Preferences -> Candidate Generation -> Filtering -> Content Similarity
 * -> Preference Matching -> Quality Score -> Progressive Relaxation / Strict Mode
 * -> Diversification (MMR) -> Explainable Recommendation
 */
export function recommend(
  allData: RestaurantParsed[],
  query: RecommendationQuery,
  activePreset: MoodPreset | null = null,
): RecommendationResult {
  const {
    country,
    city,
    priceRange,
    cuisines,
    needsTableBooking,
    needsOnlineDelivery,
    topN,
    mode = 'flexible',
    radiusKm = null,
    diversificationLambda = 0.85,
  } = query;

  // ── 1. Candidate Generation ───────────────────────────────────────────────
  let pool = allData.filter(r => r.country === country && r.city === city);
  const cityRestaurantCount = pool.length;
  const isLimitedData = cityRestaurantCount < 30;

  // Compute centroid and distances
  const centroid = computeCentroid(pool);

  // ── 2. Filtering ──────────────────────────────────────────────────────────
  if (needsTableBooking)   pool = pool.filter(r => r.has_table_booking   === 1);
  if (needsOnlineDelivery) pool = pool.filter(r => r.has_online_delivery  === 1);

  if (activePreset) pool = applyPresetFilter(pool, activePreset);

  if (pool.length === 0) {
    return {
      qualifyingPool: [],
      stage: 'exact_all',
      notice: 'No rated restaurants match this city and these service needs.',
      cityRestaurantCount,
      isLimitedData,
      mode,
      relaxedCriteria: [],
    };
  }

  // ── 3. Content Similarity & Base Scoring ──────────────────────────────────
  const wanted = new Set(cuisines);
  const anyPrice = priceRange === null;

  const scored: ScoredRestaurant[] = pool.map(r => {
    const cuisineMatch = computeCuisineMatch(wanted, r.cuisineList);
    const score        = r.weighted_rating + 0.5 * cuisineMatch;

    let distanceKm: number | undefined;
    if (centroid && isValidCoordinate(r.latitude, r.longitude)) {
      distanceKm = haversineDistance(
        centroid.latitude,
        centroid.longitude,
        r.latitude,
        r.longitude,
      );
    }

    return {
      ...r,
      cuisineMatch,
      score,
      rank: 0,
      whyThisPick: '',
      distanceKm,
    };
  });

  // Filter by radius if requested and distances are available
  let filteredScored = scored;
  if (radiusKm !== null && radiusKm > 0) {
    const withinRadius = scored.filter(
      r => r.distanceKm !== undefined && r.distanceKm <= radiusKm
    );
    if (withinRadius.length > 0) {
      filteredScored = withinRadius;
    }
  }

  // ── 4. Progressive Relaxation or Strict Mode ──────────────────────────────
  let chosenStage: RelaxationStage = 'exact_all';
  let finalPool: ScoredRestaurant[] = [];
  const relaxedCriteria: string[] = [];

  if (mode === 'strict') {
    let sub = filteredScored;
    if (!anyPrice) {
      sub = sub.filter(r => r.price_range === priceRange);
    }
    if (wanted.size > 0) {
      sub = sub.filter(r => r.cuisineMatch > 0);
    }

    const sorted = [...sub].sort((a, b) => b.score - a.score || b.votes - a.votes);
    const seen = new Set<string>();
    const deduped: ScoredRestaurant[] = [];
    for (const r of sorted) {
      if (!seen.has(r.restaurant_name)) {
        seen.add(r.restaurant_name);
        deduped.push(r);
      }
    }

    chosenStage = 'exact_all';
    finalPool = deduped;
  } else {
    // Flexible Mode: Progressive Relaxation
    type StageSpec = {
      id: RelaxationStage;
      priceTol: number | 'any';
      needCuisine: boolean;
      skipWhenAnyPrice?: boolean;
      criteriaRelaxed: string[];
    };

    const stages: StageSpec[] = [
      { id: 'exact_all', priceTol: 0, needCuisine: true, criteriaRelaxed: [] },
      {
        id: 'relaxed_price_1_cuisine_kept',
        priceTol: 1,
        needCuisine: true,
        skipWhenAnyPrice: true,
        criteriaRelaxed: ['Price range relaxed to ±1 tier'],
      },
      {
        id: 'relaxed_price_1_cuisine_ignored',
        priceTol: 1,
        needCuisine: false,
        skipWhenAnyPrice: true,
        criteriaRelaxed: ['Price range relaxed to ±1 tier', 'Cuisine requirement broadened'],
      },
      {
        id: 'relaxed_any_price_cuisine_ignored',
        priceTol: 'any',
        needCuisine: false,
        criteriaRelaxed: ['Price constraint removed', 'Cuisine requirement broadened'],
      },
    ];

    for (const stage of stages) {
      if (anyPrice && stage.skipWhenAnyPrice) continue;

      let sub = filteredScored;

      if (!anyPrice && stage.priceTol !== 'any') {
        sub = sub.filter(r => Math.abs(r.price_range - priceRange!) <= (stage.priceTol as number));
      }
      if (stage.needCuisine && wanted.size > 0) {
        sub = sub.filter(r => r.cuisineMatch > 0);
      }

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
        finalPool = deduped;
        relaxedCriteria.push(...stage.criteriaRelaxed);
        break;
      }
    }
  }

  // ── 5. Diversification (MMR) ─────────────────────────────────────────────
  const diversifiedPool = applyMMRDiversification(finalPool, diversificationLambda, Math.max(topN, 10));

  // ── 6. Explainable AI & "Why this pick" Generation ───────────────────────
  const noticeMap = anyPrice ? STAGE_NOTICES_ANY_PRICE : STAGE_NOTICES;
  let notice = noticeMap[chosenStage];

  if (mode === 'strict' && finalPool.length === 0) {
    notice = 'Strict Mode: No restaurants matched all requested criteria exactly.';
  }

  const qualifyingPool: ScoredRestaurant[] = diversifiedPool.map(r => ({
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
    explanation: buildExplanation(r, query, chosenStage, relaxedCriteria),
  }));

  return {
    qualifyingPool,
    stage: chosenStage,
    notice,
    cityRestaurantCount,
    isLimitedData,
    mode,
    relaxedCriteria,
  };
}

