import React from 'react';
import type { RestaurantParsed } from '@/types/restaurant';
import {
  Snowflake,
  Wind,
  Zap,
  Wifi,
  Accessibility,
  Package,
  Bike,
  Car,
  Salad,
  Moon,
} from 'lucide-react';

export interface AmenityDefinition {
  id: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  check: (r: RestaurantParsed) => boolean;
}

export const AMENITY_FILTERS: AmenityDefinition[] = [
  {
    id: 'air_conditioning',
    label: 'AC',
    Icon: Snowflake,
    check: r => Boolean(r.amenities?.air_conditioning),
  },
  {
    id: 'outdoor_seating',
    label: 'Outdoor Breeze',
    Icon: Wind,
    check: r => Boolean(r.amenities?.outdoor_seating),
  },
  {
    id: 'generator',
    label: 'Backup Generator',
    Icon: Zap,
    check: r => Boolean(
      r.amenities?.generator ||
      r.amenities?.backup_generator ||
      r.amenities?.['generator:source'] ||
      (r as any).generator
    ),
  },
  {
    id: 'internet_access',
    label: 'Wi-Fi',
    Icon: Wifi,
    check: r => Boolean(r.amenities?.internet_access),
  },
  {
    id: 'wheelchair',
    label: 'Wheelchair Accessible',
    Icon: Accessibility,
    check: r => Boolean(r.amenities?.wheelchair),
  },
  {
    id: 'takeaway',
    label: 'Takeaway',
    Icon: Package,
    check: r => Boolean(r.amenities?.takeaway),
  },
  {
    id: 'delivery',
    label: 'Delivery',
    Icon: Bike,
    check: r => Boolean(r.amenities?.delivery || r.has_online_delivery === 1),
  },
  {
    id: 'drive_through',
    label: 'Drive-through',
    Icon: Car,
    check: r => Boolean(r.amenities?.drive_through),
  },
  {
    id: 'vegetarian',
    label: 'Vegetarian Friendly',
    Icon: Salad,
    check: r => Boolean(r.diet?.vegetarian),
  },
  {
    id: 'halal',
    label: 'Halal',
    Icon: Moon,
    check: r => Boolean(r.diet?.halal),
  },
];

interface Props {
  cityRestaurants: RestaurantParsed[];
  selectedAmenities: string[];
  onToggleAmenity: (id: string) => void;
}

export default function AmenityChips({
  cityRestaurants,
  selectedAmenities,
  onToggleAmenity,
}: Props) {
  // Compute counts in current city
  const qualifying = AMENITY_FILTERS.map(def => {
    const count = cityRestaurants.filter(r => def.check(r)).length;
    return { ...def, count };
  }).filter(def => def.count >= 5); // Rule: each shown only if at least 5 places in the city state it

  if (qualifying.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        marginTop: 10,
      }}
      role="group"
      aria-label="Filter by amenities"
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-muted)',
          fontFamily: 'Inter, system-ui, sans-serif',
          marginRight: 4,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        Amenities:
      </span>

      {qualifying.map(item => {
        const isSelected = selectedAmenities.includes(item.id);
        const Icon = item.Icon;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggleAmenity(item.id)}
            style={{
              height: 30,
              padding: '0 10px',
              borderRadius: 999,
              border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: isSelected ? 'var(--accent)' : 'var(--surface-2)',
              color: isSelected ? 'var(--accent-ink)' : 'var(--text)',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 12,
              fontWeight: isSelected ? 600 : 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              transition: 'all 150ms ease',
            }}
          >
            <Icon size={13} strokeWidth={1.75} />
            <span>{item.label}</span>
            <span
              style={{
                fontSize: 11,
                opacity: isSelected ? 0.9 : 0.6,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              ({item.count})
            </span>
          </button>
        );
      })}
    </div>
  );
}
