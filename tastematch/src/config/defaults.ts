/**
 * Application defaults — single source of truth for country, currency and regional fallbacks.
 * Adheres strictly to Rule 3 (No hard-coded country or city names in UI or engine code).
 */

export interface CountryDefaults {
  code: string;
  name: string;
  currency: string;
}

export const APP_DEFAULTS = {
  defaultCountryCode: 'NG',
  defaultCountryName: 'Nigeria',
  defaultCurrency: 'NGN',
  // Fallback Zomato country when operating in legacy evaluation benchmarks
  benchmarkCountryCode: 'IN',
  benchmarkCountryName: 'India',
} as const;

export const DEFAULT_COUNTRY_CODE = APP_DEFAULTS.defaultCountryCode;
export const DEFAULT_COUNTRY_NAME = APP_DEFAULTS.defaultCountryName;
export const DEFAULT_CURRENCY = APP_DEFAULTS.defaultCurrency;
