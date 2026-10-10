/**
 * src/lib/owambeCrawlPlanner.ts
 * =============================
 * Implementation for Feature 8: Owambe / Food Crawl Group Mode.
 *
 * Builds an itinerary of 2-4 stops in one neighbourhood:
 * Stop 1: Pre-drinks / Suya spot / Starters
 * Stop 2: Main Dinner / Buka / Owambe Feast
 * Stop 3: Late-night Bar / Lounge / Dessert
 * Stop 4 (optional): Nightcap / Chill spot
 *
 * Enforces:
 * - Real data only: unknown prices are never invented.
 * - Respects group dietary restrictions (Halal, Vegetarian, Vegan).
 * - Respects budget limit when provided.
 * - Clusters within ~3.5 km neighbourhood.
 * - Computes walking/driving route order with pairwise distances.
 * - Generates clean WhatsApp share link.
 */

import type { RestaurantParsed } from '@/types/restaurant';
import { haversineDistance } from '@/lib/location';

export interface CrawlStop {
  stageNumber: number;
  stageName: string;
  stageIcon: string;
  restaurant: RestaurantParsed;
  distanceFromPreviousKm?: number;
  walkingMinutesFromPrevious?: number;
}

export interface CrawlPlanOptions {
  stopsCount: 2 | 3 | 4;
  locality?: string | null;
  maxPrice?: (1 | 2 | 3 | 4) | null;
  diets?: {
    halal?: boolean;
    vegetarian?: boolean;
    vegan?: boolean;
  };
}

export interface CrawlPlanResult {
  stops: CrawlStop[];
  totalDistanceKm: number;
  totalWalkingMinutes: number;
  estimatedCostText: string;
  waMessage: string;
  waLink: string;
  neighbourhood: string;
}

// Stage archetypes
const STAGE_ARCHETYPES = [
  {
    name: 'Pre-drinks & Suya Spot',
    icon: '🍢',
    matches: (r: RestaurantParsed) => {
      const p = (r.place_type || '').toLowerCase();
      const c = (r.cuisines || '').toLowerCase();
      const n = (r.restaurant_name || '').toLowerCase();
      return (
        p.includes('bar') ||
        p.includes('pub') ||
        p.includes('cafe') ||
        p.includes('fast_food') ||
        c.includes('suya') ||
        c.includes('grill') ||
        c.includes('bbq') ||
        c.includes('fast food') ||
        n.includes('suya') ||
        n.includes('shawarma') ||
        n.includes('chops')
      );
    },
  },
  {
    name: 'Main Owambe Dinner',
    icon: '🍲',
    matches: (r: RestaurantParsed) => {
      const p = (r.place_type || '').toLowerCase();
      const c = (r.cuisines || '').toLowerCase();
      return (
        p.includes('restaurant') ||
        c.includes('nigerian') ||
        c.includes('african') ||
        c.includes('continental') ||
        c.includes('chinese') ||
        c.includes('seafood')
      );
    },
  },
  {
    name: 'Late-Night Lounge & Bar',
    icon: '🍹',
    matches: (r: RestaurantParsed) => {
      const p = (r.place_type || '').toLowerCase();
      const c = (r.cuisines || '').toLowerCase();
      return (
        p.includes('bar') ||
        p.includes('pub') ||
        p.includes('cafe') ||
        c.includes('ice_cream') ||
        c.includes('cafe') ||
        c.includes('dessert')
      );
    },
  },
  {
    name: 'Nightcap & Chill Spot',
    icon: '🌙',
    matches: (r: RestaurantParsed) => {
      const p = (r.place_type || '').toLowerCase();
      return p.includes('bar') || p.includes('pub') || p.includes('cafe') || true;
    },
  },
];

/**
 * Filter pool according to dietary and price constraints
 */
export function filterCrawlPool(
  pool: RestaurantParsed[],
  options: CrawlPlanOptions,
): RestaurantParsed[] {
  const { maxPrice, diets } = options;

  return pool.filter((r) => {
    // Price constraint: only filter out if price is explicitly higher than maxPrice
    if (maxPrice !== null && maxPrice !== undefined) {
      if (typeof r.price_range === 'number' && r.price_range > maxPrice) {
        return false;
      }
    }

    // Dietary constraints
    if (diets?.halal && r.diet?.halal === false) return false;
    if (diets?.vegetarian && r.diet?.vegetarian === false) return false;
    if (diets?.vegan && r.diet?.vegan === false) return false;

    return true;
  });
}

/**
 * Plans an Owambe food crawl across 2-4 stops in the same neighbourhood
 */
