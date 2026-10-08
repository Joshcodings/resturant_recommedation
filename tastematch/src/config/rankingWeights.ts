/**
 * Heuristics for ranking restaurants in unrated cities (e.g. from OpenStreetMap).
 * These weights dictate how important each capability/feature is when we do not
 * have quality signals like user ratings or votes.
 */
export const UNRATED_WEIGHTS = {
  withCuisineRequest: {
    cuisineMatch: 0.5,
    proximity: 0.3,
    listingDetail: 0.2,
  },
  noCuisineRequest: {
    proximity: 0.6,
    listingDetail: 0.4,
  },
};
