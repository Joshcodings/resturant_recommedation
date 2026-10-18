/**
 * src/context/OwnerContext.tsx
 * =============================
 * Context providing restaurant owner profiles from data/community/owners_ng.json.
 *
 * Guarantees:
 * - Owner data is kept in a distinct layer from OpenStreetMap data.
 * - OpenStreetMap data is NEVER overwritten.
 * - Conflicting fields (hours, phones, cuisines) are surfaced side-by-side with distinct source labels.
 */

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type { OwnerProfile, OwnerClaimInput } from '@/types/owner';
import initialOwners from '@/data/owners_ng.json';

interface OwnerContextValue {
  owners: OwnerProfile[];
  getOwnerByUid: (uid: string) => OwnerProfile | null;
  getOwnerByNameAndCity: (name: string, city: string) => OwnerProfile | null;
  addStagedOwner: (claim: OwnerClaimInput) => OwnerProfile;
  removeStagedOwner: (uid: string) => void;
}

const OwnerContext = createContext<OwnerContextValue | null>(null);

export function OwnerProvider({ children }: { children: React.ReactNode }) {
  const [owners, setOwners] = useState<OwnerProfile[]>(() => {
    return (initialOwners as OwnerProfile[]) || [];
  });

  const ownersByUid = useMemo(() => {
    const map = new Map<string, OwnerProfile>();
    for (const o of owners) {
      if (o.uid) map.set(o.uid, o);
    }
    return map;
  }, [owners]);

  const getOwnerByUid = useCallback(
    (uid: string): OwnerProfile | null => {
      return ownersByUid.get(uid) || null;
    },
    [ownersByUid],
  );

  const getOwnerByNameAndCity = useCallback(
    (name: string, _city: string): OwnerProfile | null => {
      const normName = name.toLowerCase().trim();
      for (const o of owners) {
        if (
          o.restaurant_name.toLowerCase().trim() === normName
        ) {
          return o;
        }
      }
      return null;
    },
    [owners],
  );

  const addStagedOwner = useCallback((claim: OwnerClaimInput): OwnerProfile => {
    const today = new Date().toISOString().split('T')[0];
    const newOwner: OwnerProfile = {
      uid: claim.placeUid,
      restaurant_name: claim.restaurantName,
      owner_name: claim.ownerName,
      whatsapp_phone: claim.whatsappPhone,
      opening_hours: claim.openingHours || null,
      menu_url: claim.menuUrl || null,
      address: claim.address || null,
      cuisines: claim.cuisines || [],
      payment_methods: claim.paymentMethods,
      delivery: claim.delivery ?? null,
      proof_url: claim.proofUrl,
      source: 'owner',
      verified_at: today,
      license_note: 'Supplied directly by restaurant owner under TasteMatch Community Contributor Terms. Kept distinct from OpenStreetMap data.',
      attribution: `Provided by owner, ${today}`,
    };

    setOwners((prev) => {
      const filtered = prev.filter((o) => o.uid !== claim.placeUid);
      return [...filtered, newOwner];
    });

    return newOwner;
  }, []);

  const removeStagedOwner = useCallback((uid: string) => {
    setOwners((prev) => prev.filter((o) => o.uid !== uid));
  }, []);

  return (
    <OwnerContext.Provider
      value={{
        owners,
        getOwnerByUid,
        getOwnerByNameAndCity,
        addStagedOwner,
        removeStagedOwner,
      }}
    >
      {children}
    </OwnerContext.Provider>
  );
}

export function useOwner(): OwnerContextValue {
  const ctx = useContext(OwnerContext);
  if (!ctx) {
    return {
      owners: [],
      getOwnerByUid: () => null,
      getOwnerByNameAndCity: () => null,
      addStagedOwner: () => ({} as OwnerProfile),
      removeStagedOwner: () => {},
    };
  }
  return ctx;
}
