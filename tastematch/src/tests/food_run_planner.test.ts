import { describe, it, expect } from 'vitest';
import {
  formatFoodRunMessage,
  getEstimatedCostText,
  getSuggestedDishesForRestaurant,
} from '@/lib/foodRunPlanner';
import type { RestaurantParsed } from '@/types/restaurant';

describe('WhatsApp Food Run Planner (Feature 6)', () => {
  const dummyRestaurant: RestaurantParsed = {
    uid: 'osm:node/12345',
    restaurant_name: 'Yellow Chilli',
    locality: 'Victoria Island',
    city: 'Lagos',
    country: 'Nigeria',
    cuisines: 'Nigerian, African',
    cuisineList: ['nigerian', 'african'],
    price_range: null,
    average_cost_for_two: null,
    currency: 'NGN',
    aggregate_rating: null,
    votes: null,
    weighted_rating: null,
    has_table_booking: null,
    has_online_delivery: null,
    latitude: 6.428,
    longitude: 3.421,
    hasCoords: true,
    hasRating: false,
    hasPrice: false,
  };

  it('strictly displays "Prices not listed" when price is unknown or null (Rule 1)', () => {
    expect(getEstimatedCostText(null, 'NGN')).toBe('Prices not listed');
    expect(getEstimatedCostText(undefined as any, 'NGN')).toBe('Prices not listed');
    expect(getEstimatedCostText(0, 'NGN')).toBe('Prices not listed');
  });

  it('displays Naira total when price is known from real data', () => {
    expect(getEstimatedCostText(6500, 'NGN')).toBe('~₦6,500 (est. for two)');
  });

  it('enforces 2 to 6 dishes boundary', () => {
    // 1 dish -> invalid
    const res1 = formatFoodRunMessage({
      restaurantName: dummyRestaurant.restaurant_name,
      localityOrCity: `${dummyRestaurant.locality}, ${dummyRestaurant.city}`,
      dishes: ['Jollof Rice'],
      averageCostForTwo: null,
      currency: 'NGN',
    });
    expect(res1.isValid).toBe(false);
    expect(res1.error).toContain('Select at least 2 dishes');

    // 3 dishes -> valid
    const res3 = formatFoodRunMessage({
      restaurantName: dummyRestaurant.restaurant_name,
      localityOrCity: `${dummyRestaurant.locality}, ${dummyRestaurant.city}`,
      dishes: ['Jollof Rice', 'Suya', 'Pepper Soup'],
      averageCostForTwo: null,
      currency: 'NGN',
    });
    expect(res3.isValid).toBe(true);
    expect(res3.message).toContain('[ ] Jollof Rice');
    expect(res3.message).toContain('[ ] Suya');
    expect(res3.message).toContain('[ ] Pepper Soup');
    expect(res3.message).toContain('Estimated Total:* Prices not listed');
    expect(res3.waLink).toContain('https://wa.me/?text=');

    // 7 dishes -> invalid (>6)
    const res7 = formatFoodRunMessage({
      restaurantName: dummyRestaurant.restaurant_name,
      localityOrCity: `${dummyRestaurant.locality}, ${dummyRestaurant.city}`,
      dishes: ['Dish 1', 'Dish 2', 'Dish 3', 'Dish 4', 'Dish 5', 'Dish 6', 'Dish 7'],
      averageCostForTwo: null,
      currency: 'NGN',
    });
    expect(res7.isValid).toBe(false);
    expect(res7.error).toContain('Maximum 6 dishes');
  });

  it('generates a properly encoded wa.me link with order checklist', () => {
    const res = formatFoodRunMessage({
      restaurantName: 'Chicken Republic',
      localityOrCity: 'Ikeja, Lagos',
      dishes: ['Refuel Meal', 'Fried Chicken'],
      averageCostForTwo: 3500,
      currency: 'NGN',
    });

    expect(res.isValid).toBe(true);
    expect(res.waLink).toContain('wa.me/?text=');
    const decoded = decodeURIComponent(res.waLink);
    expect(decoded).toContain('Food Run: Chicken Republic');
    expect(decoded).toContain('~₦3,500');
    expect(decoded).toContain('[ ] Refuel Meal');
    expect(decoded).toContain('[ ] Fried Chicken');
  });

  it('suggests relevant Nigerian dishes for Nigerian cuisine restaurants', () => {
    const suggestions = getSuggestedDishesForRestaurant(dummyRestaurant);
    expect(suggestions.length).toBeGreaterThanOrEqual(2);
    expect(suggestions.some((d) => d.toLowerCase().includes('jollof') || d.toLowerCase().includes('suya'))).toBe(true);
  });
});
