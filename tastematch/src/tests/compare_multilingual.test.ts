import { describe, it, expect } from 'vitest';
import {
  findNearestLandmark,
} from '@/lib/landmarks';
import {
  SUPPORTED_LANGUAGES,
  TRANSLATIONS,
  DRAFT_DISCLAIMER,
  type SupportedLocale,
} from '@/config/i18nDrafts';
import type { Landmark, RestaurantParsed } from '@/types/restaurant';
import { isOpenNow } from '@/lib/openingHours';

describe('Gate 5F — Feature 11: Compare Mode Extension', () => {
  const mockLandmarks: Landmark[] = [
    {
      uid: 'lm:cc_ikeja',
      name: 'Ikeja City Mall',
      category: 'mall',
      city: 'Lagos',
      latitude: 6.6138,
      longitude: 3.3585,
    },
    {
      uid: 'lm:nat_theatre',
      name: 'National Arts Theatre',
      category: 'landmark',
      city: 'Lagos',
      latitude: 6.4772,
      longitude: 3.3697,
    },
    {
      uid: 'lm:abuja_gate',
      name: 'City Gate Abuja',
      category: 'landmark',
      city: 'Abuja',
      latitude: 9.0433,
      longitude: 7.4382,
    },
  ];

  it('finds the nearest landmark for a restaurant in the same city', () => {
    // Restaurant right next to Ikeja City Mall (lat 6.6140, lon 3.3590)
    const restaurant = {
      latitude: 6.6140,
      longitude: 3.3590,
      city: 'Lagos',
    };

    const nearest = findNearestLandmark(restaurant, mockLandmarks);
    expect(nearest).not.toBeNull();
    expect(nearest!.landmark.name).toBe('Ikeja City Mall');
    expect(nearest!.distanceKm).toBeLessThan(0.1); // < 100 meters
  });

  it('returns null when restaurant has no coordinates or no landmarks exist', () => {
    expect(findNearestLandmark({ latitude: 0, longitude: 0 }, mockLandmarks)).toBeNull();
    expect(findNearestLandmark({ latitude: 6.6, longitude: 3.3 }, [])).toBeNull();
  });

  it('correctly detects row visibility and formats payment methods', () => {
    const restaurantA: Partial<RestaurantParsed> = {
      uid: 'osm:1',
      restaurant_name: 'Buka A',
      payment_methods: { cash: true, cards: true, mobile_payment: true },
    };
    const restaurantB: Partial<RestaurantParsed> = {
      uid: 'osm:2',
      restaurant_name: 'Buka B',
      payment_methods: null,
    };
    const tray = [restaurantA, restaurantB];

    const hasPaymentData = tray.some(
      r => r.payment_methods && (
        r.payment_methods.cash !== undefined ||
        r.payment_methods.cards !== undefined ||
        r.payment_methods.mobile_payment !== undefined
      )
    );
    expect(hasPaymentData).toBe(true);

    // Formatter logic
    const formatPayment = (r: Partial<RestaurantParsed>) => {
      if (!r.payment_methods) return '—';
      const methods: string[] = [];
      if (r.payment_methods.cash) methods.push('Cash');
      if (r.payment_methods.cards) methods.push('Cards / POS');
      if (r.payment_methods.mobile_payment) methods.push('Transfer');
      return methods.length > 0 ? methods.join(', ') : 'None listed';
    };

    expect(formatPayment(restaurantA)).toBe('Cash, Cards / POS, Transfer');
    expect(formatPayment(restaurantB)).toBe('—');
  });

  it('correctly detects row visibility and formats backup generator & AC', () => {
    const restaurantWithPower: Partial<RestaurantParsed> = {
      uid: 'osm:1',
      power: { backup_generator: true },
      air_conditioning: true,
    };
    const restaurantWithoutData: Partial<RestaurantParsed> = {
      uid: 'osm:2',
      power: null,
      air_conditioning: null,
    };

    const tray = [restaurantWithPower, restaurantWithoutData];

    const hasPowerData = tray.some(
      r => r.power?.backup_generator !== undefined && r.power?.backup_generator !== null
    );
    const hasAcData = tray.some(
      r => r.air_conditioning !== undefined && r.air_conditioning !== null
    );

    expect(hasPowerData).toBe(true);
    expect(hasAcData).toBe(true);

    const formatPower = (r: Partial<RestaurantParsed>) => {
      const gen = r.power?.backup_generator;
      if (gen === true || gen === 'yes' || gen === 'generator') return '⚡ Yes (Generator)';
      if (gen === false || gen === 'no') return '– No';
      return '—';
    };

    const formatAc = (r: Partial<RestaurantParsed>) => {
      if (r.air_conditioning === true) return '❄️ Yes (AC)';
      if (r.air_conditioning === false) return '– No';
      return '—';
    };

    expect(formatPower(restaurantWithPower)).toBe('⚡ Yes (Generator)');
    expect(formatPower(restaurantWithoutData)).toBe('—');

    expect(formatAc(restaurantWithPower)).toBe('❄️ Yes (AC)');
    expect(formatAc(restaurantWithoutData)).toBe('—');
  });

  it('correctly evaluates open now status row', () => {
    const rOpen: Partial<RestaurantParsed> = {
      uid: 'osm:1',
      opening_hours: '24/7',
    };
    const rNoHours: Partial<RestaurantParsed> = {
      uid: 'osm:2',
      opening_hours: null,
    };

    const tray = [rOpen, rNoHours];
    const hasOpenHoursData = tray.some(r => !!r.opening_hours);
    expect(hasOpenHoursData).toBe(true);
    expect(isOpenNow(rOpen.opening_hours!)).toBe(true);
  });
});

