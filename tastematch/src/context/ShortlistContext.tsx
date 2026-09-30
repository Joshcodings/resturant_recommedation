import React, { createContext, useContext, useState, useCallback } from 'react';
import type { RestaurantParsed } from '@/types/restaurant';

const MAX_COMPARE = 3;

interface ShortlistContextValue {
  shortlist: RestaurantParsed[];
  addToShortlist:     (r: RestaurantParsed) => void;
  removeFromShortlist:(id: number) => void;
  isInShortlist:      (id: number) => boolean;
  compareTray:        RestaurantParsed[];
  addToCompare:       (r: RestaurantParsed) => void;
  removeFromCompare:  (id: number) => void;
  isInCompare:        (id: number) => boolean;
  clearCompare:       () => void;
}

const Ctx = createContext<ShortlistContextValue | null>(null);

export function ShortlistProvider({ children }: { children: React.ReactNode }) {
  const [shortlist,   setShortlist]   = useState<RestaurantParsed[]>([]);
  const [compareTray, setCompareTray] = useState<RestaurantParsed[]>([]);

  const addToShortlist = useCallback((r: RestaurantParsed) => {
    setShortlist(s => s.some(x => x.restaurant_id === r.restaurant_id) ? s : [...s, r]);
  }, []);

  const removeFromShortlist = useCallback((id: number) => {
    setShortlist(s => s.filter(x => x.restaurant_id !== id));
  }, []);

  const isInShortlist = useCallback((id: number) =>
    shortlist.some(x => x.restaurant_id === id), [shortlist]);

  const addToCompare = useCallback((r: RestaurantParsed) => {
    setCompareTray(s => {
      if (s.length >= MAX_COMPARE || s.some(x => x.restaurant_id === r.restaurant_id)) return s;
      return [...s, r];
    });
  }, []);

  const removeFromCompare = useCallback((id: number) => {
    setCompareTray(s => s.filter(x => x.restaurant_id !== id));
  }, []);

  const isInCompare = useCallback((id: number) =>
    compareTray.some(x => x.restaurant_id === id), [compareTray]);

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
