// ─── Currency Types & Constants ───────────────────────────────────────────────

export type RatesMap = Record<string, number>;

export interface RatesState {
  rates: RatesMap;
  date: string;
  provider: 'fawazahmed0' | 'open.er-api' | 'fallback';
  isFallback: boolean;
  error: string | null;
}

export const PINNED_CURRENCIES = [
  'USD',
  'NGN',
  'EUR',
  'GBP',
  'INR',
  'CAD',
  'AUD',
  'ZAR',
  'AED',
] as const;

/** Currencies that always use 0 fraction digits due to denomination size */
export const ZERO_DECIMAL_CURRENCIES = new Set([
  'NGN',
  'IDR',
  'LKR',
  'JPY',
  'KRW',
  'VND',
  'CLP',
  'PYG',
  'UGX',
  'RWF',
]);

export const PRICE_TIERS: Record<1 | 2 | 3 | 4, { name: string; dots: string; shortDots: string }> = {
  1: { name: 'Budget',   dots: '●○○○', shortDots: '●' },
  2: { name: 'Moderate', dots: '●●○○', shortDots: '●●' },
  3: { name: 'Upscale',  dots: '●●●○', shortDots: '●●●' },
  4: { name: 'Premium',  dots: '●●●●', shortDots: '●●●●' },
};

// ─── Rate Fetching & Normalization ────────────────────────────────────────────

const CACHE_KEY = 'tm_currency_rates_cache';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

interface CachePayload {
  timestamp: number;
  date: string;
  provider: 'fawazahmed0' | 'open.er-api' | 'fallback';
  isFallback: boolean;
  rates: RatesMap;
}

export function getCachedRates(): CachePayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data: CachePayload = JSON.parse(raw);
    if (Date.now() - data.timestamp < CACHE_TTL_MS && data.rates && data.rates.USD) {
      return data;
    }
  } catch {
    // localStorage unavailable or malformed
  }
  return null;
}

export function saveCachedRates(payload: CachePayload): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // quota exceeded or disabled
  }
}

/**
 * Fetch rates in priority order:
 * 1. Primary: jsDelivr fawazahmed0 currency API
 * 2. Fallback: Cloudflare mirror (pages.dev)
 * 3. Second provider: open.er-api.com
 * 4. Offline bundled: public/data/rates-fallback.json
 */
export async function fetchLiveRates(forceRefresh = false): Promise<RatesState> {
  if (!forceRefresh) {
    const cached = getCachedRates();
    if (cached) {
      return {
        rates: cached.rates,
        date: cached.date,
        provider: cached.provider,
        isFallback: cached.isFallback,
        error: null,
      };
    }
  }

  // 1. Primary: jsDelivr
  try {
    const res = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json', { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.usd) {
        const rates: RatesMap = { USD: 1 };
        for (const [k, v] of Object.entries(data.usd)) {
          if (typeof v === 'number') rates[k.toUpperCase()] = v;
        }
        const state: RatesState = {
          rates,
          date: data.date || new Date().toISOString().split('T')[0],
          provider: 'fawazahmed0',
          isFallback: false,
          error: null,
        };
        saveCachedRates({ ...state, timestamp: Date.now() });
        return state;
      }
    }
  } catch {
    // try next mirror
  }

  // 2. Cloudflare mirror
  try {
    const res = await fetch('https://latest.currency-api.pages.dev/v1/currencies/usd.json', { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.usd) {
        const rates: RatesMap = { USD: 1 };
        for (const [k, v] of Object.entries(data.usd)) {
          if (typeof v === 'number') rates[k.toUpperCase()] = v;
        }
        const state: RatesState = {
          rates,
          date: data.date || new Date().toISOString().split('T')[0],
          provider: 'fawazahmed0',
          isFallback: false,
          error: null,
        };
        saveCachedRates({ ...state, timestamp: Date.now() });
        return state;
      }
    }
  } catch {
    // try next provider
  }

  // 3. Second provider: open.er-api.com
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.result === 'success' && data.rates) {
        const rates: RatesMap = { USD: 1 };
        for (const [k, v] of Object.entries(data.rates)) {
          if (typeof v === 'number') rates[k.toUpperCase()] = v;
        }
        const dateStr = data.time_last_update_utc ? new Date(data.time_last_update_utc).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        const state: RatesState = {
          rates,
          date: dateStr,
          provider: 'open.er-api',
          isFallback: false,
          error: null,
        };
        saveCachedRates({ ...state, timestamp: Date.now() });
        return state;
      }
    }
  } catch {
    // try bundled fallback
  }

  // 4. Bundled fallback: rates-fallback.json
  try {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const res = await fetch(`${cleanBase}data/rates-fallback.json`);
    if (res.ok) {
      const data = await res.json();
      return {
        rates: data.rates || { USD: 1 },
        date: data.date || '2026-09-29',
        provider: 'fallback',
        isFallback: true,
        error: 'Network rates failed; using bundled fallback rates.',
      };
    }
  } catch {
    // total fallback
  }

  return {
    rates: { USD: 1 },
    date: 'unknown',
    provider: 'fallback',
    isFallback: true,
    error: 'All rate sources failed.',
  };
}

