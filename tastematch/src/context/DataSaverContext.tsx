/**
 * src/context/DataSaverContext.tsx
 * ================================
 * Context for Feature 7: Data-Saver Mode.
 * Mobile data in Nigeria is metered and precious (MTN/Airtel/Glo/9mobile bundles).
 * When enabled:
 * - Suppresses map tile download entirely.
 * - Shows an honest tally: "~N KB saved this session" based on real network requests avoided
 *   (count suppressed tiles * average tile size 25 KB).
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

const STORAGE_KEY = 'tm-data-saver';
const AVERAGE_TILE_SIZE_KB = 25; // 25 KB per raster map tile

interface DataSaverContextValue {
  isDataSaver: boolean;
  toggleDataSaver: () => void;
  setDataSaver: (value: boolean) => void;
  suppressedTileCount: number;
  dataSavedKB: number;
  recordSuppressedTiles: (count: number) => void;
  resetTally: () => void;
}

const DataSaverContext = createContext<DataSaverContextValue | null>(null);

export function DataSaverProvider({ children }: { children: React.ReactNode }) {
  const [isDataSaver, setIsDataSaverState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // Default to false or saved preference
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const [suppressedTileCount, setSuppressedTileCount] = useState<number>(0);

  const setDataSaver = useCallback((val: boolean) => {
    setIsDataSaverState(val);
    try {
      localStorage.setItem(STORAGE_KEY, String(val));
    } catch {
      // ignore
    }
  }, []);

  const toggleDataSaver = useCallback(() => {
    setDataSaver(!isDataSaver);
  }, [isDataSaver, setDataSaver]);

  const recordSuppressedTiles = useCallback((count: number) => {
    if (count > 0) {
      setSuppressedTileCount((prev) => prev + count);
    }
  }, []);

  const resetTally = useCallback(() => {
    setSuppressedTileCount(0);
  }, []);

  const dataSavedKB = suppressedTileCount * AVERAGE_TILE_SIZE_KB;

  return (
    <DataSaverContext.Provider
      value={{
        isDataSaver,
        toggleDataSaver,
        setDataSaver,
        suppressedTileCount,
        dataSavedKB,
        recordSuppressedTiles,
        resetTally,
      }}
    >
      {children}
    </DataSaverContext.Provider>
  );
}

export function useDataSaver(): DataSaverContextValue {
  const ctx = useContext(DataSaverContext);
  if (!ctx) {
    return {
      isDataSaver: false,
      toggleDataSaver: () => {},
      setDataSaver: () => {},
      suppressedTileCount: 0,
      dataSavedKB: 0,
      recordSuppressedTiles: () => {},
      resetTally: () => {},
    };
  }
  return ctx;
}
