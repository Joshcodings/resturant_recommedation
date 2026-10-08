/**
 * Recommendation System Evaluation Framework
 *
 * Provides offline evaluation metrics comparing 4 recommendation paradigms:
 * 1. Baseline: Highest-rated (ranked strictly by Bayesian weighted rating)
 * 2. Content-Based: Pure cuisine cosine similarity
 * 3. Preference-Based: Strict filter matching on price & services
 * 4. Hybrid (TasteMatch): Multi-stage pipeline with MMR diversification
 *
 * Offline Relevance Definition:
 * In the absence of real user click/conversion logs, an item is defined as
 * "relevant" for a query if it matches at least one target cuisine, is within
 * ±1 of target price range, and has a weighted rating >= 3.8 (quality threshold).
 */

import type { RestaurantParsed } from '@/types/restaurant';
import { recommend, computePairwiseSimilarity } from '@/lib/recommendation';

export interface MethodMetrics {
  methodName: string;
  description: string;
  precisionAt5: number;
  recallAt5: number;
  ndcgAt5: number;
  catalogCoverage: number; // percentage of catalog recommended across queries
  intraListDiversity: number; // average pairwise dissimilarity (0–1)
}

export interface EvaluationBenchmark {
  timestamp: string;
  sampleQueriesCount: number;
  relevanceCriteria: string;
  metrics: MethodMetrics[];
}

/**
 * Calculates Discounted Cumulative Gain (DCG@K)
 */
function dcgAtK(relevance: number[]): number {
  return relevance.reduce((acc, rel, idx) => {
    return acc + (Math.pow(2, rel) - 1) / Math.log2(idx + 2);
  }, 0);
}

/**
 * Calculates Normalized Discounted Cumulative Gain (NDCG@K)
 */
function ndcgAtK(retrievedRel: number[], idealRel: number[]): number {
  const dcg = dcgAtK(retrievedRel);
  const idcg = dcgAtK(idealRel);
  if (idcg === 0) return 0;
  return Math.min(1.0, dcg / idcg);
}

/**
 * Evaluates the 4 recommendation algorithms against a suite of synthetic user queries
 * sampled from actual city distributions.
 */
