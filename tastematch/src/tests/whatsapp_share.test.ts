import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  normalizePhoneNumber,
  buildWaNumberLink,
  buildWaMobileAppLink,
  buildWaWebLink,
  capMessageLength,
  generatePlanDeepLink,
  parsePlanDeepLink,
  shareViaNativeSheet,
  getRecentNumbers,
  saveRecentNumber,
  clearRecentNumbers,
} from '@/lib/whatsappShare';

describe('WhatsApp Share Helper (src/lib/whatsappShare.ts)', () => {
  describe('Phone Number Normaliser', () => {
    it('normalises 08031234567 by replacing single leading 0 with 234', () => {
      const res = normalizePhoneNumber('08031234567');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('2348031234567');
      expect(res.displayFormatted).toBe('+2348031234567');
    });

    it('normalises +234 803 123 4567 by stripping plus and spaces', () => {
      const res = normalizePhoneNumber('+234 803 123 4567');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('2348031234567');
    });

    it('normalises 0803-123-4567 by stripping dashes and replacing 0', () => {
      const res = normalizePhoneNumber('0803-123-4567');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('2348031234567');
    });

    it('normalises (0803) 123 4567 by stripping brackets and spaces', () => {
      const res = normalizePhoneNumber('(0803) 123 4567');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('2348031234567');
    });

    it('accepts already normalized 2348031234567 without modification', () => {
      const res = normalizePhoneNumber('2348031234567');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('2348031234567');
    });

    it('rejects numbers that are too short (< 10 digits)', () => {
      const res = normalizePhoneNumber('080312');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('too short');
    });

    it('rejects numbers containing letters', () => {
      const res = normalizePhoneNumber('0803123ABCD');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('digits only');
    });

    it('rejects completely invalid strings', () => {
      const res = normalizePhoneNumber('letters');
      expect(res.isValid).toBe(false);
    });
  });

  describe('URL Encoding & Special Characters', () => {
    it('properly encodes Ł, newlines, &, and # in place names and messages', () => {
      const placeName = 'Łódź Grill & Suya #1';
      const text = `🍽️ Place: ${placeName}\n📍 Lagos\nOrder: Jollof & Asun #Hot`;
      const link = buildWaNumberLink('2348031234567', text);

      expect(link).toContain('https://wa.me/2348031234567?text=');
      // Ł is %C5%81
      expect(link).toContain('%C5%81');
      // & is %26
      expect(link).toContain('%26');
      // # is %23
      expect(link).toContain('%23');
      // newline is %0A
      expect(link).toContain('%0A');
    });

    it('builds valid mobile and desktop chat URLs', () => {
      const text = 'Owambe Crawl: Stop 1 -> Stop 2';
      const mobileLink = buildWaMobileAppLink(text);
      const webLink = buildWaWebLink(text);

      expect(mobileLink).toBe(`whatsapp://send?text=${encodeURIComponent(text)}`);
      expect(webLink).toBe(`https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`);
    });
  });

  describe('Message Length Capping (< 1,500 chars) & 5-Stop Plan Test', () => {
    it('keeps message strictly under 1,500 chars and shortens details progressively', () => {
      const deepLink = 'https://tastematch.app/#/group?plan=xyz';

      // Simulate a verbose 5-stop plan
      const stops = [
        { name: 'Nok by Alara', locality: 'Victoria Island, Lagos', desc: 'Fine dining African fusion with long menu items and elaborate wine pairings and drinks '.repeat(5) },
        { name: 'Danfo Bistro & Dives', locality: 'Ikoyi, Lagos', desc: 'Classic Lagos street style diner with artisanal burgers, cocktails and music '.repeat(5) },
        { name: 'Terra Kulture Food Lounge', locality: 'Victoria Island, Lagos', desc: 'Authentic Nigerian pounded yam, egusi and cultural performance atmosphere '.repeat(5) },
        { name: 'Circa NonPareil', locality: 'Lekki Phase 1, Lagos', desc: 'Waterfront view luxury dining with continental and local specialities '.repeat(5) },
        { name: 'Yellow Chilli Restaurant & Bar', locality: 'Ikeja GRA, Lagos', desc: 'Famous Jollof fiesta, seafood okra and grilled seafood delicacies '.repeat(5) },
      ];

      const fullGenerator = () => {
        return [
          '🎉 *TasteMatch Owambe 5-Stop Crawl: Lagos*',
          ...stops.map((s, i) => `${i + 1}. *${s.name}* (${s.locality})\n   Details: ${s.desc}`),
          '',
          `Open plan: ${deepLink}`,
        ].join('\n');
      };

      const shortGenerator = () => {
        return [
          '🎉 *TasteMatch Owambe 5-Stop Crawl: Lagos*',
          ...stops.map((s, i) => `${i + 1}. *${s.name}* (${s.locality})`),
          '',
          `Open plan: ${deepLink}`,
        ].join('\n');
      };

      const minimalGenerator = () => {
        return `🎉 TasteMatch 5-Stop Crawl in Lagos (${stops.length} stops), open the plan: ${deepLink}`;
      };

      const fullText = fullGenerator();
      expect(fullText.length).toBeGreaterThan(1500);

      const capped = capMessageLength({
        full: fullGenerator,
        short: shortGenerator,
        minimal: minimalGenerator,
      });

      expect(capped.length).toBeLessThan(1500);
      expect(capped).toContain('Nok by Alara');
      expect(capped).toContain(deepLink);
    });

    it('falls back to minimal message if even short details exceed 1,500 chars', () => {
      const deepLink = 'https://tastematch.app/#/group?plan=test';
      const hugeName = 'A'.repeat(400);

      const fullGenerator = () => 'FULL '.repeat(400);
      const shortGenerator = () => `SHORT ${hugeName} ${hugeName} ${hugeName} ${hugeName}`;
      const minimalGenerator = () => `5 stops, open the plan: ${deepLink}`;

      const capped = capMessageLength({
        full: fullGenerator,
        short: shortGenerator,
        minimal: minimalGenerator,
      });

      expect(capped.length).toBeLessThan(1500);
      expect(capped).toBe(`5 stops, open the plan: ${deepLink}`);
    });
  });

  describe('Deep Linking Plan State', () => {
    it('serializes and deserializes plan payload into hash URL', () => {
      const plan = {
        type: 'crawl' as const,
        city: 'Lagos',
        stops: ['osm:node/12345', 'osm:way/67890'],
        order: [1, 2],
      };

      const link = generatePlanDeepLink(plan, 'https://tastematch.app/');
      expect(link).toContain('https://tastematch.app/#/group?plan=');

      const parsed = parsePlanDeepLink(link);
      expect(parsed).not.toBeNull();
      expect(parsed?.city).toBe('Lagos');
      expect(parsed?.stops).toEqual(['osm:node/12345', 'osm:way/67890']);
      expect(parsed?.order).toEqual([1, 2]);
    });

    it('gracefully handles corrupted deep link parameters without crashing', () => {
      const parsed = parsePlanDeepLink('#/group?plan=invalid_not_json_or_b64');
      expect(parsed).toBeNull();
    });
  });

  describe('Recent Numbers Management (localStorage)', () => {
    let store: Record<string, string> = {};

    beforeEach(() => {
      store = {};
      const storageMock = {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
          store[key] = value.toString();
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          store = {};
        },
      };
      Object.defineProperty(window, 'localStorage', {
        value: storageMock,
        writable: true,
      });
    });

    afterEach(() => {
      store = {};
    });

    it('stores up to 5 unique recent numbers and clears them', () => {
      expect(getRecentNumbers()).toEqual([]);

      saveRecentNumber('2348031111111');
      saveRecentNumber('2348032222222');
      saveRecentNumber('2348033333333');
      saveRecentNumber('2348034444444');
      saveRecentNumber('2348035555555');
      saveRecentNumber('2348036666666'); // 6th number

      const recent = getRecentNumbers();
      expect(recent.length).toBe(5);
      expect(recent[0]).toBe('2348036666666'); // Most recent first
      expect(recent).not.toContain('2348031111111'); // Evicted oldest

      clearRecentNumbers();
      expect(getRecentNumbers()).toEqual([]);
    });
  });

  describe('Native Share API Mock (Success, AbortError, Unsupported)', () => {
    it('returns success when navigator.share succeeds', async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        share: shareMock,
        canShare: () => true,
      });

      const res = await shareViaNativeSheet({
        title: 'Food Crawl',
        text: 'Join my crawl!',
        url: 'https://tastematch.app/#/group',
      });

      expect(shareMock).toHaveBeenCalledOnce();
      expect(res.success).toBe(true);
      expect(res.canceled).toBeFalsy();
    });

    it('silently returns canceled: true when user triggers AbortError', async () => {
      const abortErr = new Error('User cancelled');
      abortErr.name = 'AbortError';

      const shareMock = vi.fn().mockRejectedValue(abortErr);
      vi.stubGlobal('navigator', {
        share: shareMock,
        canShare: () => true,
      });

      const res = await shareViaNativeSheet({
        title: 'Food Crawl',
        text: 'Join my crawl!',
      });

      expect(res.success).toBe(false);
      expect(res.canceled).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('returns unsupported error when navigator.share does not exist', async () => {
      vi.stubGlobal('navigator', {});

      const res = await shareViaNativeSheet({
        title: 'Food Crawl',
        text: 'Join my crawl!',
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('not supported');
    });
  });
});
