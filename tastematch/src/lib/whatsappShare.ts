/**
 * src/lib/whatsappShare.ts
 * =========================
 * Unified WhatsApp sharing utility for TasteMatch:
 * - Native navigator.share integration (Share Sheet)
 * - Phone number normalization (+234 default, 10-15 digits)
 * - Recent numbers storage (opt-in localStorage, max 5)
 * - Mobile vs Desktop WhatsApp routing (whatsapp:// vs web.whatsapp.com)
 * - Deep link generation and parsing (city, stops by UID, order)
 * - Message character capping (< 1,500 chars with graceful fallback)
 * - Encoding safety for special characters (Ł, &, #, newlines)
 */

export interface NormalizedPhoneResult {
  isValid: boolean;
  normalized: string;
  displayFormatted?: string;
  error?: string;
}

export interface PlanPayload {
  type?: 'crawl' | 'foodrun' | 'shortlist' | 'restaurant';
  city: string;
  stops: string[]; // uids
  order?: number[];
  dishes?: string[];
  restaurantUid?: string;
  restaurantName?: string;
}

export const RECENT_NUMBERS_KEY = 'tastematch_recent_wa_numbers';
export const MAX_RECENT_NUMBERS = 5;
export const MAX_MESSAGE_LENGTH = 1500;

/**
 * Normalises phone numbers:
 * 1. Strips spaces, dashes, brackets, and a leading "+".
 * 2. If it starts with a single "0", replaces that "0" with 234.
 * 3. Keeps digits only.
 * 4. Validates 10 to 15 digits.
 */
export function normalizePhoneNumber(raw: string, defaultCountryCode = '234'): NormalizedPhoneResult {
  if (!raw || typeof raw !== 'string') {
    return { isValid: false, normalized: '', error: 'Phone number is required' };
  }

  const trimmed = raw.trim();

  // Strip leading "+"
  let cleaned = trimmed.replace(/^\+/, '');

  // Strip spaces, dashes, parentheses, brackets
  cleaned = cleaned.replace(/[\s\-\(\)\[\]]/g, '');

  // If there are non-digit characters remaining (e.g. letters or invalid symbols)
  if (/[^\d]/.test(cleaned)) {
    return {
      isValid: false,
      normalized: cleaned,
      error: 'Phone number must contain digits only',
    };
  }

  // If it starts with a single 0 (and not 00), replace 0 with defaultCountryCode (234)
  if (/^0[1-9]/.test(cleaned) || cleaned === '0') {
    cleaned = defaultCountryCode + cleaned.slice(1);
  }

  // Validate length between 10 and 15 digits (E.164 standard)
  if (cleaned.length < 10) {
    return {
      isValid: false,
      normalized: cleaned,
      error: 'Phone number is too short (minimum 10 digits)',
    };
  }

  if (cleaned.length > 15) {
    return {
      isValid: false,
      normalized: cleaned,
      error: 'Phone number is too long (maximum 15 digits)',
    };
  }

  // Display formatted: e.g. +234 803 123 4567
  const displayFormatted = `+${cleaned}`;

  return {
    isValid: true,
    normalized: cleaned,
    displayFormatted,
  };
}

/**
 * Builds wa.me link for a specific phone number.
 */
