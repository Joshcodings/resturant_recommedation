/**
 * src/lib/routes.ts
 * ==================
 * Utilities for SEO-friendly canonical URLs, slugs, and deep linking across TasteMatch.
 *
 * Routes supported:
 * - /
 * - /ng/:citySlug
 * - /ng/:citySlug/:cuisineSlug
 * - /place/:placeSlug
 * - /group
 * - /insights
 * - /about
 */

export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getCitySlug(city: string): string {
  return slugify(city);
}

export function getCuisineSlug(cuisine: string): string {
  return slugify(cuisine);
}

export function getPlaceSlug(restaurant: { uid: string; restaurant_name?: string }): string {
  const cleanUid = restaurant.uid.replace(/[:/]/g, '-').toLowerCase();
  const nameSlug = restaurant.restaurant_name ? slugify(restaurant.restaurant_name) : '';
  return nameSlug ? `${nameSlug}-${cleanUid}` : cleanUid;
}

export function parsePlaceSlug(slug: string): string | null {
  if (!slug) return null;
  const m = slug.match(/(osm-(?:node|way|relation)-\d+|zomato-\d+|local-community[_-]\d+)/i);
  if (!m) {
    // If entire slug matches standard pattern
    if (slug.includes(':')) return slug;
    return null;
  }
  const match = m[0];
  if (match.startsWith('osm-')) {
    const parts = match.split('-');
    if (parts.length >= 3) {
      return `osm:${parts[1]}/${parts[2]}`;
    }
  }
  if (match.startsWith('zomato-')) {
    return `zomato:${match.replace('zomato-', '')}`;
  }
  if (match.startsWith('local-')) {
    return `local:${match.replace(/^local-/, '')}`;
  }
  return null;
}

export function getCanonicalUrl(path: string, baseOrigin?: string): string {
  const origin = baseOrigin || (typeof window !== 'undefined' ? window.location.origin : 'https://tastematch.pages.dev');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin.replace(/\/$/, '')}${cleanPath}`;
}

export function getPlaceShareUrl(place: { uid: string; restaurant_name?: string }, baseUrl?: string): string {
  return getCanonicalUrl(`/place/${getPlaceSlug(place)}`, baseUrl);
}
