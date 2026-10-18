/**
 * src/tests/acceptance_a13_analytics.test.ts
 * ==========================================
 * Acceptance Test A13: Analytics Sends No Coordinates or Personal Data.
 *
 * Verifies:
 * - Exactly the 11 permitted events are supported.
 * - Unauthorized events are rejected.
 * - Runtime sanitizer prevents coordinates (lat/lon/coords) and PII (phone/email/names/user_ids).
 * - Outgoing GoatCounter requests contain zero spatial coordinates and zero personal data.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ALLOWED_EVENT_TYPES,
  FORBIDDEN_KEYS,
  validatePayloadSafety,
  sanitizePayload,
  trackEvent,
  getRecordedEvents,
  clearRecordedEvents,
  type AnalyticsEvent,
} from '@/lib/analytics';

describe('Acceptance Test A13: Privacy-Preserving Analytics', () => {
  beforeEach(() => {
    clearRecordedEvents();
    vi.restoreAllMocks();
  });

  it('A13.1: Enforces strictly the 11 permitted event types', () => {
    const expectedEvents = [
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
    ];

    expect(ALLOWED_EVENT_TYPES).toHaveLength(11);
    expect([...ALLOWED_EVENT_TYPES].sort()).toEqual(expectedEvents.sort());

    // Verify key blacklist covers spatial & PII identifiers
    expect(FORBIDDEN_KEYS).toContain('lat');
    expect(FORBIDDEN_KEYS).toContain('longitude');
    expect(FORBIDDEN_KEYS).toContain('phone');
    expect(FORBIDDEN_KEYS).toContain('email');
  });

  it('A13.2: Rejects unauthorized event types from tracking', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Attempting to track unauthorized custom event
    trackEvent({ type: 'user_location_ping' as unknown as AnalyticsEvent['type'] } as AnalyticsEvent);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Ignored unauthorized event type'));
    expect(getRecordedEvents()).toHaveLength(0);
  });

  it('A13.3: near_me_click sends NO coordinates', () => {
    trackEvent({ type: 'near_me_click' });

    const events = getRecordedEvents();
    expect(events).toHaveLength(1);
    const event = events[0];
    expect(event.type).toBe('near_me_click');

    // Confirm no coordinate properties exist in object
    const keys = Object.keys(event);
    expect(keys).not.toContain('lat');
    expect(keys).not.toContain('lon');
    expect(keys).not.toContain('latitude');
    expect(keys).not.toContain('longitude');
    expect(keys).not.toContain('coords');
    expect(keys).not.toContain('coordinates');
  });

  it('A13.4: owner_whatsapp_order_clicked contains only placeUid, NEVER the owner phone number', () => {
    trackEvent({
      type: 'owner_whatsapp_order_clicked',
      placeUid: 'osm:node/12345678',
    });

    const events = getRecordedEvents();
    expect(events).toHaveLength(1);
    const event = events[0] as { type: string; placeUid: string; phone?: string };
    expect(event.placeUid).toBe('osm:node/12345678');
    expect(event.phone).toBeUndefined();

    // Verify string serialization contains no phone number
    const serialized = JSON.stringify(event);
    expect(serialized).not.toMatch(/\+?234\d{7,10}/);
  });

  it('A13.5: whatsapp_share_clicked sends NO recipient phone numbers or personal messages', () => {
    trackEvent({
      type: 'whatsapp_share_clicked',
      shareType: 'NativeSheet',
    });

    const events = getRecordedEvents();
    expect(events).toHaveLength(1);
    const serialized = JSON.stringify(events[0]);
    expect(serialized).not.toContain('phone');
    expect(serialized).not.toContain('message');
  });

  it('A13.6: add_place_submitted transmits only city/metadata, NEVER latitude, longitude or contributor details', () => {
    trackEvent({
      type: 'add_place_submitted',
      city: 'Lagos',
    });

    const events = getRecordedEvents();
    expect(events).toHaveLength(1);
    const event = events[0];
    expect(event).toEqual({
      type: 'add_place_submitted',
      city: 'Lagos',
    });

    const keys = Object.keys(event);
    expect(keys).not.toContain('latitude');
    expect(keys).not.toContain('longitude');
    expect(keys).not.toContain('contributor');
    expect(keys).not.toContain('phone');
  });

  it('A13.7: validatePayloadSafety throws on any forbidden coordinate or personal data key', () => {
    // Spatial keys
    expect(() => validatePayloadSafety({ lat: 6.5244 }, true)).toThrow(/forbidden personal\/coordinate data/);
    expect(() => validatePayloadSafety({ longitude: 3.3792 }, true)).toThrow(/forbidden personal\/coordinate data/);
    expect(() => validatePayloadSafety({ coords: [6.5, 3.3] }, true)).toThrow(/forbidden personal\/coordinate data/);

    // Personal keys
    expect(() => validatePayloadSafety({ phone: '+2348012345678' }, true)).toThrow(/forbidden personal\/coordinate data/);
    expect(() => validatePayloadSafety({ email: 'owner@domain.com' }, true)).toThrow(/forbidden personal\/coordinate data/);
    expect(() => validatePayloadSafety({ user_id: 'usr_abc123' }, true)).toThrow(/forbidden personal\/coordinate data/);
    expect(() => validatePayloadSafety({ visitor_id: 'vis_999' }, true)).toThrow(/forbidden personal\/coordinate data/);
    expect(() => validatePayloadSafety({ ip: '127.0.0.1' }, true)).toThrow(/forbidden personal\/coordinate data/);
  });

  it('A13.8: validatePayloadSafety detects phone numbers and emails even under generic key names', () => {
    expect(() => validatePayloadSafety({ query: '+2348031234567' }, true)).toThrow(/looks like a phone number/);
    expect(() => validatePayloadSafety({ note: 'chef@restaurant.ng' }, true)).toThrow(/looks like an email address/);
  });

  it('A13.9: sanitizePayload strips forbidden properties and preserves valid fields', () => {
    const dirtyPayload = {
      type: 'search',
      city: 'Ikeja',
      cuisine: 'Suya',
      latitude: 6.595,
      longitude: 3.342,
      phone: '+2348030001122',
      visitor_id: 'xyz789',
    };

    const clean = sanitizePayload(dirtyPayload);
    expect(clean).toEqual({
      type: 'search',
      city: 'Ikeja',
      cuisine: 'Suya',
    });
    expect(clean).not.toHaveProperty('latitude');
    expect(clean).not.toHaveProperty('longitude');
    expect(clean).not.toHaveProperty('phone');
    expect(clean).not.toHaveProperty('visitor_id');
  });

  it('A13.10: GoatCounter dispatch receives clean event path and title with zero PII or coordinates', () => {
    const fakeGoatCounter = {
      count: vi.fn(),
    };
    (window as unknown as { goatcounter: typeof fakeGoatCounter }).goatcounter = fakeGoatCounter;

    // Trigger all 11 event types
    const testEvents: AnalyticsEvent[] = [
      { type: 'page_view', path: '/ng/lagos' },
      { type: 'search', city: 'Abuja', cuisine: 'Nigerian' },
      { type: 'dish_search', cuisineTag: 'Jollof', queryLength: 6 },
      { type: 'near_me_click' },
      { type: 'place_opened', placeUid: 'osm:node/111' },
      { type: 'whatsapp_share_clicked', shareType: 'NativeSheet' },
      { type: 'owner_whatsapp_order_clicked', placeUid: 'osm:node/222' },
      { type: 'claim_form_started', placeUid: 'osm:node/333' },
      { type: 'claim_submitted', placeUid: 'osm:node/333' },
      { type: 'add_place_submitted', city: 'Ibadan' },
      { type: 'install_prompt_accepted' },
    ];

    for (const evt of testEvents) {
      trackEvent(evt);
    }

    expect(fakeGoatCounter.count).toHaveBeenCalledTimes(11);

    // Deep check every single dispatched call
    for (const callArgs of fakeGoatCounter.count.mock.calls) {
      const payload = callArgs[0] as { path: string; title: string; event: boolean };
      expect(payload.event).toBe(true);

      const combinedText = `${payload.path} ${payload.title}`;

      // Assert no coordinates or spatial numeric pairs
      expect(combinedText).not.toMatch(/lat/i);
      expect(combinedText).not.toMatch(/lon/i);
      expect(combinedText).not.toMatch(/coord/i);

      // Assert no phone numbers
      expect(combinedText).not.toMatch(/\+?234\d{7,10}/);

      // Assert no emails
      expect(combinedText).not.toMatch(/[^\s@]+@[^\s@]+\.[^\s@]+/);

      // Assert no visitor or user tracking IDs
      expect(combinedText).not.toMatch(/visitor/i);
      expect(combinedText).not.toMatch(/user_id/i);
    }

    delete (window as unknown as { goatcounter?: unknown }).goatcounter;
  });
});
