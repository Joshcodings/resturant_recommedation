export interface Restaurant {
  uid: string;                         // Primary key: "zomato:123", "osm:node/456", "ovt:<id>"
  restaurant_id?: number | null;       // Legacy ID retained for Zomato records
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
  
  // Extended structured fields for OSM / Worldwide data:
  state?: string | null;
  address?: string | null;
  place_type?: string | null;
  opening_hours?: string | null;
  phone?: string | null;
  website?: string | null;
  contact?: Record<string, any> | null;
  addr?: Record<string, any> | null;
  payment_methods?: { cash?: boolean; cards?: boolean; mobile_payment?: boolean; [k: string]: any } | null;
  diet?: { halal?: boolean; vegetarian?: boolean; vegan?: boolean; [k: string]: any } | null;
  amenities?: Record<string, any> | null;
  osm_timestamp?: string | null;
  osm_version?: number | null;
  check_date?: string | null;
  data_source?: string | null;
  source_url?: string | null;
  source_id?: string | null;
  licence?: string | null;
  cuisines_raw?: string | null;
  isLocalCommunity?: boolean;
  source?: string | null;
  added_at?: string | null;
  power?: { backup_generator?: boolean | string; nepa?: string } | null;
  air_conditioning?: boolean | null;
  contributor_credit?: string | null;
  cuisineList?: string[];
  name?: string;
  telephone?: string | null;
  owner_whatsapp?: string | null;
  osm_id?: string | number | null;
  osm_type?: string | null;
  overture_confidence?: number | null;
  data_sources?: string[] | null;
  overture_meta?: Record<string, any> | null;
}

/** Pre-parsed extension attached at load time */
export interface RestaurantParsed extends Restaurant {
  cuisineList: string[];               // trimmed array from cuisines field
  hasCoords: boolean;                  // lat/lng both non-zero
  hasRating: boolean;
  hasPrice: boolean;
}

export interface Landmark {
  uid: string;
  name: string;
  category: 'airport' | 'university' | 'hospital' | 'market' | 'mall' | 'stadium' | 'bus_park' | 'hotel' | 'religious_centre' | string;
  city: string;
  latitude: number;
  longitude: number;
}

