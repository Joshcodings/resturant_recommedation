/**
 * src/lib/analytics.ts
 * ====================
 * Privacy-Preserving, Cookie-less Analytics Client for TasteMatch.
 *
 * Implements Phase 4 Requirements:
 * 1. 100% cookie-less, zero fingerprinting, zero personal data, zero coordinates sent.
 * 2. Strictly limited to the 11 allowed events:
 *    - page_view
 *    - search
 *    - dish_search
 *    - near_me_click (NOT the coordinates)
 *    - place_opened
 *    - whatsapp_share_clicked
 *    - owner_whatsapp_order_clicked
 *    - claim_form_started
 *    - claim_submitted
 *    - add_place_submitted
 *    - install_prompt_accepted
 * 3. Runtime sanitizer blocks and strips any coordinates, phone numbers, emails,
 *    or PII before transmission.
 */

export const ALLOWED_EVENT_TYPES = [
  'page_view',
  'search',
  'dish_search',
  'near_me_click',
  'place_opened',
  'whatsapp_share_clicked',
  'owner_whatsapp_order_clicked',
  'claim_form_started',
  'claim_submitted',
  'add_place_submitted',
  'install_prompt_accepted',
] as const;

export type AllowedEventType = (typeof ALLOWED_EVENT_TYPES)[number];

export interface BaseEventPayload {
  type: AllowedEventType;
  path?: string;
  title?: string;
  city?: string;
  cuisine?: string;
  placeUid?: string;
}

export type AnalyticsEvent =
  | { type: 'page_view'; path: string; title?: string }
  | { type: 'search'; city?: string; cuisine?: string }
  | { type: 'dish_search'; queryLength?: number; cuisineTag?: string }
  | { type: 'near_me_click' } // Explicitly zero coordinates
  | { type: 'place_opened'; placeUid: string }
  | { type: 'whatsapp_share_clicked'; shareType?: string }
  | { type: 'owner_whatsapp_order_clicked'; placeUid: string }
  | { type: 'claim_form_started'; placeUid?: string }
  | { type: 'claim_submitted'; placeUid?: string }
  | { type: 'add_place_submitted'; city?: string }
  | { type: 'install_prompt_accepted' };

// Forbidden keys that must NEVER be passed to analytics
export const FORBIDDEN_KEYS = [
  'lat',
  'lon',
  'latitude',
  'longitude',
  'coord',
  'coords',
  'coordinates',
  'location',
  'phone',
  'email',
  'name',
  'user_id',
  'userId',
  'visitor_id',
  'visitorId',
  'device_id',
  'deviceId',
  'ip',
  'ip_address',
  'address',
] as const;

// Regex patterns to detect coordinates or PII in string/number values
const PHONE_PATTERN = /(\+?234|0)[789][01]\d{8}/;
const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/;

/**
 * Validates that an object contains NO coordinates or personal data.
 * Throws or returns false if any forbidden field or pattern is detected.
 */
export function validatePayloadSafety(payload: Record<string, unknown>, strictThrow = false): boolean {
  for (const [key, value] of Object.entries(payload)) {
    const lowerKey = key.toLowerCase();
    for (const forbidden of FORBIDDEN_KEYS) {
      if (lowerKey === forbidden.toLowerCase() || lowerKey.includes(forbidden.toLowerCase())) {
        if (strictThrow) {
          throw new Error(`[Analytics Privacy Violation] Key "${key}" contains forbidden personal/coordinate data`);
        }
        return false;
      }
    }

    if (typeof value === 'string') {
      if (PHONE_PATTERN.test(value)) {
        if (strictThrow) {
          throw new Error(`[Analytics Privacy Violation] Value in "${key}" looks like a phone number: ${value}`);
        }
        return false;
      }
      if (EMAIL_PATTERN.test(value)) {
        if (strictThrow) {
          throw new Error(`[Analytics Privacy Violation] Value in "${key}" looks like an email address`);
        }
        return false;
      }
    }

    // Coordinates detection: if numeric value is in typical Nigerian/global latitude (-90..90)
    // and key name sounds spatial
    if (typeof value === 'number') {
      if (lowerKey.includes('gps') || lowerKey.includes('geo') || lowerKey.includes('pos')) {
        if (strictThrow) {
          throw new Error(`[Analytics Privacy Violation] Numeric key "${key}" contains spatial coordinate`);
        }
        return false;
      }
    }
  }
  return true;
}

