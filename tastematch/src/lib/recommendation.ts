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
import { UNRATED_WEIGHTS } from '@/config/rankingWeights';
import { PRICE_TIERS } from '@/lib/currency';

export function isNum(x: number | null | undefined): x is number {
  return typeof x === 'number' && !isNaN(x) && x !== null;
}

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

  // Unrated cities fallback logic (Nigeria)
  if (!r.hasRating) {
    // According to plan: (count present of: cuisine, opening_hours, phone, website, address) / 5
    const presentCount =
      (r.cuisineList.length > 0 && r.cuisines !== 'Unspecified' ? 1 : 0) +
      (r.opening_hours ? 1 : 0) +
      (r.phone ? 1 : 0) +
      (r.website ? 1 : 0) +
      (r.address || r.locality ? 1 : 0);
    const detailScore = presentCount / 5.0;

    const prox = r.distanceKm !== undefined ? Math.max(0, 1.0 - r.distanceKm / 10.0) : 0.5;

    if (weights.cuisineMatch > 0) {
      return (
        UNRATED_WEIGHTS.withCuisineRequest.cuisineMatch * r.cuisineMatch +
        UNRATED_WEIGHTS.withCuisineRequest.proximity * prox +
        UNRATED_WEIGHTS.withCuisineRequest.listingDetail * detailScore
      );
    } else {
      return (
        UNRATED_WEIGHTS.noCuisineRequest.proximity * prox +
        UNRATED_WEIGHTS.noCuisineRequest.listingDetail * detailScore
      );
    }
  }

  const fRating  = isNum(r.weighted_rating) ? r.weighted_rating / 5.0 : 0;
  const fCuisine = r.cuisineMatch;
  const fPop     = isNum(r.votes) ? Math.min(1.0, Math.log10(r.votes + 1) / Math.log10(5000)) : 0;
  const fCost    = isNum(r.price_range) ? 1.0 - (r.price_range - 1) / 3 : 0.5;

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
    if (preset.minRating     !== null && (!isNum(r.aggregate_rating) || r.aggregate_rating < preset.minRating)) return false;
    if (preset.minVotes      !== null && (!isNum(r.votes) || r.votes < preset.minVotes)) return false;
    if (preset.maxVotes      !== null && (!isNum(r.votes) || r.votes > preset.maxVotes)) return false;
    if (preset.requireTableBooking  && r.has_table_booking  !== 1)               return false;
    if (preset.requireOnlineDelivery && r.has_online_delivery !== 1)             return false;
    if (preset.minPriceRange !== null && (!isNum(r.price_range) || r.price_range < preset.minPriceRange)) return false;
    if (preset.maxPriceRange !== null && (!isNum(r.price_range) || r.price_range > preset.maxPriceRange)) return false;
    return true;
  });
}

// ─── Diversification (Maximal Marginal Relevance - MMR) ──────────────────────