// ─── Pure Currency Conversion ────────────────────────────────────────────────

/**
 * Pure conversion function.
 * converted = amount / rates[fromCode] * rates[toCode]
 * Returns null if amount is null/undefined or if a required rate is missing.
 */
export function convertCurrency(
  amount: number | null | undefined,
  fromCode: string,
  toCode: string,
  rates: RatesMap,
): number | null {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return null;
  }

  const from = fromCode.trim().toUpperCase();
  const to = toCode.trim().toUpperCase();

  if (from === to) {
    return amount;
  }

  const fromRate = rates[from];
  const toRate = rates[to];

  if (!fromRate || !toRate || fromRate <= 0 || toRate <= 0) {
    return null;
  }

  return (amount / fromRate) * toRate;
}

// ─── Currency Formatting ─────────────────────────────────────────────────────

/**
 * Format currency amount with Intl.NumberFormat according to amendment 6:
 * - 0 decimals for amounts >= 100
 * - 1 decimal for 10 <= amount < 100
 * - 2 decimals for amount < 10
 * - Always 0 decimals for currencies with very large numbers (NGN, IDR, LKR, etc.)
 * - Fall back to "1,234 CODE" if Intl does not support code.
 */
export function formatCurrency(
  amount: number | null | undefined,
  currencyCode: string,
  options?: { isApprox?: boolean },
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'n/a';
  }

  const code = currencyCode.trim().toUpperCase();
  const prefix = options?.isApprox ? '≈ ' : '';

  let fractionDigits = 0;
  if (!ZERO_DECIMAL_CURRENCIES.has(code)) {
    if (amount < 10) {
      fractionDigits = 2;
    } else if (amount < 100) {
      fractionDigits = 1;
    } else {
      fractionDigits = 0;
    }
  }

  try {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    return `${prefix}${formatter.format(amount)}`;
  } catch {
    // Fallback if Intl does not support code
    const num = amount.toLocaleString('en-US', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    return `${prefix}${num} ${code}`;
  }
}

/**
 * Get human-readable currency name via Intl.DisplayNames.
 */
export function getCurrencyDisplayName(code: string): string {
  try {
    const dn = new Intl.DisplayNames(['en'], { type: 'currency' });
    const name = dn.of(code.toUpperCase());
    return name || code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

// ─── Median Typical Cost Computation ──────────────────────────────────────────

export interface CountryTierStats {
  medianLocal: number | null;
  currency: string;
  sampleCount: number;
}

/**
 * Computes median local cost of restaurants in a given country and price tier.
 * Returns null if fewer than 5 rated restaurants with valid cost exist (amendment 8).
 */
export function computeCountryTierMedian(
  allData: Array<{ country: string; price_range: number | null; average_cost_for_two: number | null; currency: string }>,
  country: string,
  tier: 1 | 2 | 3 | 4,
): CountryTierStats {
  const matching = allData.filter(
    r =>
      r.country === country &&
      r.price_range === tier &&
      r.average_cost_for_two !== null &&
      r.average_cost_for_two > 0,
  );

  if (matching.length < 5) {
    return {
      medianLocal: null,
      currency: matching[0]?.currency || 'USD',
      sampleCount: matching.length,
    };
  }

  const costs = matching.map(r => r.average_cost_for_two!).sort((a, b) => a - b);
  const mid = Math.floor(costs.length / 2);
  const medianLocal = costs.length % 2 === 0
    ? (costs[mid - 1] + costs[mid]) / 2
    : costs[mid];

  return {
    medianLocal,
    currency: matching[0].currency,
    sampleCount: matching.length,
  };
}
