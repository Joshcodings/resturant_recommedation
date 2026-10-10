/**
 * src/lib/openingHours.ts
 * =======================
 * Client-side parser for OpenStreetMap opening_hours in Africa/Lagos timezone (WAT, UTC+1).
 * Strictly conforms to:
 * - Real data only: unknown or missing hours return null, never assumed open or closed.
 * - Handles 24/7, multi-day ranges (Mo-Fr, Sa-Su), day lists (Mo,We,Fr), time ranges,
 *   overnight ranges crossing midnight (e.g. 18:00-03:00), and semicolon-separated rules.
 */

export type DayOfWeek = 'Mo' | 'Tu' | 'We' | 'Th' | 'Fr' | 'Sa' | 'Su';
export const DAYS_OF_WEEK: DayOfWeek[] = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export interface TimeSlot {
  startMinutes: number; // minutes from midnight (0 - 1440)
  endMinutes: number;   // minutes from midnight (0 - 1440 or >1440 for overnight)
}

export interface DaySchedule {
  day: DayOfWeek;
  isClosed: boolean;
  is24Hours: boolean;
  slots: TimeSlot[];
}

export interface ParsedSchedule {
  raw: string;
  is24_7: boolean;
  byDay: Record<DayOfWeek, DaySchedule>;
}

export type MealSlot = 'morning' | 'afternoon' | 'evening' | 'late-night';

export const MEAL_SLOT_TIMES: Record<MealSlot, { hour: number; minute: number; label: string; placeTypes?: string[] }> = {
  morning: { hour: 8, minute: 30, label: 'Morning (Breakfast & Cafe)', placeTypes: ['cafe', 'bakery'] },
  afternoon: { hour: 13, minute: 0, label: 'Afternoon (Lunch)' },
  evening: { hour: 19, minute: 30, label: 'Evening (Dinner)' },
  'late-night': { hour: 22, minute: 30, label: 'Late Night (10 PM+)', placeTypes: ['bar', 'pub', 'fast_food'] },
};

/**
 * Converts a Date to Africa/Lagos time (WAT = UTC+1, no daylight saving time).
 */
export function getLagosTime(date: Date = new Date()): {
  dayOfWeek: DayOfWeek;
  hours: number;
  minutes: number;
  timeMinutes: number;
} {
  // WAT is UTC+1 (3600000 ms)
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const lagosDate = new Date(utcMs + 3600000);

  const jsDay = lagosDate.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const dayMap: Record<number, DayOfWeek> = {
    0: 'Su',
    1: 'Mo',
    2: 'Tu',
    3: 'We',
    4: 'Th',
    5: 'Fr',
    6: 'Sa',
  };

  const dayOfWeek = dayMap[jsDay];
  const hours = lagosDate.getHours();
  const minutes = lagosDate.getMinutes();
  const timeMinutes = hours * 60 + minutes;

  return { dayOfWeek, hours, minutes, timeMinutes };
}

/**
 * Returns previous day of week for overnight check.
 */
export function getPreviousDay(day: DayOfWeek): DayOfWeek {
  const idx = DAYS_OF_WEEK.indexOf(day);
  return DAYS_OF_WEEK[(idx - 1 + 7) % 7];
}

/**
 * Parses "HH:MM" into minutes from midnight.
 */
