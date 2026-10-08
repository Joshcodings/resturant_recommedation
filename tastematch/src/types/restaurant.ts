export interface Restaurant {
  restaurant_id: number;
  restaurant_name: string;
  locality: string | null;
  city: string;
  country: string;
  cuisines: string;                    // raw comma-separated string
  price_range: 1 | 2 | 3 | 4 | null;
  average_cost_for_two: number | null;
  currency: string;
  aggregate_rating: number | null;     // 0–5
  votes: number | null;
  weighted_rating: number | null;      // precomputed Bayesian
  has_table_booking: 0 | 1 | null;
  has_online_delivery: 0 | 1 | null;
  latitude: number;
  longitude: number;
  
  // New optional fields for OSM / Nigerian data:
  state?: string | null;
  address?: string | null;
  place_type?: string | null;
  opening_hours?: string | null;
  phone?: string | null;
  website?: string | null;
  data_source?: string | null;
  source_url?: string | null;
  source_id?: string | null;
  retrieved_at?: string | null;
  cuisines_raw?: string | null;
}

/** Pre-parsed extension attached at load time */
export interface RestaurantParsed extends Restaurant {
  cuisineList: string[];               // trimmed array from cuisines field
  hasCoords: boolean;                  // lat/lng both non-zero
  hasRating: boolean;
  hasPrice: boolean;
}
