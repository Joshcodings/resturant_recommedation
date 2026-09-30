import { describe, it, expect } from 'vitest';
import {
  convertCurrency,
  formatCurrency,
  computeCountryTierMedian,
  type RatesMap,
} from '@/lib/currency';

describe('Currency Conversion (convertCurrency)', () => {
  const sampleRates: RatesMap = {
    USD: 1.0,
    EUR: 0.85,
    GBP: 0.75,
    INR: 80.0,
    NGN: 1300.0,
  };

  it('returns exact amount when from and to currencies are the same', () => {
    expect(convertCurrency(500, 'INR', 'INR', sampleRates)).toBe(500);
    expect(convertCurrency(42.5, 'USD', 'USD', sampleRates)).toBe(42.5);
    expect(convertCurrency(0, 'NGN', 'NGN', sampleRates)).toBe(0);
  });

  it('converts correctly via USD rates', () => {
    // 80 INR -> 1 USD
    expect(convertCurrency(80, 'INR', 'USD', sampleRates)).toBeCloseTo(1.0, 5);

    // 1 USD -> 1300 NGN
    expect(convertCurrency(1, 'USD', 'NGN', sampleRates)).toBeCloseTo(1300.0, 5);

    // 800 INR -> 10 USD -> 8.5 EUR
    expect(convertCurrency(800, 'INR', 'EUR', sampleRates)).toBeCloseTo(8.5, 5);

    // 100 GBP -> (100 / 0.75) USD -> (100 / 0.75) * 1300 NGN = 173333.333 NGN
    expect(convertCurrency(100, 'GBP', 'NGN', sampleRates)).toBeCloseTo(173333.333, 2);
  });

  it('returns null when rate is missing', () => {
    expect(convertCurrency(100, 'XYZ', 'USD', sampleRates)).toBeNull();
    expect(convertCurrency(100, 'USD', 'ABC', sampleRates)).toBeNull();
    expect(convertCurrency(100, 'XYZ', 'ABC', sampleRates)).toBeNull();
  });

  it('returns null when amount is null, undefined, or NaN', () => {
    expect(convertCurrency(null, 'USD', 'EUR', sampleRates)).toBeNull();
    expect(convertCurrency(undefined, 'USD', 'EUR', sampleRates)).toBeNull();
    expect(convertCurrency(NaN, 'USD', 'EUR', sampleRates)).toBeNull();
  });
});

describe('Currency Formatting (formatCurrency)', () => {
  it('returns "n/a" for null or undefined amounts', () => {
    expect(formatCurrency(null, 'USD')).toBe('n/a');
    expect(formatCurrency(undefined, 'INR')).toBe('n/a');
  });

  it('formats amounts >= 100 with 0 decimals', () => {
    const formatted = formatCurrency(250.75, 'USD');
    // Expect whole dollars without cents
    expect(formatted).toMatch(/\$251/);
  });

  it('formats amounts between 10 and 99 with 1 decimal', () => {
    const formatted = formatCurrency(42.34, 'USD');
    expect(formatted).toMatch(/\$42\.3/);
  });

  it('formats amounts < 10 with 2 decimals', () => {
    const formatted = formatCurrency(7.25, 'USD');
    expect(formatted).toMatch(/\$7\.25/);
  });

  it('always uses 0 decimals for large-denomination currencies (NGN, IDR, LKR)', () => {
    const formattedNgn = formatCurrency(9.45, 'NGN');
    expect(formattedNgn).not.toContain('.');
    expect(formattedNgn).toMatch(/9/);

    const formattedIdr = formatCurrency(50.8, 'IDR');
    expect(formattedIdr).not.toContain('.');

    const formattedLkr = formatCurrency(2.7, 'LKR');
    expect(formattedLkr).not.toContain('.');
  });

  it('adds "≈ " prefix when isApprox is true', () => {
    const formatted = formatCurrency(15.5, 'USD', { isApprox: true });
    expect(formatted.startsWith('≈ ')).toBe(true);
  });
});

describe('Country Tier Median Computation (computeCountryTierMedian)', () => {
  const dummyData = [
    // India Tier 2: 6 restaurants (>= 5 case, median should be computed)
    { country: 'India', price_range: 2, average_cost_for_two: 400, currency: 'INR' },
    { country: 'India', price_range: 2, average_cost_for_two: 500, currency: 'INR' },
    { country: 'India', price_range: 2, average_cost_for_two: 600, currency: 'INR' },
    { country: 'India', price_range: 2, average_cost_for_two: 700, currency: 'INR' },
    { country: 'India', price_range: 2, average_cost_for_two: 800, currency: 'INR' },
    { country: 'India', price_range: 2, average_cost_for_two: 900, currency: 'INR' },

    // USA Tier 4: only 3 restaurants (< 5 case, must return null median)
    { country: 'USA', price_range: 4, average_cost_for_two: 80, currency: 'USD' },
    { country: 'USA', price_range: 4, average_cost_for_two: 120, currency: 'USD' },
    { country: 'USA', price_range: 4, average_cost_for_two: 150, currency: 'USD' },

    // India Tier 1: 5 restaurants with an odd count (median = middle item)
    { country: 'India', price_range: 1, average_cost_for_two: 100, currency: 'INR' },
    { country: 'India', price_range: 1, average_cost_for_two: 200, currency: 'INR' },
    { country: 'India', price_range: 1, average_cost_for_two: 250, currency: 'INR' },
    { country: 'India', price_range: 1, average_cost_for_two: 300, currency: 'INR' },
    { country: 'India', price_range: 1, average_cost_for_two: 350, currency: 'INR' },
  ];

  it('computes correct median for even count >= 5', () => {
    const stats = computeCountryTierMedian(dummyData, 'India', 2);
    expect(stats.sampleCount).toBe(6);
    // Median of [400, 500, 600, 700, 800, 900] is (600 + 700) / 2 = 650
    expect(stats.medianLocal).toBe(650);
    expect(stats.currency).toBe('INR');
  });

  it('computes correct median for odd count >= 5', () => {
    const stats = computeCountryTierMedian(dummyData, 'India', 1);
    expect(stats.sampleCount).toBe(5);
    // Median of [100, 200, 250, 300, 350] is 250
    expect(stats.medianLocal).toBe(250);
    expect(stats.currency).toBe('INR');
  });

  it('returns null median when fewer than 5 restaurants exist for tier (amendment 8)', () => {
    const stats = computeCountryTierMedian(dummyData, 'USA', 4);
    expect(stats.sampleCount).toBe(3);
    expect(stats.medianLocal).toBeNull();
  });

  it('ignores null or zero costs when computing medians', () => {
    const dataWithNulls = [
      { country: 'UK', price_range: 2, average_cost_for_two: null, currency: 'GBP' },
      { country: 'UK', price_range: 2, average_cost_for_two: 0, currency: 'GBP' },
      { country: 'UK', price_range: 2, average_cost_for_two: 30, currency: 'GBP' },
      { country: 'UK', price_range: 2, average_cost_for_two: 40, currency: 'GBP' },
      { country: 'UK', price_range: 2, average_cost_for_two: 50, currency: 'GBP' },
    ];
    // Only 3 valid costs, so fewer than 5
    const stats = computeCountryTierMedian(dataWithNulls, 'UK', 2);
    expect(stats.sampleCount).toBe(3);
    expect(stats.medianLocal).toBeNull();
  });
});