export function buildWaNumberLink(digits: string, message: string): string {
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/**
 * Builds mobile app link: whatsapp://send?text=...
 */
export function buildWaMobileAppLink(message: string): string {
  return `whatsapp://send?text=${encodeURIComponent(message)}`;
}

/**
 * Builds WhatsApp Web link: https://web.whatsapp.com/send?text=...
 */
export function buildWaWebLink(message: string): string {
  return `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

/**
 * Detects whether the current client is likely a mobile device.
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isCoarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const hasTouch = navigator.maxTouchPoints > 0;
  return isMobileUA || (hasTouch && isCoarsePointer);
}

/**
 * Manages recent phone numbers in localStorage (opt-in only).
 */
export function getRecentNumbers(): string[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(RECENT_NUMBERS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.slice(0, MAX_RECENT_NUMBERS) : [];
  } catch {
    return [];
  }
}

export function saveRecentNumber(normalizedDigits: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const current = getRecentNumbers().filter((n) => n !== normalizedDigits);
    const updated = [normalizedDigits, ...current].slice(0, MAX_RECENT_NUMBERS);
    window.localStorage.setItem(RECENT_NUMBERS_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage failure
  }
}

export function clearRecentNumbers(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(RECENT_NUMBERS_KEY);
  } catch {
    // ignore
  }
}

/**
 * Deep link serializer.
 * Uses hash query parameter #/group?plan=<base64url> or URL-safe encoded JSON.
 */
export function generatePlanDeepLink(plan: PlanPayload, baseUrl?: string): string {
  const originAndPath =
    baseUrl ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://tastematch.app/');

  const cleanBase = originAndPath.replace(/#.*$/, '');
  const jsonStr = JSON.stringify({
    t: plan.type || 'crawl',
    c: plan.city,
    s: plan.stops,
    o: plan.order || plan.stops.map((_, i) => i + 1),
    d: plan.dishes,
    r: plan.restaurantUid,
    n: plan.restaurantName,
  });

  // Base64URL encode
  let encoded = '';
  try {
    if (typeof btoa === 'function') {
      encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(jsonStr))));
    } else {
      encoded = encodeURIComponent(jsonStr);
    }
  } catch {
    encoded = encodeURIComponent(jsonStr);
  }

  const route = plan.type === 'foodrun' ? '/' : '/group';
  return `${cleanBase}#${route}?plan=${encoded}`;
}

/**
 * Deep link deserializer.
 */
export function parsePlanDeepLink(searchOrHash: string): PlanPayload | null {
  try {
    let queryStr = '';
    if (searchOrHash.includes('?')) {
      queryStr = searchOrHash.split('?')[1];
    } else {
      queryStr = searchOrHash;
    }

    const params = new URLSearchParams(queryStr);
    const planParam = params.get('plan');
    if (!planParam) return null;

    let jsonStr = '';
    try {
      if (typeof atob === 'function') {
        jsonStr = decodeURIComponent(escape(atob(decodeURIComponent(planParam))));
      } else {
        jsonStr = decodeURIComponent(planParam);
      }
    } catch {
      jsonStr = decodeURIComponent(planParam);
    }

    const obj = JSON.parse(jsonStr);
    return {
      type: obj.t || 'crawl',
      city: obj.c || '',
      stops: Array.isArray(obj.s) ? obj.s : [],
      order: Array.isArray(obj.o) ? obj.o : undefined,
      dishes: Array.isArray(obj.d) ? obj.d : undefined,
      restaurantUid: obj.r,
      restaurantName: obj.n,
    };
  } catch {
    return null;
  }
}

/**
 * Trims / caps message to ensure it stays strictly under 1,500 characters
 * before URL encoding.
 */
export function capMessageLength(
  generators: {
    full: () => string;
    short: () => string;
    minimal: () => string;
  },
  maxLen = MAX_MESSAGE_LENGTH,
): string {
  const full = generators.full();
  if (full.length <= maxLen) return full;

  const short = generators.short();
  if (short.length <= maxLen) return short;

  const minimal = generators.minimal();
  if (minimal.length <= maxLen) return minimal;

  return minimal.slice(0, maxLen - 3) + '...';
}

/**
 * Invokes native navigator.share if available and supported.
 * Silently handles AbortError (user dismissed share sheet).
 */
export async function shareViaNativeSheet(options: {
  title: string;
  text: string;
  url?: string;
}): Promise<{ success: boolean; canceled?: boolean; error?: string }> {
  if (typeof navigator === 'undefined' || !navigator.share) {
    return { success: false, error: 'Web Share API not supported on this browser' };
  }

  // Feature detect with canShare if available
  if (navigator.canShare && !navigator.canShare(options)) {
    return { success: false, error: 'Data cannot be shared via Share Sheet' };
  }

  try {
    await navigator.share(options);
    return { success: true };
  } catch (err: any) {
    if (err && (err.name === 'AbortError' || err.message?.includes('AbortError') || err.message?.includes('cancelled') || err.message?.includes('canceled'))) {
      // User canceled share sheet — no error to show
      return { success: false, canceled: true };
    }
    return { success: false, error: err?.message || 'Share failed' };
  }
}
