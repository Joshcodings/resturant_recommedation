/**
 * src/components/search/AreaFoodFingerprint.tsx
 * ============================================
 * Feature 11: Area Food Fingerprint.
 * For each locality with >=15 places, a small chart/breakdown of its cuisine
 * and place-type mix computed from the data, plus "what this area is known for"
 * ONLY as "most listed cuisine: X (n places)".
 * 
 * Strict compliance (Hard Rule 8):
 * Zero claims about quality, ranking, or popularity. Strictly factual distribution.
 */

import React, { useMemo } from 'react';
import type { RestaurantParsed } from '@/types/restaurant';
import { MapPin } from 'lucide-react';

interface Props {
  areaName: string;
  restaurants: RestaurantParsed[];
}

export const AreaFoodFingerprint: React.FC<Props> = ({ areaName, restaurants }) => {
  const areaPlaces = useMemo(() => {
    return restaurants.filter(
      (r) => r.locality && r.locality.trim().toLowerCase() === areaName.trim().toLowerCase()
    );
  }, [restaurants, areaName]);

  // Only display if locality has >= 15 places
  if (areaPlaces.length < 15) {
    return null;
  }

  // Compute cuisine mix
  const cuisineCounts: Record<string, number> = {};
  for (const r of areaPlaces) {
    for (const c of r.cuisineList) {
      if (c && c.toLowerCase() !== 'other') {
        cuisineCounts[c] = (cuisineCounts[c] || 0) + 1;
      }
    }
  }

  const sortedCuisines = Object.entries(cuisineCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topCuisine = sortedCuisines[0] || ['Various', 0];

  // Compute place-type mix
  const typeCounts: Record<string, number> = {};
  for (const r of areaPlaces) {
    const pt = r.place_type || 'restaurant';
    const label = pt.replace('_', ' ');
    typeCounts[label] = (typeCounts[label] || 0) + 1;
  }

  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div
      data-testid="area-food-fingerprint"
      style={{
        marginTop: 12,
        padding: 14,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <MapPin size={15} color="var(--accent-deep)" />
          <span>Area Food Fingerprint — {areaName}</span>
        </span>
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            background: 'var(--surface)',
            padding: '2px 8px',
            borderRadius: 999,
            border: '1px solid var(--border)',
          }}
        >
          {areaPlaces.length} places mapped
        </span>
      </div>

      {/* Strictly worded factual attribution per F11 */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--accent-deep)',
          marginBottom: 10,
        }}
      >
        What this area is known for: Most listed cuisine: {topCuisine[0]} ({topCuisine[1]} places)
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {/* Top Cuisines */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
            Cuisine Mix:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {sortedCuisines.map(([c, count]) => {
              const pct = Math.round((count / areaPlaces.length) * 100);
              return (
                <div key={c} style={{ fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text)' }}>{c}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                    {count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Place Types */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
            Venue Type Mix:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {sortedTypes.map(([t, count]) => {
              const pct = Math.round((count / areaPlaces.length) * 100);
              return (
                <div key={t} style={{ fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', textTransform: 'capitalize' }}>
                  <span style={{ color: 'var(--text)' }}>{t}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                    {count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AreaFoodFingerprint;
