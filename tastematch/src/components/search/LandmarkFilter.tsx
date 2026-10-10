import { useState } from 'react';
import { MapPin, Navigation, X } from 'lucide-react';
import type { Landmark } from '@/types/restaurant';
import { LANDMARK_RADII, CATEGORY_LABELS } from '@/lib/landmarks';

interface LandmarkFilterProps {
  cityName: string;
  landmarks: Landmark[];
  selectedLandmark: Landmark | null;
  selectedRadiusKm: number;
  onSelectLandmark: (landmark: Landmark | null) => void;
  onSelectRadiusKm: (radius: number) => void;
}

export default function LandmarkFilter({
  cityName,
  landmarks,
  selectedLandmark,
  selectedRadiusKm,
  onSelectLandmark,
  onSelectRadiusKm,
}: LandmarkFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  if (landmarks.length === 0) {
    return null; // Graceful fallback: no landmark UI rendered if none in city
  }

  const filteredLandmarks = landmarks.filter((lm) =>
    lm.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-2 p-3 bg-zinc-50/60 dark:bg-zinc-900/60 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          Near a Landmark in {cityName}
        </span>

        {selectedLandmark && (
          <button
            type="button"
            onClick={() => onSelectLandmark(null)}
            className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 font-medium"
          >
            <X className="w-3 h-3" />
            Clear landmark (all {cityName})
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Landmark selector button */}
        <div className="relative flex-1 min-w-[220px]">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`w-full text-left px-3 py-1.5 text-xs rounded-lg border flex items-center justify-between transition-colors bg-white dark:bg-zinc-800 ${
              selectedLandmark
                ? 'border-blue-500 text-blue-700 dark:text-blue-300 font-medium'
                : 'border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400'
            }`}
          >
            <span className="truncate flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              {selectedLandmark ? (
                <>
                  <span>{selectedLandmark.name}</span>
                  <span className="text-[10px] opacity-75 px-1 py-0.2 rounded bg-blue-100 dark:bg-blue-900/50">
                    {CATEGORY_LABELS[selectedLandmark.category]?.icon || '📍'}
                  </span>
                </>
              ) : (
                <span className="text-zinc-400">Choose landmark (e.g. airport, bus park, mall...)</span>
              )}
            </span>
            <span className="text-zinc-400 text-[10px] ml-1">▼</span>
          </button>

          {/* Landmark Dropdown modal */}
          {isOpen && (
            <div className="absolute left-0 top-full mt-1 w-full max-h-64 overflow-y-auto bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-50 p-2 flex flex-col gap-1">
              <input
                type="text"
                placeholder="Search landmarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-2.5 py-1 text-xs rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 mb-1 focus:outline-none focus:border-blue-500"
                autoFocus
              />

              <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
                {filteredLandmarks.length === 0 ? (
                  <div className="p-2 text-xs text-zinc-400 text-center">No matching landmarks</div>
                ) : (
                  filteredLandmarks.map((lm) => {
                    const isPicked = selectedLandmark?.uid === lm.uid;
                    const catMeta = CATEGORY_LABELS[lm.category] || CATEGORY_LABELS.landmark;
                    return (
                      <button
                        key={lm.uid}
                        type="button"
                        onClick={() => {
                          onSelectLandmark(lm);
                          setIsOpen(false);
                          setSearchQuery('');
                        }}
                        className={`text-left px-2 py-1.5 rounded text-xs flex items-center justify-between transition-colors ${
                          isPicked
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium'
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-700/60 text-zinc-700 dark:text-zinc-200'
                        }`}
                      >
                        <span className="truncate mr-2">{lm.name}</span>
                        <span className="text-[10px] text-zinc-400 shrink-0 flex items-center gap-1">
                          <span>{catMeta.icon}</span>
                          <span>{catMeta.label}</span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Radius selector */}
        {selectedLandmark && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-zinc-400">Within:</span>
            <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
              {LANDMARK_RADII.map((r) => {
                const isCurrent = selectedRadiusKm === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => onSelectRadiusKm(r.value)}
                    className={`text-xs px-2 py-0.5 rounded transition-colors ${
                      isCurrent
                        ? 'bg-blue-600 text-white font-medium shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {selectedLandmark && (
        <div className="text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/30 px-2.5 py-1 rounded-md border border-blue-200/50 dark:border-blue-900/40">
          📍 Showing places within {selectedRadiusKm < 1 ? `${Math.round(selectedRadiusKm * 1000)}m` : `${selectedRadiusKm} km`} of{' '}
          <strong>{selectedLandmark.name}</strong> ({CATEGORY_LABELS[selectedLandmark.category]?.label || 'Landmark'}), ordered by distance.
        </div>
      )}
    </div>
  );
}
