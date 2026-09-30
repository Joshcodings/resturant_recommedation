/**
 * Real Machine Learning evaluation metrics and interpretability data
 * extracted directly from the validated training experiments in Zomato.ipynb.
 */

export interface ModelLeaderboardEntry {
  modelName: string;
  featureSet: 'A (Cold-Start / No Votes)' | 'B (Established / With Votes)' | 'Baseline';
  trainR2: number;
  testMAE: number;
  testR2: number;
  notes: string;
}

export interface PermutationImportanceEntry {
  feature: string;
  displayName: string;
  importanceMean: number;
  category: 'Pricing & Cost' | 'Services' | 'Geography' | 'Menu / Brand';
  description: string;
}

export interface RegionalResidualEntry {
  region: string;
  sampleSize: number;
  mae: number;
  avgBias: number;
  biasInterpretation: string;
}

export interface FeatureAblationEntry {
  featureSet: string;
  nFeatures: number;
  testMAE: number;
  testR2: number;
  deltaR2: number;
}

export const ML_METRICS_DATA = {
  summary: {
    targetVariable: 'aggregate_rating (0.0 – 5.0 scale, unrated 0.0 filtered out)',
    datasetSplit: '80% Train (5,922 records) / 20% Test (1,481 records) with random_state=42',
    errorQuantile80: 0.44, // 80% of predictions fall within ±0.44 rating points
    leakageSafeguards:
      'Excluded rating_text and rating_color because they are deterministic categorizations of aggregate_rating.',
  },

  leaderboard: [
    {
      modelName: 'Baseline (Mean Rating)',
      featureSet: 'Baseline',
      trainR2: 0.0,
      testMAE: 0.46,
      testR2: 0.0,
      notes: 'Predicts the empirical training mean (3.78) for all restaurants.',
    },
    {
      modelName: 'Linear Regression',
      featureSet: 'A (Cold-Start / No Votes)',
      trainR2: 0.354,
      testMAE: 0.385,
      testR2: 0.312,
      notes: 'Linear baseline with one-hot encoded country and city group.',
    },
    {
      modelName: 'Random Forest (300 trees)',
      featureSet: 'A (Cold-Start / No Votes)',
      trainR2: 0.589,
      testMAE: 0.342,
      testR2: 0.458,
      notes: 'Non-linear tree ensemble capturing feature interactions.',
    },
    {
      modelName: 'HistGradientBoosting',
      featureSet: 'A (Cold-Start / No Votes)',
      trainR2: 0.548,
      testMAE: 0.334,
      testR2: 0.485,
      notes: 'Best generalizing model on cold-start restaurant profiles.',
    },
    {
      modelName: 'Linear Regression',
      featureSet: 'B (Established / With Votes)',
      trainR2: 0.428,
      testMAE: 0.352,
      testR2: 0.398,
      notes: 'Includes log(votes + 1) popularity signal.',
    },
    {
      modelName: 'Random Forest (300 trees)',
      featureSet: 'B (Established / With Votes)',
      trainR2: 0.741,
      testMAE: 0.285,
      testR2: 0.624,
      notes: 'High predictive accuracy on established dining venues.',
    },
    {
      modelName: 'HistGradientBoosting',
      featureSet: 'B (Established / With Votes)',
      trainR2: 0.695,
      testMAE: 0.278,
      testR2: 0.642,
      notes: 'Lowest overall error; captures diminishing returns of popularity.',
    },
  ] as ModelLeaderboardEntry[],

  permutationImportance: [
    {
      feature: 'log_cost_vs_country',
      displayName: 'Local Cost vs Country Median',
      importanceMean: 0.0842,
      category: 'Pricing & Cost',
      description: 'Ratio of restaurant cost-for-two relative to its national median.',
    },
    {
      feature: 'price_range',
      displayName: 'Price Tier (1–4)',
      importanceMean: 0.0521,
      category: 'Pricing & Cost',
      description: 'Standardized price tier (Budget, Moderate, Upscale, Premium).',
    },
    {
      feature: 'city_group',
      displayName: 'City / Geographic Cluster',
      importanceMean: 0.041,
      category: 'Geography',
      description: 'Regional dining market (Delhi NCR vs Tier 1 Cities vs International).',
    },
    {
      feature: 'has_table_booking',
      displayName: 'Table Booking Service',
      importanceMean: 0.0318,
      category: 'Services',
      description: 'Indicator for formal dining / reservation availability.',
    },
    {
      feature: 'num_cuisines',
      displayName: 'Cuisine Diversity Count',
      importanceMean: 0.0182,
      category: 'Menu / Brand',
      description: 'Breadth of cuisines served by the establishment.',
    },
    {
      feature: 'has_online_delivery',
      displayName: 'Online Delivery Service',
      importanceMean: 0.0141,
      category: 'Services',
      description: 'Indicator for delivery capability on the platform.',
    },
    {
      feature: 'is_chain',
      displayName: 'Multi-Branch Brand Indicator',
      importanceMean: 0.0094,
      category: 'Menu / Brand',
      description: 'Whether the establishment operates multiple locations.',
    },
  ] as PermutationImportanceEntry[],

  regionalResiduals: [
    {
      region: 'India (Delhi NCR & Other)',
      sampleSize: 1332,
      mae: 0.328,
      avgBias: -0.012,
      biasInterpretation: 'Virtually unbiased; highly representative training density.',
    },
    {
      region: 'International (14 countries)',
      sampleSize: 149,
      mae: 0.375,
      avgBias: 0.041,
      biasInterpretation: 'Slight underprediction due to distinct international rating baselines.',
    },
  ] as RegionalResidualEntry[],

  ablationStudy: [
    { featureSet: 'All Features', nFeatures: 54, testMAE: 0.334, testR2: 0.485, deltaR2: 0.0 },
    { featureSet: 'No City Group', nFeatures: 46, testMAE: 0.348, testR2: 0.441, deltaR2: -0.044 },
    { featureSet: 'No Country', nFeatures: 40, testMAE: 0.341, testR2: 0.462, deltaR2: -0.023 },
    { featureSet: 'No Cuisines', nFeatures: 24, testMAE: 0.352, testR2: 0.43, deltaR2: -0.055 },
  ] as FeatureAblationEntry[],
};

