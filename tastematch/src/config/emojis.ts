/**
 * Cuisine → Emoji mapping for card tiles.
 * The first cuisine in a restaurant's list whose key matches here wins.
 * Falls back to 🍽️ for any unrecognized cuisine.
 */
export const CUISINE_EMOJI: Record<string, string> = {
  'North Indian':   '🍛',
  'Chinese':        '🥡',
  'Fast Food':      '🍔',
  'Mughlai':        '🍢',
  'Italian':        '🍝',
  'Bakery':         '🥐',
  'Continental':    '🍽️',
  'Cafe':           '☕',
  'Desserts':       '🍰',
  'South Indian':   '🥘',
  'Street Food':    '🌮',
  'American':       '🍔',
  'Pizza':          '🍕',
  'Mithai':         '🍬',
  'Burger':         '🍔',
  'Thai':           '🍜',
  'Asian':          '🍜',
  'Beverages':      '🥤',
  'Ice Cream':      '🍦',
  'Mexican':        '🌮',
  'Biryani':        '🍚',
  'Seafood':        '🦐',
  'Healthy Food':   '🥗',
  'European':       '🥖',
  'Japanese':       '🍣',
  'Sushi':          '🍣',
};

export const DEFAULT_CUISINE_EMOJI = '🍽️';

/**
 * Get the primary emoji for a restaurant given its parsed cuisine list.
 * Tries each cuisine in order; returns default if none matches.
 */
export function getCuisineEmoji(cuisineList: string[]): string {
  for (const c of cuisineList) {
    if (CUISINE_EMOJI[c]) return CUISINE_EMOJI[c];
  }
  return DEFAULT_CUISINE_EMOJI;
}
