import type { RestaurantParsed } from '@/types/restaurant';

/**
 * Build the global cuisine vocabulary from all restaurants.
 * Returns a sorted array of unique cuisine strings.
 * Amendment: uses all cuisines across ALL countries (global 144-cuisine vocabulary).
 */
export function buildVocabulary(allData: RestaurantParsed[]): string[] {
  const set = new Set<string>();
  for (const r of allData) {
    for (const c of r.cuisineList) set.add(c);
  }
  return [...set].sort();
}

/**
 * Build a multi-hot cuisine vector for a restaurant given a vocabulary.
 */
function cuisineVector(cuisineList: string[], vocab: string[]): number[] {
  return vocab.map(c => (cuisineList.includes(c) ? 1 : 0));
}

/**
 * Cosine similarity between two equal-length vectors.
 * Returns 0 if either vector is all-zeros.
 */
function cosine(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface SimilarityResult extends RestaurantParsed {
  similarity: number;
}

/**
 * "More like this" — find top N similar restaurants.
 *
 * similarity = 0.55 * cuisine cosine (global vocab) 
 *            + 0.25 * (1 - |price_diff| / 3)
 *            + 0.20 * (1 - |rating_diff| / 5)
 *
 * Same city is prioritised first; if fewer than topN found, extend to same country.
 * Excludes the target restaurant itself.
 */
export function morelikeThis(
  target: RestaurantParsed,
  allData: RestaurantParsed[],
  vocab: string[],
  topN = 5,
): SimilarityResult[] {
  const targetVec = cuisineVector(target.cuisineList, vocab);

  function score(r: RestaurantParsed): number {
    const cuisineSim = cosine(targetVec, cuisineVector(r.cuisineList, vocab));
    const priceSim = (r.price_range !== null && target.price_range !== null)
      ? 1 - Math.abs(r.price_range - target.price_range) / 3
      : 0.5; // fallback neutral score if either is null
    
    const ratingSim = (r.aggregate_rating !== null && target.aggregate_rating !== null)
      ? 1 - Math.abs(r.aggregate_rating - target.aggregate_rating) / 5
      : 0.5; // fallback neutral score
      
    return 0.55 * cuisineSim + 0.25 * priceSim + 0.20 * ratingSim;
  }

  const candidates = allData.filter(r => r.restaurant_id !== target.restaurant_id);

  // Same city first
  const sameCity = candidates
    .filter(r => r.city === target.city)
    .map(r => ({ ...r, similarity: score(r) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN);

  if (sameCity.length >= topN) return sameCity;

  // Extend to same country
  const cityIds = new Set(sameCity.map(r => r.restaurant_id));
  const fromCountry = candidates
    .filter(r => r.country === target.country && !cityIds.has(r.restaurant_id))
    .map(r => ({ ...r, similarity: score(r) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN - sameCity.length);

  return [...sameCity, ...fromCountry].slice(0, topN);
}