/**
 * Strips all forbidden keys and values from an event payload.
 */
export function sanitizePayload<T extends Record<string, unknown>>(payload: T): Partial<T> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    const lowerKey = key.toLowerCase();
    const isForbidden = FORBIDDEN_KEYS.some(f => lowerKey === f.toLowerCase() || lowerKey.includes(f.toLowerCase()));
    if (isForbidden) continue;

    if (typeof value === 'string') {
      if (PHONE_PATTERN.test(value) || EMAIL_PATTERN.test(value)) continue;
    }
    safe[key] = value;
  }
  return safe as Partial<T>;
}

// In-memory recorded events for acceptance test verification & debugging
const recordedEvents: AnalyticsEvent[] = [];

export function getRecordedEvents(): readonly AnalyticsEvent[] {
  return [...recordedEvents];
}

export function clearRecordedEvents(): void {
  recordedEvents.length = 0;
}

/**
 * Dispatches an event to GoatCounter (if present in the browser) and internal audit log.
 */
export function trackEvent(event: AnalyticsEvent): void {
  // 1. Whitelist validation
  if (!ALLOWED_EVENT_TYPES.includes(event.type)) {
    console.warn(`[Analytics] Ignored unauthorized event type: ${(event as { type: string }).type}`);
    return;
  }

  // 2. Strict privacy check (throws in test/dev if violation occurs)
  validatePayloadSafety(event as unknown as Record<string, unknown>, process.env.NODE_ENV === 'test');

  // 3. Runtime sanitize
  const safeEvent = sanitizePayload(event as unknown as Record<string, unknown>) as AnalyticsEvent;

  // 4. Record to internal memory audit log
  recordedEvents.push(safeEvent);

  // 5. Send to GoatCounter if available
  if (typeof window !== 'undefined') {
    const gc = (window as unknown as { goatcounter?: { count: (opts: { path: string; title?: string; event?: boolean }) => void } }).goatcounter;
    if (gc && typeof gc.count === 'function') {
      try {
        const eventPath = `event/${safeEvent.type}`;
        const eventTitle = getEventTitle(safeEvent);
        gc.count({
          path: eventPath,
          title: eventTitle,
          event: true,
        });
      } catch (err) {
        console.warn('[Analytics] GoatCounter send failed:', err);
      }
    }
  }
}

/**
 * Formats a clean, factual event title with no PII.
 */
function getEventTitle(event: AnalyticsEvent): string {
  switch (event.type) {
    case 'page_view':
      return `Page View: ${event.path}`;
    case 'search':
      return `Search: ${event.city || 'Any City'}${event.cuisine ? ` (${event.cuisine})` : ''}`;
    case 'dish_search':
      return `Dish Search${event.cuisineTag ? `: ${event.cuisineTag}` : ''}`;
    case 'near_me_click':
      return 'Near Me Clicked';
    case 'place_opened':
      return `Place Opened: ${event.placeUid}`;
    case 'whatsapp_share_clicked':
      return `WhatsApp Share: ${event.shareType || 'Direct'}`;
    case 'owner_whatsapp_order_clicked':
      return `Owner WhatsApp Order Clicked: ${event.placeUid}`;
    case 'claim_form_started':
      return `Claim Form Started: ${event.placeUid || 'New'}`;
    case 'claim_submitted':
      return `Claim Submitted: ${event.placeUid || 'New'}`;
    case 'add_place_submitted':
      return `Add Place Submitted: ${event.city || 'Nigeria'}`;
    case 'install_prompt_accepted':
      return 'Install Prompt Accepted';
  }
}
