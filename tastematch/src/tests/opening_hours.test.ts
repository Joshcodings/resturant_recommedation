import { describe, it, expect } from 'vitest';
import {
  parseOpeningHours,
  isOpenNow,
  isOpenLate,
  isOpenAtMealSlot,
  getLagosTime,
} from '@/lib/openingHours';

describe('openingHours parser (Africa/Lagos WAT, UTC+1)', () => {
  it('strictly returns null for null, undefined, or empty hours (Rule 1 compliance)', () => {
    expect(parseOpeningHours(null)).toBeNull();
    expect(parseOpeningHours(undefined)).toBeNull();
    expect(parseOpeningHours('')).toBeNull();
    expect(isOpenNow(null)).toBeNull();
    expect(isOpenNow(undefined)).toBeNull();
    expect(isOpenLate(null)).toBeNull();
    expect(isOpenAtMealSlot(null, 'morning')).toBeNull();
  });

  it('correctly parses 24/7 and 24hrs', () => {
    const p1 = parseOpeningHours('24/7');
    expect(p1?.is24_7).toBe(true);
    expect(isOpenNow('24/7')).toBe(true);
    expect(isOpenLate('24/7')).toBe(true);

    const p2 = parseOpeningHours('24hrs');
    expect(p2?.is24_7).toBe(true);
    expect(isOpenNow('24hrs')).toBe(true);
    expect(isOpenLate('24hrs')).toBe(true);
  });

  it('evaluates opening hours in Africa/Lagos time (UTC+1)', () => {
    // 2026-10-14 is a Wednesday.
    // UTC 11:00 corresponds to 12:00 (noon) in Lagos (UTC+1).
    const wednesdayUtc11 = new Date('2026-10-14T11:00:00Z');
    const lagosTime = getLagosTime(wednesdayUtc11);
    expect(lagosTime.dayOfWeek).toBe('We');
    expect(lagosTime.hours).toBe(12);
    expect(lagosTime.minutes).toBe(0);

    // Test a restaurant open Mo-Fr 09:00-17:00
    const hours = 'Mo-Fr 09:00-17:00';
    expect(isOpenNow(hours, wednesdayUtc11)).toBe(true);

    // Test Sunday: should be closed
    const sundayUtc11 = new Date('2026-10-18T11:00:00Z'); // Sunday 12:00 Lagos
    expect(isOpenNow(hours, sundayUtc11)).toBe(false);
  });

  it('handles off days explicitly (Mo-Sa 07:00-19:30; Su off)', () => {
    const hours = 'Mo-Sa 07:00-19:30; Su off';
    // Wednesday 10:00 Lagos (09:00 UTC)
    const wednesdayUtc09 = new Date('2026-10-14T09:00:00Z');
    expect(isOpenNow(hours, wednesdayUtc09)).toBe(true);

    // Sunday 10:00 Lagos
    const sundayUtc09 = new Date('2026-10-18T09:00:00Z');
    expect(isOpenNow(hours, sundayUtc09)).toBe(false);
  });

  it('handles overnight shifts crossing midnight (Tu-Su 19:00-03:00)', () => {
    const hours = 'Tu-Su 19:00-03:00';

    // Wednesday at 23:30 Lagos (22:30 UTC): open
    const wedNightUtc = new Date('2026-10-14T22:30:00Z');
    expect(isOpenNow(hours, wedNightUtc)).toBe(true);

    // Thursday at 01:30 Lagos (00:30 UTC): still open from Wednesday night
    const thuEarlyUtc = new Date('2026-10-15T00:30:00Z');
    expect(isOpenNow(hours, thuEarlyUtc)).toBe(true);

    // Thursday at 04:00 Lagos (03:00 UTC): closed (closes at 03:00)
    const thuLateUtc = new Date('2026-10-15T03:00:00Z');
    expect(isOpenNow(hours, thuLateUtc)).toBe(false);
  });

  it('correctly checks isOpenLate (open after 10 PM / 22:00)', () => {
    // Closes at 21:00 -> not open late
    expect(isOpenLate('Mo-Su 09:00-21:00')).toBe(false);

    // Closes at 23:00 -> open late
    expect(isOpenLate('Mo-Sa 08:00-23:00; Su 10:00-23:00')).toBe(true);

    // Closes at 03:00 next day -> open late
    expect(isOpenLate('Tu-Su 19:00-03:00')).toBe(true);
  });

  it('correctly checks meal slots (morning, afternoon, evening, late-night)', () => {
    const bakeryHours = 'Mo-Sa 07:00-18:00';
    // Morning (08:30) on a Wednesday
    const wedDate = new Date('2026-10-14T12:00:00Z');
    expect(isOpenAtMealSlot(bakeryHours, 'morning', wedDate)).toBe(true);
    expect(isOpenAtMealSlot(bakeryHours, 'late-night', wedDate)).toBe(false);

    const barHours = 'Mo-Su 18:00-02:00';
    expect(isOpenAtMealSlot(barHours, 'morning', wedDate)).toBe(false);
    expect(isOpenAtMealSlot(barHours, 'late-night', wedDate)).toBe(true);
  });
});
