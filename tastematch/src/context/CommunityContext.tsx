/**
 * src/context/CommunityContext.tsx
 * =================================
 * Context for Feature 9: Community "Add a place" layer.
 *
 * Provides:
 * - Local-storage backed persistence for user-submitted food places
 * - Immediate insertion into active restaurant data with "Added by you (local)" badge
 * - Export utilities: GeoJSON FeatureCollection and OSM tags JSON snippet
 * - Transparent honesty: strictly declares data is local to browser, not on server
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { RestaurantParsed } from '@/types/restaurant';

export const COMMUNITY_STORAGE_KEY = 'tm-community-places';

export interface NewCommunityPlaceInput {
  name: string;
  city: string;
  state?: string;
  locality?: string;
  cuisine?: string;
  priceForTwoNaira?: number | null;
  paymentCash?: boolean;
  paymentCards?: boolean;
  paymentMobile?: boolean;
  backupGenerator?: boolean;
  airConditioning?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  openingHours?: string;
  phone?: string;
}

interface CommunityContextValue {
  communityPlaces: RestaurantParsed[];
  addCommunityPlace: (input: NewCommunityPlaceInput) => RestaurantParsed;
  removeCommunityPlace: (uid: string) => void;
  exportPlaceAsGeoJSON: (place?: RestaurantParsed) => string;
  exportPlaceAsOSMTags: (place?: RestaurantParsed) => string;
}

const CommunityContext = createContext<CommunityContextValue | null>(null);

function mapInputToRestaurant(input: NewCommunityPlaceInput): RestaurantParsed {
  const now = new Date().toISOString();
  const timestampId = Date.now();
  const uid = `local:community_${timestampId}`;

  const lat = typeof input.latitude === 'number' && !isNaN(input.latitude) ? input.latitude : 0;
  const lng = typeof input.longitude === 'number' && !isNaN(input.longitude) ? input.longitude : 0;
  const hasCoords = lat !== 0 && lng !== 0;

  const cost = input.priceForTwoNaira && input.priceForTwoNaira > 0 ? input.priceForTwoNaira : null;
  let priceRange: (1 | 2 | 3 | 4) | null = null;
  if (cost !== null) {
    if (cost <= 3000) priceRange = 1;
    else if (cost <= 8000) priceRange = 2;
    else if (cost <= 25000) priceRange = 3;
    else priceRange = 4;
  }

  const cuisinesClean = (input.cuisine || 'Nigerian').trim();
  const cuisineList = cuisinesClean.split(',').map((c) => c.trim()).filter(Boolean);

  const place: RestaurantParsed = {
    uid,
    restaurant_name: input.name.trim(),
    locality: input.locality?.trim() || null,
    city: input.city.trim(),
    country: 'Nigeria',
    state: input.state?.trim() || null,
    cuisines: cuisinesClean,
    cuisines_raw: cuisinesClean,
    cuisineList,
    price_range: priceRange,
    average_cost_for_two: cost,
    currency: 'NGN',
    aggregate_rating: null, // Hard Rule 1: Never invent ratings. Unknown = null
    votes: null,
    weighted_rating: null,
    has_table_booking: null,
    has_online_delivery: null,
    latitude: lat,
    longitude: lng,
    hasCoords,
    hasRating: false,
    hasPrice: cost !== null,
    isLocalCommunity: true,
    source: 'community',
    data_source: 'TasteMatch Community (Local)',
    licence: 'Public Domain / Contributor Submitted',
    added_at: now,
    opening_hours: input.openingHours?.trim() || null,
    phone: input.phone?.trim() || null,
    air_conditioning: input.airConditioning ?? null,
    payment_methods: {
      cash: input.paymentCash ?? undefined,
      cards: input.paymentCards ?? undefined,
      mobile_payment: input.paymentMobile ?? undefined,
    },
    power: {
      backup_generator: input.backupGenerator ? true : undefined,
    },
    amenities: {
      air_conditioning: input.airConditioning ? 'yes' : undefined,
    },
  };

  return place;
}

export function CommunityProvider({ children }: { children: React.ReactNode }) {
  const [communityPlaces, setCommunityPlaces] = useState<RestaurantParsed[]>(() => {
    try {
      const saved = localStorage.getItem(COMMUNITY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load community places from localStorage', e);
    }
    return [];
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(communityPlaces));
    } catch (e) {
      console.warn('Failed to save community places to localStorage', e);
    }
  }, [communityPlaces]);

  const addCommunityPlace = useCallback((input: NewCommunityPlaceInput) => {
    const newPlace = mapInputToRestaurant(input);
    setCommunityPlaces((prev) => [newPlace, ...prev]);
    return newPlace;
  }, []);

  const removeCommunityPlace = useCallback((uid: string) => {
    setCommunityPlaces((prev) => prev.filter((p) => p.uid !== uid));
  }, []);

  const exportPlaceAsGeoJSON = useCallback(
    (targetPlace?: RestaurantParsed): string => {
      const placesToExport = targetPlace ? [targetPlace] : communityPlaces;

      const features = placesToExport.map((p) => {
        const properties: Record<string, any> = {
          name: p.restaurant_name,
          amenity: 'restaurant',
          cuisine: (p.cuisines || '').toLowerCase(),
          'addr:city': p.city,
          'addr:country': 'NG',
        };

        if (p.locality) properties['addr:suburb'] = p.locality;
        if (p.opening_hours) properties['opening_hours'] = p.opening_hours;
        if (p.phone) properties['phone'] = p.phone;
        if (p.average_cost_for_two) properties['charge'] = `NGN ${p.average_cost_for_two}`;

        if (p.payment_methods?.cash) properties['payment:cash'] = 'yes';
        if (p.payment_methods?.cards) properties['payment:cards'] = 'yes';
        if (p.payment_methods?.mobile_payment) properties['payment:mobile_payment'] = 'yes';

        if (p.air_conditioning) properties['air_conditioning'] = 'yes';
        if (p.power?.backup_generator) properties['generator:source'] = 'diesel';

        properties['source'] = 'TasteMatch Community Layer';
        properties['note'] = 'Contributed via TasteMatch. Ready for OpenStreetMap verification.';

        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [p.longitude || 0, p.latitude || 0],
          },
          properties,
        };
      });

      return JSON.stringify(
        {
          type: 'FeatureCollection',
          generator: 'TasteMatch Community Layer (Feature 9)',
          features,
        },
        null,
        2,
      );
    },
    [communityPlaces],
  );

  const exportPlaceAsOSMTags = useCallback(
    (targetPlace?: RestaurantParsed): string => {
      const p = targetPlace || communityPlaces[0];
      if (!p) return '{}';

      const tags: Record<string, string> = {
        name: p.restaurant_name,
        amenity: 'restaurant',
        cuisine: (p.cuisines || '').toLowerCase(),
        'addr:city': p.city,
        'addr:country': 'NG',
      };

      if (p.locality) tags['addr:suburb'] = p.locality;
      if (p.opening_hours) tags['opening_hours'] = p.opening_hours;
      if (p.phone) tags['phone'] = p.phone;
      if (p.payment_methods?.cash) tags['payment:cash'] = 'yes';
      if (p.payment_methods?.cards) tags['payment:cards'] = 'yes';
      if (p.payment_methods?.mobile_payment) tags['payment:mobile_payment'] = 'yes';
      if (p.air_conditioning) tags['air_conditioning'] = 'yes';
      if (p.power?.backup_generator) tags['generator:source'] = 'diesel';

      return JSON.stringify(tags, null, 2);
    },
    [communityPlaces],
  );

  return (
    <CommunityContext.Provider
      value={{
        communityPlaces,
        addCommunityPlace,
        removeCommunityPlace,
        exportPlaceAsGeoJSON,
        exportPlaceAsOSMTags,
      }}
    >
      {children}
    </CommunityContext.Provider>
  );
}

export function useCommunity(): CommunityContextValue {
  const ctx = useContext(CommunityContext);
  if (!ctx) {
    return {
      communityPlaces: [],
      addCommunityPlace: () => ({} as RestaurantParsed),
      removeCommunityPlace: () => {},
      exportPlaceAsGeoJSON: () => '{}',
      exportPlaceAsOSMTags: () => '{}',
    };
  }
  return ctx;
}
