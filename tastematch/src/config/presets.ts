/**
 * Mood preset configuration — single source of truth.
 * These are HARD FILTERS applied before the relaxation stages (amendment 4).
 * An active preset overrides the UI price selection.
 */

import type { CityCapabilities } from '@/lib/capabilities';

export interface MoodPreset {
  id: string;
  label: string;
  emoji: string;
  /** Override price range selection. null = no override, meaning Any. */
  priceRangeOverride: Array<1 | 2 | 3 | 4> | null;
  /** Minimum aggregate_rating, or null if not required */
  minRating: number | null;
  /** Minimum votes, or null if not required */
  minVotes: number | null;
  /** Maximum votes, or null if not required */
  maxVotes: number | null;
  /** Require has_table_booking === 1 */
  requireTableBooking: boolean;
  /** Require has_online_delivery === 1 */
  requireOnlineDelivery: boolean;
  /** Maximum price_range, or null if not required */
  maxPriceRange: (1 | 2 | 3 | 4) | null;
  /** Minimum price_range, or null if not required */
  minPriceRange: (1 | 2 | 3 | 4) | null;
  /** Which city capabilities must be true for this preset to be enabled */
  requiredCapabilities?: (keyof CityCapabilities)[];
}

export const MOOD_PRESETS: MoodPreset[] = [
  {
    id: 'date_night',
    label: 'Date night',
    emoji: '🕯️',
    priceRangeOverride: [3, 4],
    minRating: 4.0,
    minVotes: null,
    maxVotes: null,
    requireTableBooking: true,
    requireOnlineDelivery: false,
    minPriceRange: 3,
    maxPriceRange: null,
    requiredCapabilities: ['hasPrices', 'hasRatings', 'hasBooking'],
  },
  {
    id: 'cheap_eats',
    label: 'Cheap eats',
    emoji: '💸',
    priceRangeOverride: [1],
    minRating: 3.5,
    minVotes: 50,
    maxVotes: null,
    requireTableBooking: false,
    requireOnlineDelivery: false,
    minPriceRange: 1,
    maxPriceRange: 1,
    requiredCapabilities: ['hasPrices', 'hasRatings'],
  },
  {
    id: 'hidden_gems',
    label: 'Hidden gems',
    emoji: '💎',
    priceRangeOverride: null,
    minRating: 4.2,
    minVotes: 20,
    maxVotes: 150,
    requireTableBooking: false,
    requireOnlineDelivery: false,
    minPriceRange: null,
    maxPriceRange: null,
    requiredCapabilities: ['hasRatings'],
  },
  {
    id: 'crowd_favourites',
    label: 'Crowd favourites',
    emoji: '🔥',
    priceRangeOverride: null,
    minRating: null,
    minVotes: 500,
    maxVotes: null,
    requireTableBooking: false,
    requireOnlineDelivery: false,
    minPriceRange: null,
    maxPriceRange: null,
    requiredCapabilities: ['hasRatings'],
  },
  {
    id: 'quick_bite',
    label: 'Quick bite',
    emoji: '⚡',
    priceRangeOverride: [1, 2],
    minRating: null,
    minVotes: null,
    maxVotes: null,
    requireTableBooking: false,
    requireOnlineDelivery: true,
    minPriceRange: null,
    maxPriceRange: 2,
    requiredCapabilities: ['hasPrices'], // OSM might not have delivery mapped, but we will limit by price
  },
];
