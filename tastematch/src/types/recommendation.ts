import type { RestaurantParsed } from './restaurant';

export type RelaxationStage =
  | 'exact_all'
  | 'relaxed_price_1_cuisine_kept'
  | 'relaxed_price_1_cuisine_ignored'
  | 'relaxed_any_price_cuisine_ignored';

/** Notice shown in UI for each stage (null = no banner, show "Exact match" label instead) */
export const STAGE_NOTICES: Record<RelaxationStage, string | null> = {
  exact_all: null,
  relaxed_price_1_cuisine_kept:
    'No exact price match. Showing restaurants within price range ±1 while matching your cuisines.',
  relaxed_price_1_cuisine_ignored:
    'No exact cuisine match. Showing top-rated restaurants within price range ±1 (cuisine filter relaxed).',
  relaxed_any_price_cuisine_ignored:
    'Showing the highest-rated restaurants across all price ranges and cuisines in this city.',
};

/** When price is "Any", skip price-relaxation stages — use cuisine-only notices (amendment 5) */
export const STAGE_NOTICES_ANY_PRICE: Record<RelaxationStage, string | null> = {
  exact_all: null,
  relaxed_price_1_cuisine_kept: null,
  relaxed_price_1_cuisine_ignored:
    'No restaurants matched your cuisine choices. Showing top-rated picks in this city.',
  relaxed_any_price_cuisine_ignored:
    'Showing the highest-rated restaurants in this city.',
};

export interface ExplanationBreakdown {
  cuisineSummary: string;
  qualitySummary: string;
  priceSummary: string;
  popularitySummary: string;
  servicesSummary?: string;
  locationSummary?: string;
  relaxedItems?: string[];
}

export interface RecommendationQuery {
  country: string;
  city: string;
  /** null = Any price */
  priceRange: 1 | 2 | 3 | 4 | null;
  cuisines: string[];
  needsTableBooking: boolean;
  needsOnlineDelivery: boolean;
  topN: number;
  /** 'strict' returns only exact matches; 'flexible' allows progressive relaxation (default) */
  mode?: 'strict' | 'flexible';
  /** Optional radius filter in km from city centroid */
  radiusKm?: number | null;
  /** Diversification trade-off lambda (0 to 1, default 0.85) */
  diversificationLambda?: number;
}

export interface ScoredRestaurant extends RestaurantParsed {
  cuisineMatch: number;   // 0–1
  score: number;          // weighted_rating + 0.5 * cuisineMatch
  rank: number;           // 1-based, assigned at display time (0 when not yet set)
  whyThisPick: string;    // generated sentence from real fields
  explanation?: ExplanationBreakdown; // structured explainable breakdown
  distanceKm?: number;    // distance in km if coordinates available
}

export interface RecommendationResult {
  /** Full deduped qualifying pool — UI slices to topN after live re-ranking */
  qualifyingPool: ScoredRestaurant[];
  stage: RelaxationStage;
  notice: string | null;
  /** Dynamically computed from loaded data (amendment 6 — never hard-coded) */
  cityRestaurantCount: number;
  isLimitedData: boolean;   // cityRestaurantCount < 30
  mode?: 'strict' | 'flexible';
  relaxedCriteria?: string[];
}
