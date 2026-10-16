/**
 * src/lib/foodRunPlanner.ts
 * =========================
 * Utilities for Feature 6: WhatsApp Food Run Planner.
 * Strictly conforms to:
 * - Real data only: unknown price displays "Prices not listed", never invented.
 * - Validates 2-6 dishes.
 * - Generates formatted WhatsApp message with checkboxes and wa.me share link.
 */

import type { RestaurantParsed } from '@/types/restaurant';
import dishDictionary from '@/config/dishDictionary.json';

import { generatePlanDeepLink, capMessageLength } from '@/lib/whatsappShare';

export interface FoodRunParams {
  restaurantName: string;
  localityOrCity: string;
  dishes: string[];
  averageCostForTwo: number | null;
  currency: string;
  restaurantUid?: string;
}

export interface FoodRunResult {
  message: string;
  waLink: string;
  estimatedCostText: string;
  isValid: boolean;
  error?: string;
  deepLink?: string;
}

/**
 * Derives suggested dishes for a restaurant from its cuisine tags and popular Nigerian options.
 */
export function getSuggestedDishesForRestaurant(restaurant: RestaurantParsed): string[] {
  const suggestions = new Set<string>();

  // 1. Check if any dish in dishDictionary matches the restaurant's cuisines
  const rCuisines = (restaurant.cuisineList || []).map((c) => c.toLowerCase());
  for (const item of Object.values(dishDictionary)) {
    const dishCuisines = (item.cuisineTags || []).map((c) => c.toLowerCase());
    if (dishCuisines.some((c) => rCuisines.includes(c))) {
      suggestions.add(item.displayName);
    }
  }

  // 2. Default standard Nigerian food run suggestions if none or few found
  const fallbackDishes = [
    'Jollof Rice & Chicken',
    'Suya (Beef)',
    'Pepper Soup',
    'Egusi Soup & Pounded Yam',
    'Amala & Ewedu',
    'Shawarma',
    'Small Chops Platter',
    'Fried Rice & Turkey',
    'Asun (Spicy Goat Meat)',
    'Moi Moi',
  ];

  for (const d of fallbackDishes) {
    if (suggestions.size >= 8) break;
    suggestions.add(d);
  }

  return Array.from(suggestions);
}

/**
 * Computes estimated cost display string strictly from real fields.
 * If average_cost_for_two is missing, null, or 0 -> "Prices not listed"
 */
export function getEstimatedCostText(averageCostForTwo: number | null, currency: string): string {
  if (averageCostForTwo === null || averageCostForTwo === undefined || averageCostForTwo <= 0) {
    return 'Prices not listed';
  }

  const formatted = averageCostForTwo.toLocaleString();
  if (currency === 'NGN' || currency === '₦') {
    return `~₦${formatted} (est. for two)`;
  }
  return `~${currency} ${formatted} (est. for two)`;
}

/**
 * Formats a food run message for WhatsApp and constructs wa.me share link.
 */
export function formatFoodRunMessage(params: FoodRunParams): FoodRunResult {
  const { restaurantName, localityOrCity, dishes, averageCostForTwo, currency } = params;

  if (dishes.length < 2) {
    return {
      message: '',
      waLink: '',
      estimatedCostText: getEstimatedCostText(averageCostForTwo, currency),
      isValid: false,
      error: 'Select at least 2 dishes (2–6 required)',
    };
  }

  if (dishes.length > 6) {
    return {
      message: '',
      waLink: '',
      estimatedCostText: getEstimatedCostText(averageCostForTwo, currency),
      isValid: false,
      error: 'Maximum 6 dishes allowed for a food run',
    };
  }

  const costText = getEstimatedCostText(averageCostForTwo, currency);

  const deepLink = generatePlanDeepLink({
    type: 'foodrun',
    city: localityOrCity,
    stops: params.restaurantUid ? [params.restaurantUid] : [],
    dishes,
    restaurantName,
    restaurantUid: params.restaurantUid,
  });

  const fullGenerator = () =>
    [
      `🍽️ *Food Run: ${restaurantName}*`,
      `📍 ${localityOrCity}`,
      '',
      '*Order List:*',
      ...dishes.map((dish) => `[ ] ${dish}`),
      '',
      `💰 *Estimated Total:* ${costText}`,
      `🛵 *Who's in? Reply with your order or check off above!*`,
      '',
      `Open plan: ${deepLink}`,
      '_Organised via TasteMatch_',
    ].join('\n');

  const shortGenerator = () =>
    [
      `🍽️ *Food Run: ${restaurantName}* (${localityOrCity})`,
      dishes.map((d) => `• ${d}`).join(', '),
      `💰 Total: ${costText}`,
      '',
      `Open plan: ${deepLink}`,
    ].join('\n');

  const minimalGenerator = () =>
    `🍽️ Food run for ${restaurantName} (${dishes.length} dishes), open plan: ${deepLink}`;

  const message = capMessageLength({
    full: fullGenerator,
    short: shortGenerator,
    minimal: minimalGenerator,
  });

  const waLink = `https://wa.me/?text=${encodeURIComponent(message)}`;

  return {
    message,
    waLink,
    estimatedCostText: costText,
    isValid: true,
    deepLink,
  };
}
