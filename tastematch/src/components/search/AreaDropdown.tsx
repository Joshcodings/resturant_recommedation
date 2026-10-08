import { MapPin } from 'lucide-react';

interface LocalityItem {
  name: string;
  count: number;
}

interface Props {
  localities: LocalityItem[];
  selectedArea: string | null;
  onSelectArea: (area: string | null) => void;
}

export default function AreaDropdown({ localities, selectedArea, onSelectArea }: Props) {
  // Only show if city has >= 3 localities with >= 5 places each
  const qualifying = localities.filter(l => l.count >= 5);
  if (qualifying.length < 3) {
    return null;
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
      }}
    >
      <label
        htmlFor="area-filter-select"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-muted)',
          fontFamily: 'Inter, system-ui, sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        <MapPin size={13} />
        <span>Area:</span>
      </label>

      <div style={{ position: 'relative', display: 'inline-block' }}>
        <select
          id="area-filter-select"
          value={selectedArea || ''}
          onChange={e => onSelectArea(e.target.value || null)}
          style={{
            height: 32,
            padding: '0 28px 0 12px',
            borderRadius: 8,
            border: selectedArea ? '1px solid var(--accent)' : '1px solid var(--border)',
            background: 'var(--surface-2)',
            color: selectedArea ? 'var(--text)' : 'var(--text-muted)',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 13,
            fontWeight: selectedArea ? 600 : 500,
            cursor: 'pointer',
            appearance: 'none',
            outline: 'none',
          }}
        >
          <option value="">All areas in city</option>
          {qualifying.map(l => (
            <option key={l.name} value={l.name}>
              {l.name} ({l.count} places)
            </option>
          ))}
        </select>
        <div
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            fontSize: 10,
            color: 'var(--text-muted)',
          }}
          aria-hidden="true"
        >
          ▼
        </div>
      </div>
    </div>
  );
}
