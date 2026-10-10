import React, { createContext, useContext, useState, useCallback } from 'react';
import type { RestaurantParsed } from '@/types/restaurant';

const MAX_COMPARE = 3;
const SHORTLIST_STORAGE_KEY = 'tm_shortlist';

export function migrateSavedItem(item: any): RestaurantParsed {
  if (!item.uid) {
    if (item.source_id) {
      const prefix = item.data_source === 'OpenStreetMap' || !item.data_source ? 'osm' : item.data_source.toLowerCase();
      item.uid = `${prefix}:${item.source_id}`;
    } else if (typeof item.restaurant_id === 'number') {
      if (item.restaurant_id >= 10_000_000_000_000) {
        const rem = item.restaurant_id - 10_000_000_000_000;
        const typeCode = rem % 10;
        const osmId = Math.floor(rem / 10);
        const typeStr = typeCode === 1 ? 'node' : typeCode === 2 ? 'way' : 'relation';
        item.uid = `osm:${typeStr}/${osmId}`;
      } else {
        item.uid = `zomato:${item.restaurant_id}`;
      }
    } else {
      item.uid = `unknown:${Math.random().toString(36).slice(2, 9)}`;
    }
  }
  return item as RestaurantParsed;
}

interface ShortlistContextValue {
  shortlist: RestaurantParsed[];
  addToShortlist:     (r: RestaurantParsed) => void;
  removeFromShortlist:(id: string | number) => void;
  isInShortlist:      (id: string | number) => boolean;
  compareTray:        RestaurantParsed[];
  addToCompare:       (r: RestaurantParsed) => void;
  removeFromCompare:  (id: string | number) => void;
  isInCompare:        (id: string | number) => boolean;
  clearCompare:       () => void;
}

const Ctx = createContext<ShortlistContextValue | null>(null);

export function ShortlistProvider({ children }: { children: React.ReactNode }) {
  const [shortlist, setShortlist] = useState<RestaurantParsed[]>(() => {
    try {
      const stored = localStorage.getItem(SHORTLIST_STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.map(migrateSavedItem);
      }
    } catch {
      // ignore localStorage read error
    }
    return [];
  });

  const [compareTray, setCompareTray] = useState<RestaurantParsed[]>([]);

  // Persist shortlist changes
  const updateShortlist = useCallback((updater: (prev: RestaurantParsed[]) => RestaurantParsed[]) => {
    setShortlist(prev => {
      const next = updater(prev);
      try {
        localStorage.setItem(SHORTLIST_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore localStorage write error
      }
      return next;
    });
  }, []);

  const addToShortlist = useCallback((r: RestaurantParsed) => {
    updateShortlist(s => s.some(x => x.uid === r.uid) ? s : [...s, r]);
  }, [updateShortlist]);

  const removeFromShortlist = useCallback((id: string | number) => {
    const strId = String(id);
    updateShortlist(s => s.filter(x => x.uid !== strId && String(x.restaurant_id) !== strId));
  }, [updateShortlist]);

  const isInShortlist = useCallback((id: string | number) => {
    const strId = String(id);
    return shortlist.some(x => x.uid === strId || (x.restaurant_id !== undefined && String(x.restaurant_id) === strId));
  }, [shortlist]);

  const addToCompare = useCallback((r: RestaurantParsed) => {
    setCompareTray(s => {
      if (s.length >= MAX_COMPARE || s.some(x => x.uid === r.uid)) return s;
      return [...s, r];
    });
  }, []);

  const removeFromCompare = useCallback((id: string | number) => {
    const strId = String(id);
    setCompareTray(s => s.filter(x => x.uid !== strId && String(x.restaurant_id) !== strId));
  }, []);

  const isInCompare = useCallback((id: string | number) => {
    const strId = String(id);
    return compareTray.some(x => x.uid === strId || (x.restaurant_id !== undefined && String(x.restaurant_id) === strId));
  }, [compareTray]);

  const clearCompare = useCallback(() => setCompareTray([]), []);

  return (
    <Ctx.Provider value={{
      shortlist, addToShortlist, removeFromShortlist, isInShortlist,
      compareTray, addToCompare, removeFromCompare, isInCompare, clearCompare,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useShortlist(): ShortlistContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useShortlist must be used inside <ShortlistProvider>');
  return ctx;
}