function parseTime(timeStr: string): number | null {
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h < 0 || h > 24 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/**
 * Parses day range string like "Mo-Fr", "Sa,Su", "Mo-Su".
 */
function expandDays(dayStr: string): DayOfWeek[] {
  const result: DayOfWeek[] = [];
  const parts = dayStr.split(',').map((p) => p.trim());

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map((s) => s.trim() as DayOfWeek);
      const startIdx = DAYS_OF_WEEK.indexOf(start);
      const endIdx = DAYS_OF_WEEK.indexOf(end);
      if (startIdx !== -1 && endIdx !== -1) {
        if (startIdx <= endIdx) {
          for (let i = startIdx; i <= endIdx; i++) {
            result.push(DAYS_OF_WEEK[i]);
          }
        } else {
          // Wraps around weekend, e.g. Sa-Tu
          for (let i = startIdx; i < 7; i++) result.push(DAYS_OF_WEEK[i]);
          for (let i = 0; i <= endIdx; i++) result.push(DAYS_OF_WEEK[i]);
        }
      }
    } else {
      const d = part as DayOfWeek;
      if (DAYS_OF_WEEK.includes(d)) {
        result.push(d);
      }
    }
  }

  return Array.from(new Set(result));
}

/**
 * Parses an OSM opening_hours string into structured schedule.
 */
export function parseOpeningHours(rawStr: string | null | undefined): ParsedSchedule | null {
  if (!rawStr || typeof rawStr !== 'string') return null;
  const str = rawStr.trim();
  if (!str) return null;

  const schedule: ParsedSchedule = {
    raw: str,
    is24_7: false,
    byDay: {
      Mo: { day: 'Mo', isClosed: false, is24Hours: false, slots: [] },
      Tu: { day: 'Tu', isClosed: false, is24Hours: false, slots: [] },
      We: { day: 'We', isClosed: false, is24Hours: false, slots: [] },
      Th: { day: 'Th', isClosed: false, is24Hours: false, slots: [] },
      Fr: { day: 'Fr', isClosed: false, is24Hours: false, slots: [] },
      Sa: { day: 'Sa', isClosed: false, is24Hours: false, slots: [] },
      Su: { day: 'Su', isClosed: false, is24Hours: false, slots: [] },
    },
  };

  const lower = str.toLowerCase();
  if (lower === '24/7' || lower === '24hrs' || lower === '24 hours' || lower === 'open 24 hours') {
    schedule.is24_7 = true;
    for (const d of DAYS_OF_WEEK) {
      schedule.byDay[d].is24Hours = true;
      schedule.byDay[d].slots = [{ startMinutes: 0, endMinutes: 1440 }];
    }
    return schedule;
  }

  // Split by semicolon
  const rules = str.split(';');
  let matchedAny = false;

  for (const rule of rules) {
    const trimmed = rule.trim();
    if (!trimmed) continue;

    // e.g. "Mo-Sa 08:00-22:00" or "Su off" or "09:00-21:00"
    // Match day part:
    const dayMatch = trimmed.match(/^([A-Za-z,-]+)\s+(.+)$/);
    let targetDays: DayOfWeek[] = [];
    let timePart = trimmed;

    if (dayMatch) {
      const daySpec = dayMatch[1];
      const parsedDays = expandDays(daySpec);
      if (parsedDays.length > 0) {
        targetDays = parsedDays;
        timePart = dayMatch[2].trim();
      }
    }

    if (targetDays.length === 0) {
      // Default to all days if no day specified
      targetDays = [...DAYS_OF_WEEK];
    }

    const timeLower = timePart.toLowerCase();
    if (timeLower === 'off' || timeLower === 'closed') {
      for (const d of targetDays) {
        schedule.byDay[d].isClosed = true;
        schedule.byDay[d].slots = [];
      }
      matchedAny = true;
      continue;
    }

    // Time ranges e.g. "08:00-22:00", "00:00-24:00", "18:00-03:00"
    const timeRanges = timePart.split(',').map((t) => t.trim());
    for (const tr of timeRanges) {
      const match = tr.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
      if (match) {
        const start = parseTime(match[1]);
        let end = parseTime(match[2]);
        if (start !== null && end !== null) {
          // If end <= start, it crosses midnight (e.g. 18:00-03:00)
          if (end <= start) {
            end = end + 1440;
          }
          for (const d of targetDays) {
            schedule.byDay[d].slots.push({ startMinutes: start, endMinutes: end });
          }
          matchedAny = true;
        }
      }
    }
  }

  return matchedAny ? schedule : null;
}

