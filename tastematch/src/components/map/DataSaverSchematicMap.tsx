/**
 * src/components/map/DataSaverSchematicMap.tsx
 * ============================================
 * Lightweight SVG Schematic & Text-only Map alternative for Feature 7: Data-Saver Mode.
 *
 * Suppresses Leaflet map tile raster requests (saving ~400+ KB per session).
 * Renders an ultra-fast SVG coordinate radar grid and text-only proximity list.
 */

import { useEffect, useMemo } from 'react';
import { useDataSaver } from '@/context/DataSaverContext';
import { ShieldCheck, MapPin } from 'lucide-react';
import type { ScoredRestaurant } from '@/types/recommendation';

interface Props {
  restaurants: ScoredRestaurant[];
  hoveredId: string | number | null;
  onPinHover: (id: string) => void;
  onPinHoverEnd: () => void;
  onPinClick: (r: ScoredRestaurant) => void;
}

export default function DataSaverSchematicMap({
  restaurants,
  hoveredId,
  onPinHover,
  onPinHoverEnd,
  onPinClick,
}: Props) {
  const { dataSavedKB, recordSuppressedTiles, toggleDataSaver } = useDataSaver();

  // Tally suppressed raster tiles on mount (average 16 viewport tiles avoided = 400 KB)
  useEffect(() => {
    recordSuppressedTiles(16);
  }, [recordSuppressedTiles]);

  const mapped = useMemo(() => restaurants.filter((r) => r.hasCoords), [restaurants]);

  // Compute SVG projection bounds
  const bounds = useMemo(() => {
    if (mapped.length === 0) return null;
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    for (const r of mapped) {
      if (r.latitude < minLat) minLat = r.latitude;
      if (r.latitude > maxLat) maxLat = r.latitude;
      if (r.longitude < minLng) minLng = r.longitude;
      if (r.longitude > maxLng) maxLng = r.longitude;
    }

    const latSpan = Math.max(maxLat - minLat, 0.01);
    const lngSpan = Math.max(maxLng - minLng, 0.01);

    return { minLat, maxLat, minLng, maxLng, latSpan, lngSpan };
  }, [mapped]);

  const width = 360;
  const height = 300;
  const padding = 40;

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        borderRadius: 12,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Data-Saver Notice Header */}
      <div
        style={{
          padding: '10px 14px',
          background: 'rgba(16, 185, 129, 0.1)',
          borderBottom: '1px solid rgba(16, 185, 129, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={16} color="#10b981" />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#10b981' }}>
            Data Saver Active: Map tiles suppressed
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              background: '#10b981',
              color: '#064e3b',
              padding: '2px 8px',
              borderRadius: 999,
            }}
          >
            ~{dataSavedKB} KB saved
          </span>
          <button
            type="button"
            onClick={toggleDataSaver}
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Load tiles
          </button>
        </div>
      </div>

      {/* SVG Spatial Radar Schematic */}
      <div
        style={{
          position: 'relative',
          padding: '12px 16px 4px',
          background: 'var(--surface-2)',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', maxHeight: 240, overflow: 'visible' }}
          role="img"
          aria-label="SVG schematic radar map of restaurant locations"
        >
          {/* Compass indicators */}
          <text x={width / 2} y={16} fill="var(--text-muted)" fontSize={10} textAnchor="middle" fontWeight={600}>
            ▲ NORTH
          </text>

          {/* Radar background circles */}
          <circle cx={width / 2} cy={height / 2} r={110} fill="none" stroke="var(--border)" strokeDasharray="3 3" />
          <circle cx={width / 2} cy={height / 2} r={65} fill="none" stroke="var(--border)" strokeDasharray="2 2" />
          <line x1={width / 2} y1={25} x2={width / 2} y2={height - 25} stroke="var(--border)" strokeWidth={0.5} />
          <line x1={25} y1={height / 2} x2={width - 25} y2={height / 2} stroke="var(--border)" strokeWidth={0.5} />

          {/* Restaurant SVG Nodes */}
          {mapped.map((r, i) => {
            if (!bounds) return null;
            // Project lat/lng to x/y: lat is inverted (higher lat = higher up / smaller y)
            const normX = (r.longitude - bounds.minLng) / bounds.lngSpan;
            const normY = 1 - (r.latitude - bounds.minLat) / bounds.latSpan;

            const cx = padding + normX * (width - 2 * padding);
            const cy = padding + normY * (height - 2 * padding);

            const active =
              hoveredId === r.uid ||
              (r.restaurant_id !== undefined && hoveredId === r.restaurant_id);

            const rankNum = r.rank || i + 1;

            return (
              <g
                key={r.uid}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => onPinHover(r.uid)}
                onMouseLeave={onPinHoverEnd}
                onClick={() => onPinClick(r)}
              >
                {active && (
                  <circle cx={cx} cy={cy} r={18} fill="rgba(200, 240, 60, 0.3)" />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={active ? 13 : 10}
                  fill={active ? '#C8F03C' : 'var(--surface)'}
                  stroke={active ? '#0C0D10' : '#C8F03C'}
                  strokeWidth={2}
                />
                <text
                  x={cx}
                  y={cy + 3.5}
                  textAnchor="middle"
                  fontSize={active ? 10 : 9}
                  fontWeight={700}
                  fill={active ? '#0C0D10' : 'var(--text)'}
                  fontFamily="'Space Grotesk', sans-serif"
                >
                  {rankNum}
                </text>
                <text
                  x={cx}
                  y={cy - 12}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={500}
                  fill="var(--text-muted)"
                >
                  {r.restaurant_name.slice(0, 14)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Text-Only Proximity Station List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--text-muted)',
            marginBottom: 8,
          }}
        >
          Text-Only Spatial Directory ({mapped.length} places)
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {mapped.map((r, i) => {
            const active =
              hoveredId === r.uid ||
              (r.restaurant_id !== undefined && hoveredId === r.restaurant_id);

            return (
              <div
                key={r.uid}
                onClick={() => onPinClick(r)}
                onMouseEnter={() => onPinHover(r.uid)}
                onMouseLeave={onPinHoverEnd}
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: active ? 'var(--surface-2)' : 'transparent',
                  border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  transition: 'all 120ms ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      background: active ? '#C8F03C' : 'var(--surface-2)',
                      color: active ? '#0C0D10' : 'var(--text)',
                      fontWeight: 700,
                      fontSize: 11,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    {r.rank || i + 1}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {r.restaurant_name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {r.locality || r.city}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {r.distanceKm !== undefined && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <MapPin size={11} />
                      <span>{r.distanceKm < 1 ? `${Math.round(r.distanceKm * 1000)}m` : `${r.distanceKm.toFixed(1)}km`}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
