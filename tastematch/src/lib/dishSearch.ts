import dishDictionaryRaw from '@/config/dishDictionary.json';
import type { RestaurantParsed } from '@/types/restaurant';

export interface DishEntry {
  displayName: string;
  cuisineTags: string[];
  nameKeywords: string[];
}

export const DISH_DICTIONARY: Record<string, DishEntry> = dishDictionaryRaw;

export interface MatchReason {
  type: 'cuisine_tag' | 'name_match';
  text: string; // "cuisine tag: nigerian" or "matched in name"
}

export function normalizeQuery(q: string): string {
  return q
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Searches for dish matches or text matches in a restaurant.
 * Adheres strictly to Hard Rule 8 and Feature 1:
 * - Shows WHY they matched: "cuisine tag: <tag>" or "matched in name" (never both claims mixed).
 * - Never implies a place serves a dish unless a cuisine tag says so.
 * - Name match is labelled strictly "matched in name".
 */
export function matchDishOrKeyword(
  restaurant: RestaurantParsed,
  query: string
): MatchReason | null {
  const q = normalizeQuery(query);
  if (!q) return null;

  const rName = normalizeQuery(restaurant.restaurant_name);
  const rCuisines = restaurant.cuisineList.map(normalizeQuery);

  // Check known dishes in the dictionary
  for (const [key, entry] of Object.entries(DISH_DICTIONARY)) {
    const keyNorm = normalizeQuery(key);
    const matchesDishQuery = q.includes(keyNorm) || keyNorm.includes(q);

    if (matchesDishQuery) {
      // 1. Check cuisine tags first
      for (const tag of entry.cuisineTags) {
        const tagNorm = normalizeQuery(tag);
        const found = rCuisines.find(c => c.includes(tagNorm) || tagNorm.includes(c));
        if (found) {
          return {
            type: 'cuisine_tag',
            text: `cuisine tag: ${found}`,
          };
        }
      }

      // 2. Check name keywords (strictly labelled "matched in name")
      for (const kw of entry.nameKeywords) {
        const kwNorm = normalizeQuery(kw);
        if (rName.includes(kwNorm)) {
          return {
            type: 'name_match',
            text: 'matched in name',
          };
        }
      }
    }
  }

  // General text search fallbacks:
  // Check if query matches any listed cuisine tag
  for (const c of rCuisines) {
    if (c.includes(q) || q.includes(c)) {
      return {
        type: 'cuisine_tag',
        text: `cuisine tag: ${c}`,
      };
    }
  }

  // Check if query matches name
  if (rName.includes(q)) {
    return {
      type: 'name_match',
      text: 'matched in name',
    };
  }

  return null;
}