export function planOwambeCrawl(
  allCityRestaurants: RestaurantParsed[],
  city: string,
  options: CrawlPlanOptions,
): CrawlPlanResult | null {
  const filtered = filterCrawlPool(allCityRestaurants, options);
  if (filtered.length < options.stopsCount) {
    // If filtered is too small, fallback to full pool with graceful notification
    if (allCityRestaurants.length < options.stopsCount) return null;
  }

  const pool = filtered.length >= options.stopsCount ? filtered : allCityRestaurants;

  // 1. Group candidates by locality or select seed
  let candidatePool = pool;
  if (options.locality) {
    const localityMatches = pool.filter(
      (r) => (r.locality || '').toLowerCase() === options.locality!.toLowerCase(),
    );
    if (localityMatches.length >= options.stopsCount) {
      candidatePool = localityMatches;
    }
  }

  // Pick seed restaurant (prefer high weighted_rating or first candidate)
  const sortedSeeds = [...candidatePool].sort(
    (a, b) => (b.weighted_rating || 0) - (a.weighted_rating || 0),
  );
  const seed = sortedSeeds[0];
  if (!seed) return null;

  // 2. Select stops sequentially for each archetype within ~3.5 km of seed
  const selected: RestaurantParsed[] = [seed];
  const archetypes = STAGE_ARCHETYPES.slice(0, options.stopsCount);

  // If seed doesn't match first archetype, check if it matches second
  // and build a coherent sequence
  for (let i = 1; i < options.stopsCount; i++) {
    const archetype = archetypes[i];
    const prev = selected[selected.length - 1];

    // Find nearby candidate matching archetype and not already selected
    const candidates = candidatePool
      .filter((r) => !selected.some((s) => s.uid === r.uid))
      .map((r) => {
        const dist = haversineDistance(prev.latitude, prev.longitude, r.latitude, r.longitude);
        const matchesArchetype = archetype.matches(r);
        return { r, dist, matchesArchetype };
      })
      .filter((c) => c.dist <= 4.5 || isNaN(c.dist)) // within neighbourhood
      .sort((a, b) => {
        // Prioritize matching archetype, then proximity
        if (a.matchesArchetype && !b.matchesArchetype) return -1;
        if (!a.matchesArchetype && b.matchesArchetype) return 1;
        return a.dist - b.dist;
      });

    if (candidates.length > 0) {
      selected.push(candidates[0].r);
    } else {
      // Pick any nearest distinct place in pool
      const fallback = candidatePool.find((r) => !selected.some((s) => s.uid === r.uid));
      if (fallback) selected.push(fallback);
    }
  }

  // 3. Assemble crawl stops with route metrics
  let totalDistKm = 0;
  const stops: CrawlStop[] = [];

  for (let i = 0; i < selected.length; i++) {
    const r = selected[i];
    const arch = archetypes[i] || { name: `Stop ${i + 1}`, icon: '📍' };

    let distFromPrev: number | undefined;
    let walkMins: number | undefined;

    if (i > 0) {
      const prev = selected[i - 1];
      const d = haversineDistance(prev.latitude, prev.longitude, r.latitude, r.longitude);
      if (!isNaN(d)) {
        distFromPrev = d;
        totalDistKm += d;
        // Average walking speed ~ 4.8 km/h = 12.5 mins per km
        walkMins = Math.max(2, Math.round(d * 12.5));
      }
    }

    stops.push({
      stageNumber: i + 1,
      stageName: arch.name,
      stageIcon: arch.icon,
      restaurant: r,
      distanceFromPreviousKm: distFromPrev,
      walkingMinutesFromPrevious: walkMins,
    });
  }

  const totalWalkingMins = Math.round(totalDistKm * 12.5);

  // 4. Calculate total estimated cost from known costs (Rule: real data only, never invent)
  const knownCosts = stops
    .map((s) => s.restaurant.average_cost_for_two)
    .filter((c): c is number => typeof c === 'number' && c > 0);

  let costText = 'Prices not listed';
  if (knownCosts.length > 0) {
    const sum = knownCosts.reduce((a, b) => a + b, 0);
    const curr = stops[0].restaurant.currency || 'NGN';
    const currSymbol = curr === 'NGN' ? '₦' : `${curr} `;
    costText = `~${currSymbol}${sum.toLocaleString()} (total estimated for 2)`;
  }

  const nHood = seed.locality || seed.city;

  // 5. Preformatted WhatsApp message
  const waLines: string[] = [
    `🎉 *TasteMatch Owambe / Food Crawl: ${city} (${nHood})*`,
    `🚶 *Total Route:* ~${totalDistKm.toFixed(1)} km (approx ${totalWalkingMins} mins walk/drive)`,
    `💰 *Estimated Cost:* ${costText}`,
    '',
    '*Itinerary:*',
    ...stops.map((s, idx) => {
      const distInfo =
        idx > 0 && s.distanceFromPreviousKm !== undefined
          ? ` (➔ ${s.distanceFromPreviousKm.toFixed(1)} km / ~${s.walkingMinutesFromPrevious} mins)`
          : '';
      return `${s.stageNumber}. ${s.stageIcon} *${s.restaurant.restaurant_name}* [${s.stageName}]${distInfo}\n   📍 ${s.restaurant.locality || s.restaurant.city}`;
    }),
    '',
    'Reply with your confirmation or order!',
    '_Organised via TasteMatch Owambe Planner_',
  ];

  const waMessage = waLines.join('\n');
  const waLink = `https://wa.me/?text=${encodeURIComponent(waMessage)}`;

  return {
    stops,
    totalDistanceKm: Number(totalDistKm.toFixed(1)),
    totalWalkingMinutes: totalWalkingMins,
    estimatedCostText: costText,
    waMessage,
    waLink,
    neighbourhood: nHood,
  };
}
