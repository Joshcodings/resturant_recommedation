export interface Restaurant {
  restaurant_id: number;
  restaurant_name: string;
  locality: string;
  city: string;
  country: string;
  cuisines: string;                    // raw comma-separated string
  price_range: 1 | 2 | 3 | 4;
  average_cost_for_two: number | null;
  currency: string;
  aggregate_rating: number;            // 0–5
  votes: number;
  weighted_rating: number;             // precomputed Bayesian
  has_table_booking: 0 | 1;
  has_online_delivery: 0 | 1;
  latitude: number;
  longitude: number;
}

/** Pre-parsed extension attached at load time */
export interface RestaurantParsed extends Restaurant {
  cuisineList: string[];               // trimmed array from cuisines field
  hasCoords: boolean;                  // lat/lng both non-zero
}
