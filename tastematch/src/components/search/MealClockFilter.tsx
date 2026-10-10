import type { ReactNode } from 'react';
import { Clock, Sun, Sunset, Moon, Coffee } from 'lucide-react';
import type { MealSlot } from '@/lib/openingHours';

interface MealClockFilterProps {
  openNowOnly: boolean;
  onToggleOpenNow: (val: boolean) => void;
  openLateOnly: boolean;
  onToggleOpenLate: (val: boolean) => void;
  selectedMealSlot: MealSlot | null;
  onSelectMealSlot: (slot: MealSlot | null) => void;
  unlistedHoursCount: number;
}

const MEAL_CHIPS: { slot: MealSlot; label: string; icon: ReactNode; hint: string }[] = [
  { slot: 'morning', label: 'Morning', icon: <Coffee className="w-3.5 h-3.5 text-amber-500" />, hint: 'Bakeries & cafes open early' },
  { slot: 'afternoon', label: 'Afternoon', icon: <Sun className="w-3.5 h-3.5 text-yellow-500" />, hint: 'Lunch spots open midday' },
  { slot: 'evening', label: 'Evening', icon: <Sunset className="w-3.5 h-3.5 text-orange-500" />, hint: 'Dinner spots open evening' },
  { slot: 'late-night', label: 'Late Night', icon: <Moon className="w-3.5 h-3.5 text-indigo-400" />, hint: 'Bars & fast food open late' },
];

export default function MealClockFilter({
  openNowOnly,
  onToggleOpenNow,
  openLateOnly,
  onToggleOpenLate,
  selectedMealSlot,
  onSelectMealSlot,
  unlistedHoursCount,
}: MealClockFilterProps) {
  const isTimeFilterActive = openNowOnly || openLateOnly || selectedMealSlot !== null;

  return (
    <div className="flex flex-col gap-2 p-3 bg-zinc-50/60 dark:bg-zinc-900/60 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          Naija Meal Clock (WAT / Africa/Lagos)
        </span>

        {/* Toggles: Open Now & Open Late */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onToggleOpenNow(!openNowOnly);
              if (!openNowOnly) onToggleOpenLate(false);
            }}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors border ${
              openNowOnly
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:border-emerald-500'
            }`}
          >
            🟢 Open Now
          </button>

          <button
            type="button"
            onClick={() => {
              onToggleOpenLate(!openLateOnly);
              if (!openLateOnly) onToggleOpenNow(false);
            }}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors border ${
              openLateOnly
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:border-indigo-500'
            }`}
          >
            🌙 Open Late (10 PM+)
          </button>
        </div>
      </div>

      {/* Meal slot quick chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-zinc-400 mr-1">Meal slot:</span>
        {MEAL_CHIPS.map((chip) => {
          const isSelected = selectedMealSlot === chip.slot;
          return (
            <button
              key={chip.slot}
              type="button"
              onClick={() => onSelectMealSlot(isSelected ? null : chip.slot)}
              title={chip.hint}
              className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors border ${
                isSelected
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 font-medium'
                  : 'bg-white/80 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
            >
              {chip.icon}
              {chip.label}
            </button>
          );
        })}

        {selectedMealSlot && (
          <button
            type="button"
            onClick={() => onSelectMealSlot(null)}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 underline ml-1"
          >
            Clear slot
          </button>
        )}
      </div>

      {/* Unlisted hours disclaimer */}
      {isTimeFilterActive && (
        <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/30 px-2.5 py-1 rounded-md border border-amber-200/50 dark:border-amber-900/40 mt-0.5">
          ℹ️ {unlistedHoursCount} places in this city don't list hours (only places with known opening hours are shown).
        </div>
      )}
    </div>
  );
}