/**
 * Checks if a restaurant is currently open in Africa/Lagos time.
 * Returns:
 * - true if open
 * - false if closed
 * - null if opening_hours is unknown / missing / unparseable
 */
export function isOpenNow(rawHours: string | null | undefined, referenceDate?: Date): boolean | null {
  if (!rawHours) return null;
  const schedule = parseOpeningHours(rawHours);
  if (!schedule) return null;
  if (schedule.is24_7) return true;

  const { dayOfWeek, timeMinutes } = getLagosTime(referenceDate);

  // Check today's slots
  const todaySchedule = schedule.byDay[dayOfWeek];
  if (todaySchedule.is24Hours) return true;
  if (!todaySchedule.isClosed) {
    for (const slot of todaySchedule.slots) {
      if (slot.endMinutes > 1440) {
        // Overnight slot starting today
        if (timeMinutes >= slot.startMinutes) return true;
      } else {
        if (timeMinutes >= slot.startMinutes && timeMinutes <= slot.endMinutes) {
          return true;
        }
      }
    }
  }

  // Check overnight slot from yesterday that spills into today (timeMinutes < 1440)
  const prevDay = getPreviousDay(dayOfWeek);
  const prevSchedule = schedule.byDay[prevDay];
  if (!prevSchedule.isClosed) {
    for (const slot of prevSchedule.slots) {
      if (slot.endMinutes > 1440) {
        const morningSpillMinutes = slot.endMinutes - 1440;
        if (timeMinutes <= morningSpillMinutes) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Checks if a restaurant is open late (at or after 10 PM / 22:00) in Africa/Lagos time.
 * Returns:
 * - true if open at or past 22:00
 * - false if closes earlier
 * - null if opening_hours is unknown / missing / unparseable
 */
export function isOpenLate(rawHours: string | null | undefined, referenceDate?: Date): boolean | null {
  if (!rawHours) return null;
  const schedule = parseOpeningHours(rawHours);
  if (!schedule) return null;
  if (schedule.is24_7) return true;

  const { dayOfWeek } = getLagosTime(referenceDate);
  const todaySchedule = schedule.byDay[dayOfWeek];
  if (todaySchedule.is24Hours) return true;
  if (todaySchedule.isClosed) return false;

  const TEN_PM = 22 * 60; // 1320 minutes

  for (const slot of todaySchedule.slots) {
    // Open past 22:00 if start is <= 22:00 and end > 22:00, or start >= 22:00
    if (slot.endMinutes > TEN_PM) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a restaurant is open at a specific meal slot time.
 */
export function isOpenAtMealSlot(
  rawHours: string | null | undefined,
  slot: MealSlot,
  referenceDate?: Date
): boolean | null {
  if (!rawHours) return null;
  const schedule = parseOpeningHours(rawHours);
  if (!schedule) return null;
  if (schedule.is24_7) return true;

  const config = MEAL_SLOT_TIMES[slot];
  const targetMinutes = config.hour * 60 + config.minute;
  const { dayOfWeek } = getLagosTime(referenceDate);

  const todaySchedule = schedule.byDay[dayOfWeek];
  if (todaySchedule.is24Hours) return true;
  if (todaySchedule.isClosed) return false;

  for (const s of todaySchedule.slots) {
    if (s.endMinutes > 1440) {
      if (targetMinutes >= s.startMinutes) return true;
    } else {
      if (targetMinutes >= s.startMinutes && targetMinutes <= s.endMinutes) return true;
    }
  }

  // Also check yesterday's spillover if morning slot
  const prevDay = getPreviousDay(dayOfWeek);
  const prevSchedule = schedule.byDay[prevDay];
  for (const s of prevSchedule.slots) {
    if (s.endMinutes > 1440) {
      const spill = s.endMinutes - 1440;
      if (targetMinutes <= spill) return true;
    }
  }

  return false;
}