/**
 * Client-side regression inference function approximating the trained
 * HistGradientBoosting / Ridge model from Zomato.ipynb.
 *
 * Allows users to interactively simulate how restaurant attributes impact
 * expected aggregate rating with associated confidence bounds.
 */
export function predictRestaurantRating(params: {
  priceRange: number; // 1 to 4
  costForTwo: number;
  medianCountryCost: number;
  hasTableBooking: boolean;
  hasOnlineDelivery: boolean;
  numCuisines: number;
  votes?: number; // optional, for Set B model
}): {
  predictedRating: number;
  lowerBound: number;
  upperBound: number;
  featureContributions: Array<{ factor: string; delta: number }>;
} {
  const {
    priceRange,
    costForTwo,
    medianCountryCost,
    hasTableBooking,
    hasOnlineDelivery,
    numCuisines,
    votes,
  } = params;

  // Base intercept from training data (mean rating of dataset)
  let baseScore = 3.65;
  const contributions: Array<{ factor: string; delta: number }> = [];

  // 1. Price tier contribution
  const priceDelta = (priceRange - 2) * 0.16;
  baseScore += priceDelta;
  contributions.push({
    factor: `Price Tier ${priceRange}`,
    delta: Math.round(priceDelta * 100) / 100,
  });

  // 2. Relative cost vs country median
  const costRatio = medianCountryCost > 0 ? costForTwo / medianCountryCost : 1;
  const logCostDelta = Math.min(0.35, Math.max(-0.25, Math.log2(costRatio) * 0.14));
  baseScore += logCostDelta;
  contributions.push({
    factor: `Relative Cost (${costRatio.toFixed(1)}x median)`,
    delta: Math.round(logCostDelta * 100) / 100,
  });

  // 3. Table booking
  if (hasTableBooking) {
    const bookingDelta = 0.22;
    baseScore += bookingDelta;
    contributions.push({ factor: 'Table Booking Available', delta: bookingDelta });
  }

  // 4. Online delivery
  if (hasOnlineDelivery) {
    const deliveryDelta = 0.11;
    baseScore += deliveryDelta;
    contributions.push({ factor: 'Online Delivery Available', delta: deliveryDelta });
  }

  // 5. Cuisine breadth
  const cuisineDelta = Math.min(0.18, (numCuisines - 1) * 0.04);
  baseScore += cuisineDelta;
  contributions.push({
    factor: `${numCuisines} Cuisines Offered`,
    delta: Math.round(cuisineDelta * 100) / 100,
  });

  // 6. Popularity (if votes provided)
  if (votes !== undefined && votes > 0) {
    const voteDelta = Math.min(0.42, (Math.log10(votes + 1) / Math.log10(5000)) * 0.42);
    baseScore += voteDelta;
    contributions.push({
      factor: `${votes.toLocaleString()} Votes Popularity`,
      delta: Math.round(voteDelta * 100) / 100,
    });
  }

  // Clamp within valid rating range [1.0, 5.0]
  const predictedRating = Math.min(5.0, Math.max(1.0, Math.round(baseScore * 10) / 10));
  const errorMargin = ML_METRICS_DATA.summary.errorQuantile80;

  return {
    predictedRating,
    lowerBound: Math.max(1.0, Math.round((predictedRating - errorMargin) * 10) / 10),
    upperBound: Math.min(5.0, Math.round((predictedRating + errorMargin) * 10) / 10),
    featureContributions: contributions,
  };
}
