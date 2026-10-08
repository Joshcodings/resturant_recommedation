interface PlaceTypeOption {
  id: string;
  label: string;
  icon?: string;
}

const DEFAULT_TYPES: PlaceTypeOption[] = [
  { id: 'restaurant', label: 'Restaurants', icon: '🍽️' },
  { id: 'fast_food', label: 'Fast Food', icon: '🍔' },
  { id: 'cafe', label: 'Cafes', icon: '☕' },
  { id: 'bar', label: 'Bars & Lounges', icon: '🍸' },
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
        All
      </button>

      {DEFAULT_TYPES.map(t => {
        const isSelected = selectedType === t.id;
        const count = counts?.[t.id];
        if (count !== undefined && count === 0) return null;

        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelectType(isSelected ? null : t.id)}
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
            {t.icon && <span style={{ fontSize: 13 }}>{t.icon}</span>}
            <span>{t.label}</span>
            {count !== undefined && (
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
