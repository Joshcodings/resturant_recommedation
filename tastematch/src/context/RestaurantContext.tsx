import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { loadRestaurants, buildCountryCityIndex, getCityCuisines, getCityCount } from '@/lib/dataLoader';
import { buildVocabulary } from '@/lib/similarity';
import type { RestaurantParsed } from '@/types/restaurant';

interface RestaurantContextValue {
  data: RestaurantParsed[];
  loading: boolean;
  error: string | null;
  countryCityIndex: Record<string, string[]>;
  vocabulary: string[];
  getCuisines: (city: string) => string[];
  getCount: (city: string) => number;
}

const Ctx = createContext<RestaurantContextValue | null>(null);

export function RestaurantProvider({ children }: { children: React.ReactNode }) {
  const [data, setData]       = useState<RestaurantParsed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    loadRestaurants()
      .then(d => { setData(d); setLoading(false); })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load data');
        setLoading(false);
      });
  }, []);

  const countryCityIndex = useMemo(() => buildCountryCityIndex(data), [data]);
  const vocabulary       = useMemo(() => buildVocabulary(data), [data]);

  const getCuisines = (city: string) => getCityCuisines(data, city);
  const getCount    = (city: string) => getCityCount(data, city);

  return (
    <Ctx.Provider value={{ data, loading, error, countryCityIndex, vocabulary, getCuisines, getCount }}>
      {children}
    </Ctx.Provider>
  );
}

export function useRestaurants(): RestaurantContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useRestaurants must be used inside <RestaurantProvider>');
  return ctx;
}
