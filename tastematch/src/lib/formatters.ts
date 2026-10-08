/**
 * Utility: compute relative luminance of an sRGB hex color string (#RRGGBB).
 * Per WCAG 2.1 Section 1.4.3.
 */
export function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const linearize = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * Compute WCAG contrast ratio between two hex colors.
 * Returns a ratio value (1–21).
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * WCAG AA pass/fail check.
 * normalText: >= 4.5:1; largeText/UI: >= 3:1
 */
export function passesAA(ratio: number, isLargeOrUI = false): boolean {
  return ratio >= (isLargeOrUI ? 3.0 : 4.5);
}

/**
 * Format currency / cost-for-two. Returns "n/a" for null.
 */
export function formatCost(cost: number | null, currency: string): string {
  if (cost == null) return 'n/a';
  return `${Math.round(cost).toLocaleString()} ${currency}`;
}

/**
 * Format vote count with commas.
 */
export function formatVotes(votes: number | null): string {
  if (votes === null) return '0';
  return votes.toLocaleString();
}

/**
 * Determine if a restaurant has so few votes it needs a "few votes" badge.
 */
export function isFewVotes(votes: number | null): boolean {
  if (votes === null) return false; // unrated places don't get the 'few votes' badge
  return votes < 20;
}

/**
 * Generate the "Why this pick" sentence from real data fields.
 */
export function whyThisPick(params: {
  cuisineMatch: number;
  chosenCuisines: string[];
  servedCuisines: string[];
  rating: number | null;
  votes: number | null;
  priceRange: number | null;
  inputPriceRange: number | null;
  stage: string;
  locality: string | null;
}): string {
  const { cuisineMatch, chosenCuisines, servedCuisines, rating, votes, priceRange, inputPriceRange, stage, locality } = params;

  const matchedCuisines = chosenCuisines.filter(c =>
    servedCuisines.some(s => s.toLowerCase() === c.toLowerCase())
  );

  const loc = locality || 'this area';
  const hasRating = rating !== null && votes !== null;
  const ratingStr = hasRating ? rating!.toFixed(1) : '';
  const votesStr = hasRating ? votes!.toLocaleString() : '';
  const priceInRange = inputPriceRange === null || priceRange === inputPriceRange || priceRange === null;

  if (hasRating) {
    if (stage === 'exact_all' && chosenCuisines.length > 0 && cuisineMatch > 0) {
      return `Serves ${matchedCuisines.length} of your ${chosenCuisines.length} cuisine${chosenCuisines.length > 1 ? 's' : ''}, rated ${ratingStr} from ${votesStr} votes${priceInRange ? ', in your price range' : ''}.`;
    }
    if (chosenCuisines.length === 0) {
      return `Rated ${ratingStr} from ${votesStr} votes in ${loc}${priceInRange ? ', in your price range' : `, price tier ${priceRange}`}.`;
    }
    return `Top pick in ${loc} with ${votesStr} votes and a ${ratingStr} rating${priceInRange ? '' : `, relaxed to price tier ${priceRange}`}.`;
  } else {
    // Unrated (Nigeria)
    if (chosenCuisines.length > 0 && cuisineMatch > 0) {
      return `Serves ${matchedCuisines.length} of your ${chosenCuisines.length} cuisine${chosenCuisines.length > 1 ? 's' : ''} in ${loc}.`;
    }
    return `Notable spot in ${loc}.`;
  }
}

/**
 * Render price_range as filled / empty dot chars.
 */
export function priceDots(priceRange: number): { filled: number; empty: number } {
  return { filled: priceRange, empty: 4 - priceRange };
}
