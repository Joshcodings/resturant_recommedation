import type { RestaurantParsed } from '@/types/restaurant';

export interface AmenityDefinition {
  id: string;
  label: string;
  icon: string;
  check: (r: RestaurantParsed) => boolean;
}

export const AMENITY_FILTERS: AmenityDefinition[] = [
  {
    id: 'air_conditioning',
    label: 'AC',
    icon: '❄️',
    check: r => Boolean(r.amenities?.air_conditioning),
  },
  {
    id: 'outdoor_seating',
    label: 'Outdoor Breeze',
    icon: '🌿',
    check: r => Boolean(r.amenities?.outdoor_seating),
  },
  {
    id: 'generator',
    label: 'Backup Generator',
    icon: '⚡',
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
    icon: '📶',
    check: r => Boolean(r.amenities?.internet_access),
  },
  {
    id: 'wheelchair',
    label: 'Wheelchair Accessible',
    icon: '♿',
    check: r => Boolean(r.amenities?.wheelchair),
  },
  {
    id: 'takeaway',
    label: 'Takeaway',
    icon: '🥡',
    check: r => Boolean(r.amenities?.takeaway),
  },
  {
    id: 'delivery',
    label: 'Delivery',
    icon: '🛵',
    check: r => Boolean(r.amenities?.delivery || r.has_online_delivery === 1),
  },
  {
    id: 'drive_through',
    label: 'Drive-through',
    icon: '🚗',
    check: r => Boolean(r.amenities?.drive_through),
  },
  {
    id: 'vegetarian',
    label: 'Vegetarian Friendly',
    icon: '🥗',
    check: r => Boolean(r.diet?.vegetarian),
  },
  {
    id: 'halal',
    label: 'Halal',
    icon: '☪️',
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
            <span>{item.icon}</span>
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