describe('Gate 5F — Feature 12: Multilingual Draft Strings & Hard Rule 7 Compliance', () => {
  it('defines the canonical disclaimer text', () => {
    expect(DRAFT_DISCLAIMER).toBe('(draft — needs native-speaker review)');
  });

  it('supports English and the four Nigerian languages/dialects', () => {
    const codes = SUPPORTED_LANGUAGES.map(l => l.code);
    expect(codes).toEqual(['en', 'pcm', 'yo', 'ig', 'ha']);
  });

  it('flags all Nigerian languages with isDraft=true and includes the disclaimer in sublabel', () => {
    const draftLanguages = SUPPORTED_LANGUAGES.filter(l => l.code !== 'en');
    expect(draftLanguages.length).toBe(4);

    for (const lang of draftLanguages) {
      expect(lang.isDraft).toBe(true);
      expect(lang.sublabel).toBe(DRAFT_DISCLAIMER);
    }

    const en = SUPPORTED_LANGUAGES.find(l => l.code === 'en')!;
    expect(en.isDraft).toBe(false);
  });

  it('strictly adheres to Hard Rule 7: every single non-English translated string includes the disclaimer', () => {
    const nonEnglishLocales: SupportedLocale[] = ['pcm', 'yo', 'ig', 'ha'];

    for (const locale of nonEnglishLocales) {
      const dict = TRANSLATIONS[locale];
      expect(dict).toBeDefined();

      // Check all string entries in the translation dictionary except draft_disclaimer_notice
      for (const [key, value] of Object.entries(dict)) {
        if (key === 'draft_disclaimer_notice') continue;
        expect(
          value.includes('needs native-speaker review'),
          `Locale "${locale}" key "${key}" must contain the native-speaker review disclaimer per Hard Rule 7! Found: "${value}"`
        ).toBe(true);
      }
    }
  });

  it('has valid fallback translations for all keys in English', () => {
    const en = TRANSLATIONS.en;
    expect(en.nav_discover).toBe('Discover');
    expect(en.nav_group).toBe('Group');
    expect(en.nav_insights).toBe('Insights');
    expect(en.nav_about).toBe('About');
    expect(en.btn_add_place).toBe('Add a Place');
    expect(en.compare_title).toBe('Compare Restaurants');
  });
});