export function computePairwiseSimilarity(a: RestaurantParsed, b: RestaurantParsed): number {
  const setA = new Set(a.cuisineList.map(c => c.toLowerCase()));
  const setB = new Set(b.cuisineList.map(c => c.toLowerCase()));

  let intersection = 0;
  for (const c of setA) {
    if (setB.has(c)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  const cuisineJaccard = union > 0 ? intersection / union : 0;
  
  const locA = (a.locality || '').toLowerCase();
  const locB = (b.locality || '').toLowerCase();
  const sameLocality = (locA && locA === locB) ? 1.0 : 0.0;

  return 0.7 * cuisineJaccard + 0.3 * sameLocality;
}

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
      ? r.cuisineList.length > 0 ? `Serves ${r.cuisineList.slice(0, 3).join(', ')}` : 'Cuisine details unavailable'
      : matched.length > 0
      ? `Matches ${matched.length} of ${cuisines.length} requested cuisines (${matched.join(', ')})`
      : `Popular choice serving ${r.cuisineList.slice(0, 2).join(', ')}`;

  const qualitySummary = r.hasRating && isNum(r.weighted_rating) && isNum(r.aggregate_rating)
    ? `Bayesian weighted rating ${r.weighted_rating.toFixed(2)}/5.0 (${r.aggregate_rating.toFixed(1)} raw from ${(r.votes || 0).toLocaleString()} votes)`
    : `Sourced from OpenStreetMap (unrated region)`;

  let priceSummary = 'Price unavailable';
  if (isNum(r.price_range)) {
    const tier = PRICE_TIERS[(r.price_range as 1 | 2 | 3 | 4)];
    priceSummary = priceRange === null
      ? `${tier.name} tier (${tier.dots})`
      : r.price_range === priceRange
      ? `Exact match for ${tier.name} tier (${tier.dots})`
      : `${tier.name} tier (${tier.dots}), within tolerance of your requested tier`;
  }

  let popularitySummary = 'Popularity metrics unavailable';
  if (isNum(r.votes)) {
    popularitySummary = r.votes >= 500
      ? `High crowd confidence with ${r.votes.toLocaleString()} verified ratings`
      : r.votes >= 50
      ? `Solid community feedback (${r.votes.toLocaleString()} reviews)`
      : `Boutique discovery (${r.votes.toLocaleString()} reviews)`;
  }

  const services: string[] = [];
  if (r.has_table_booking === 1) services.push('table booking');
  if (r.has_online_delivery === 1) services.push('online delivery');
  const servicesSummary = services.length > 0 ? `Offers ${services.join(' & ')}` : undefined;

  const locName = r.locality || r.city;
  const locationSummary = r.distanceKm !== undefined
    ? `${locName} (${r.distanceKm.toFixed(1)} km from center)`
    : `${locName}`;

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

  let pool = allData.filter(r => r.country === country && r.city === city);
  const cityRestaurantCount = pool.length;
  const isLimitedData = cityRestaurantCount < 30;

  // Determine scoring mode based on city capabilities (Nigeria uses unrated)
  const isRatedCity = pool.some(r => 
    r.hasRating === true || (typeof r.aggregate_rating === 'number' && r.aggregate_rating !== null)
  );
  const scoringMode = isRatedCity ? 'rated' : 'unrated';

  const centroid = computeCentroid(pool);

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
      scoringMode,
    };
  }

  const wanted = new Set(cuisines);
  const anyPrice = priceRange === null;

  const scored: ScoredRestaurant[] = pool.map(r => {
    const cuisineMatch = computeCuisineMatch(wanted, r.cuisineList);
    let distanceKm: number | undefined;
    if (centroid && isValidCoordinate(r.latitude, r.longitude)) {
      distanceKm = haversineDistance(centroid.latitude, centroid.longitude, r.latitude, r.longitude);
    }
    
    let score = 0;
    if (isRatedCity) {
      score = (r.weighted_rating || 0) + 0.5 * cuisineMatch;
    } else {
      const detailScore = 
        ((r.phone ? 1 : 0) + (r.opening_hours ? 1 : 0) + (r.website ? 1 : 0) + ((r.address || r.locality) ? 1 : 0)) / 4.0;
      const prox = distanceKm !== undefined ? Math.max(0, 1.0 - distanceKm / 10.0) : 0.5;
      if (wanted.size > 0) {
        score = 0.5 * cuisineMatch + 0.3 * prox + 0.2 * detailScore;
      } else {
        score = 0.6 * prox + 0.4 * detailScore;
      }
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

  let filteredScored = scored;
  if (radiusKm !== null && radiusKm > 0) {
    const withinRadius = scored.filter(r => r.distanceKm !== undefined && r.distanceKm <= radiusKm);
    if (withinRadius.length > 0) filteredScored = withinRadius;
  }

  let chosenStage: RelaxationStage = 'exact_all';
  let finalPool: ScoredRestaurant[] = [];
  const relaxedCriteria: string[] = [];

  // For unrated cities, skip strict price/cuisine matching
  const effectiveMode = isRatedCity ? mode : 'flexible';

  if (effectiveMode === 'strict' && isRatedCity) {
    let sub = filteredScored;
    if (!anyPrice) sub = sub.filter(r => r.price_range === priceRange);
    if (wanted.size > 0) sub = sub.filter(r => r.cuisineMatch > 0);

    const sorted = [...sub].sort((a, b) => b.score - a.score || (b.votes || 0) - (a.votes || 0));
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
      // Skip price stages if city has no price data
      if (!isRatedCity && stage.priceTol !== 'any') continue;

      let sub = filteredScored;

      if (!anyPrice && stage.priceTol !== 'any' && isRatedCity) {
        sub = sub.filter(r => {
          if (!isNum(r.price_range)) return false;
          return Math.abs(r.price_range - (priceRange as number)) <= (stage.priceTol as number);
        });
      }
      if (stage.needCuisine && wanted.size > 0) {
        sub = sub.filter(r => r.cuisineMatch > 0);
      }

      const sorted = [...sub].sort((a, b) => b.score - a.score || (b.votes || 0) - (a.votes || 0));
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

  const diversifiedPool = applyMMRDiversification(finalPool, diversificationLambda, Math.max(topN, 10));

  const noticeMap = (anyPrice || !isRatedCity) ? STAGE_NOTICES_ANY_PRICE : STAGE_NOTICES;
  let notice = noticeMap[chosenStage];

  if (effectiveMode === 'strict' && finalPool.length === 0) {
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
    mode: effectiveMode,
    relaxedCriteria,
    scoringMode,
  };
}