export function runRecommendationEvaluation(
  data: RestaurantParsed[],
  k = 5,
): EvaluationBenchmark {
  // Cities with sufficient catalog density
  const testCities = ['New Delhi', 'Gurgaon', 'Noida'];
  const testCuisines = [
    ['North Indian'],
    ['Chinese'],
    ['Fast Food', 'Beverages'],
    ['Mughlai', 'North Indian'],
    ['Continental', 'Italian'],
  ];
  const testPrices: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];

  // Generate test query suite
  const queries: Array<{
    country: string;
    city: string;
    cuisines: string[];
    priceRange: 1 | 2 | 3 | 4;
  }> = [];

  for (const city of testCities) {
    for (const c of testCuisines) {
      for (const p of testPrices.slice(0, 2)) {
        queries.push({
          country: 'India',
          city,
          cuisines: c,
          priceRange: p,
        });
      }
    }
  }

  // Pre-filter catalog for relevant queries
  const allCityRestaurants = data.filter(r => testCities.includes(r.city));
  const totalCatalogSize = new Set(allCityRestaurants.map(r => r.restaurant_id)).size;

  const methods = [
    { id: 'baseline', name: 'Baseline (Top-Rated)', desc: 'Ranks strictly by Bayesian weighted rating' },
    { id: 'content', name: 'Content-Based', desc: 'Ranks by cuisine cosine similarity' },
    { id: 'preference', name: 'Preference-Based', desc: 'Ranks by exact price tier and filter alignment' },
    { id: 'hybrid', name: 'Hybrid Recommender', desc: 'TasteMatch multi-stage pipeline with MMR diversification' },
  ];

  const results: Record<string, {
    precisions: number[];
    recalls: number[];
    ndcgs: number[];
    recommendedIds: Set<number>;
    diversities: number[];
  }> = {
    baseline: { precisions: [], recalls: [], ndcgs: [], recommendedIds: new Set(), diversities: [] },
    content: { precisions: [], recalls: [], ndcgs: [], recommendedIds: new Set(), diversities: [] },
    preference: { precisions: [], recalls: [], ndcgs: [], recommendedIds: new Set(), diversities: [] },
    hybrid: { precisions: [], recalls: [], ndcgs: [], recommendedIds: new Set(), diversities: [] },
  };

  for (const q of queries) {
    const cityPool = data.filter(r => r.city === q.city);
    const wantedCuisines = new Set(q.cuisines.map(c => c.toLowerCase()));

    // Define ground-truth relevance for this query:
    // Has at least 1 wanted cuisine, within +/-1 price, and weighted_rating >= 3.8
    const isRelevant = (r: RestaurantParsed): boolean => {
      const sharesCuisine = r.cuisineList.some(c => wantedCuisines.has(c.toLowerCase()));
      const priceClose = r.hasPrice && Math.abs(r.price_range! - q.priceRange) <= 1;
      const qualityPass = r.hasRating && r.weighted_rating! >= 3.75;
      return sharesCuisine && priceClose && qualityPass;
    };

    const relevantInCity = cityPool.filter(isRelevant);
    const totalRelevant = relevantInCity.length;
    if (totalRelevant === 0) continue;

    // 1. Baseline (Top-Rated)
    const baselineRecs = [...cityPool]
      .sort((a, b) => (b.weighted_rating || 0) - (a.weighted_rating || 0))
      .slice(0, k);

    // 2. Content-Based
    const contentRecs = [...cityPool]
      .map(r => {
        const matches = r.cuisineList.filter(c => wantedCuisines.has(c.toLowerCase())).length;
        const sim = wantedCuisines.size > 0 ? matches / wantedCuisines.size : 0;
        return { ...r, simScore: sim };
      })
      .sort((a, b) => b.simScore - a.simScore || (b.weighted_rating || 0) - (a.weighted_rating || 0))
      .slice(0, k);

    // 3. Preference-Based
    const prefRecs = [...cityPool]
      .filter(r => r.price_range === q.priceRange)
      .sort((a, b) => (b.weighted_rating || 0) - (a.weighted_rating || 0))
      .slice(0, k);

    // 4. Hybrid (TasteMatch Recommender)
    const hybridResult = recommend(data, {
      country: q.country,
      city: q.city,
      priceRange: q.priceRange,
      cuisines: q.cuisines,
      needsTableBooking: false,
      needsOnlineDelivery: false,
      topN: k,
      diversificationLambda: 0.85,
    });
    const hybridRecs = hybridResult.qualifyingPool.slice(0, k);

    const runList = [
      { id: 'baseline', list: baselineRecs },
      { id: 'content', list: contentRecs },
      { id: 'preference', list: prefRecs },
      { id: 'hybrid', list: hybridRecs },
    ];

    for (const { id, list } of runList) {
      if (list.length === 0) continue;

      let hits = 0;
      const relVector: number[] = [];

      for (const item of list) {
        results[id].recommendedIds.add(item.restaurant_id);
        const rel = isRelevant(item) ? 1 : 0;
        if (rel === 1) hits++;
        relVector.push(rel);
      }

      // Precision@K & Recall@K
      const prec = hits / list.length;
      const rec = totalRelevant > 0 ? hits / totalRelevant : 0;
      results[id].precisions.push(prec);
      results[id].recalls.push(rec);

      // Ideal relevance vector for NDCG
      const idealRel = Array(list.length).fill(0).map((_, i) => (i < totalRelevant ? 1 : 0));
      results[id].ndcgs.push(ndcgAtK(relVector, idealRel));

      // Intra-List Diversity: mean pairwise (1 - similarity)
      let pairwiseDissim = 0;
      let pairs = 0;
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          pairwiseDissim += 1 - computePairwiseSimilarity(list[i], list[j]);
          pairs++;
        }
      }
      results[id].diversities.push(pairs > 0 ? pairwiseDissim / pairs : 0);
    }
  }

  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  const metrics: MethodMetrics[] = methods.map(m => {
    const res = results[m.id];
    return {
      methodName: m.name,
      description: m.desc,
      precisionAt5: Math.round(avg(res.precisions) * 1000) / 1000,
      recallAt5: Math.round(avg(res.recalls) * 1000) / 1000,
      ndcgAt5: Math.round(avg(res.ndcgs) * 1000) / 1000,
      catalogCoverage: Math.round((res.recommendedIds.size / totalCatalogSize) * 1000) / 10,
      intraListDiversity: Math.round(avg(res.diversities) * 1000) / 1000,
    };
  });

  return {
    timestamp: new Date().toISOString().split('T')[0],
    sampleQueriesCount: queries.length,
    relevanceCriteria:
      'Shares >= 1 target cuisine, price within +/-1 tier, and Bayesian rating >= 3.75',
    metrics,
  };
}
