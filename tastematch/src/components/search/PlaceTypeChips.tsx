import React from 'react';
import { Utensils, Sandwich, Coffee, Wine } from 'lucide-react';

interface PlaceTypeOption {
  id: string;
  label: string;
  Icon?: React.ComponentType<{ size?: number; className?: string }>;
}

const DEFAULT_TYPES: PlaceTypeOption[] = [
  { id: 'restaurant', label: 'Restaurants', Icon: Utensils },
  { id: 'fast_food', label: 'Fast Food', Icon: Sandwich },
  { id: 'cafe', label: 'Cafes', Icon: Coffee },
  { id: 'bar', label: 'Bars & Lounges', Icon: Wine },
];

interface Props {
  selectedType: string | null;
  onSelectType: (type: string | null) => void;
  counts?: Record<string, number>;
}

export default function PlaceTypeChips({ selectedType, onSelectType, counts }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        marginTop: 12,
      }}
      role="group"
      aria-label="Filter by place type"
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
        Place Type:
      </span>

      <button
        type="button"
        onClick={() => onSelectType(null)}
        style={{
          height: 32,
          padding: '0 12px',
          borderRadius: 999,
          border: selectedType === null ? '1px solid var(--accent)' : '1px solid var(--border)',
          background: selectedType === null ? 'var(--accent)' : 'transparent',
          color: selectedType === null ? 'var(--accent-ink)' : 'var(--text)',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 12,
          fontWeight: selectedType === null ? 600 : 500,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          transition: 'all 150ms ease',
        }}
      >
        <span>All</span>
      </button>

      {DEFAULT_TYPES.map(item => {
        const count = counts?.[item.id] || 0;
        const isSelected = selectedType === item.id;
        const Icon = item.Icon;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectType(isSelected ? null : item.id)}
            style={{
              height: 32,
              padding: '0 12px',
              borderRadius: 999,
              border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: isSelected ? 'var(--accent)' : 'transparent',
              color: isSelected ? 'var(--accent-ink)' : 'var(--text)',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 12,
              fontWeight: isSelected ? 600 : 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 150ms ease',
            }}
          >
            {Icon && <Icon size={13} />}
            <span>{item.label}</span>
            {count > 0 && (
              <span
                style={{
                  fontSize: 11,
                  opacity: isSelected ? 0.9 : 0.6,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                ({count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
