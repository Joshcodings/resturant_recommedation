import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '@/context/ThemeContext';
import { useCurrency } from '@/context/CurrencyContext';
import { PRICE_TIERS } from '@/lib/currency';
import type { ScoredRestaurant } from '@/types/recommendation';

// ─── Custom pin factory ───────────────────────────────────────────────────────

function makePin(rank: number, active: boolean): L.DivIcon {
  const size = active ? 36 : 28;
  const ring = active ? `box-shadow:0 0 0 4px rgba(200,240,60,0.35);` : '';
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:#C8F03C;border:2px solid #0C0D10;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk',system-ui,sans-serif;font-weight:600;font-size:11px;color:#0C0D10;transition:all 150ms;${ring}">${rank}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
}

// ─── Map centering helper ─────────────────────────────────────────────────────

function MapCenter({ restaurants }: { restaurants: ScoredRestaurant[] }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => map.invalidateSize(), 150);
    const pts = restaurants.filter(r => r.hasCoords);
    if (pts.length === 0) return () => clearTimeout(timer);
    if (pts.length === 1) {
      map.setView([pts[0].latitude, pts[0].longitude], 14);
    } else {
      const bounds = L.latLngBounds(pts.map(r => [r.latitude, r.longitude]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
    return () => clearTimeout(timer);
  }, [map, restaurants]);
  return null;
}

// ─── Main Map Component ───────────────────────────────────────────────────────

interface Props {
  restaurants: ScoredRestaurant[];
  hoveredId: number | null;
  onPinHover: (id: number) => void;
  onPinHoverEnd: () => void;
  onPinClick: (r: ScoredRestaurant) => void;
}

export default function RestaurantMap({ restaurants, hoveredId, onPinHover, onPinHoverEnd, onPinClick }: Props) {
  const { theme } = useTheme();
  const { formatDual } = useCurrency();
  const markerRefs = useRef<Record<number, L.Marker>>({});

  const mapped = restaurants.filter(r => r.hasCoords);

  // Free high-performance basemap tiles without API keys or watermarks
  // Esri World Dark Gray & Light Gray Canvas basemaps
  const darkTile = 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
  const lightTile = 'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
  const tileUrl = theme === 'dark' ? darkTile : lightTile;
  const attr = '&copy; <a href="https://www.esri.com/">Esri</a>, OpenStreetMap contributors';

  const defaultCenter: [number, number] = mapped.length > 0
    ? [mapped[0].latitude, mapped[0].longitude]
    : [28.6, 77.2];

  // Open popup on hovered pin
  useEffect(() => {
    if (hoveredId === null) return;
    const marker = markerRefs.current[hoveredId];
    if (marker) marker.openPopup();
  }, [hoveredId]);

  return (
    <MapContainer
      center={defaultCenter}
      zoom={12}
      maxZoom={16}
      style={{ height: '100%', width: '100%', background: 'var(--surface)' }}
      zoomControl={true}
    >
      <TileLayer key={tileUrl} url={tileUrl} attribution={attr} maxZoom={16} />
      <MapCenter restaurants={mapped} />

      {mapped.map((r, i) => {
        const active = hoveredId === r.restaurant_id;
        return (
          <Marker
            key={r.restaurant_id}
            position={[r.latitude, r.longitude]}
            icon={makePin(r.rank || i + 1, active)}
            ref={m => { if (m) markerRefs.current[r.restaurant_id] = m; }}
            eventHandlers={{
              mouseover: () => onPinHover(r.restaurant_id),
              mouseout:  () => onPinHoverEnd(),
              click:     () => onPinClick(r),
            }}
          >
            <Popup>
              {(() => {
                const costInfo = formatDual(r.average_cost_for_two, r.currency);
                const tier = PRICE_TIERS[(r.price_range as 1 | 2 | 3 | 4) || 2];
                return (
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, minWidth: 160 }}>
                    <strong style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{r.restaurant_name}</strong>
                    <br />
                    <span style={{ color: '#666' }}>{r.locality || r.city}</span>
                    <br />
                    <span>⭐ {r.hasRating ? r.aggregate_rating!.toFixed(1) : 'Unrated'}</span>
                    <span style={{ margin: '0 6px', color: '#888' }}>·</span>
                    <span style={{ fontWeight: 600 }}>{r.hasPrice ? costInfo.display : 'n/a'}</span>
                    {r.hasPrice && (
                      <>
                        <br />
                        <span style={{ fontSize: 11, color: '#888' }}>{tier.name} {tier.dots}</span>
                      </>
                    )}
                  </div>
                );
              })()}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
