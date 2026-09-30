import { useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw, Utensils, Bike } from 'lucide-react';
import { type PriorityWeights, DEFAULT_WEIGHTS } from '@/lib/recommendation';

interface Props {
  needsTableBooking: boolean;
  onTableBookingChange: (val: boolean) => void;
  needsOnlineDelivery: boolean;
  onOnlineDeliveryChange: (val: boolean) => void;
  weights: PriorityWeights;
  onWeightsChange: (weights: PriorityWeights) => void;
}

export default function MoreOptions({
  needsTableBooking,
  onTableBookingChange,
  needsOnlineDelivery,
  onOnlineDeliveryChange,
  weights,
  onWeightsChange,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSliderChange = (key: keyof PriorityWeights, value: number) => {
    onWeightsChange({
      ...weights,
      [key]: value,
    });
  };

  const handleReset = () => {
    onWeightsChange(DEFAULT_WEIGHTS);
  };

  const isCustomized =
    weights.rating !== DEFAULT_WEIGHTS.rating ||
    weights.cuisineMatch !== DEFAULT_WEIGHTS.cuisineMatch ||
    weights.popularity !== DEFAULT_WEIGHTS.popularity ||
    weights.cost !== DEFAULT_WEIGHTS.cost;

  return (
    <div style={{ marginTop: 12 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'none',
          border: 'none',
          padding: '6px 0',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          fontFamily: 'Inter, sans-serif',
          color: 'var(--text-muted)',
          cursor: 'pointer',
        }}
      >
        <span>More options</span>
        {isOpen ? <ChevronUp size={15} strokeWidth={1.5} /> : <ChevronDown size={15} strokeWidth={1.5} />}
      </button>

      {isOpen && (
        <div
          style={{
            marginTop: 8,
            padding: 16,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Service toggles */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                fontFamily: 'Inter, sans-serif',
                color: 'var(--text)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={needsTableBooking}
                onChange={e => onTableBookingChange(e.target.checked)}
                style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
              />
              <Utensils size={15} strokeWidth={1.5} color="var(--text-muted)" />
              <span>Needs table booking</span>
            </label>

            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                fontFamily: 'Inter, sans-serif',
                color: 'var(--text)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={needsOnlineDelivery}
                onChange={e => onOnlineDeliveryChange(e.target.checked)}
                style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
              />
              <Bike size={15} strokeWidth={1.5} color="var(--text-muted)" />
              <span>Needs online delivery</span>
            </label>
          </div>

          {/* Priority sliders heading & reset */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text)' }}>
                  Priority Sliders (Live Re-ranking)
                </span>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>
                  Adjust weights to instantly re-rank the qualifying restaurant pool
                </p>
              </div>
              {isCustomized && (
                <button
                  onClick={handleReset}
                  style={{
                    background: 'none',
                    border: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={13} strokeWidth={1.5} />
                  Reset
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { key: 'rating' as const, label: 'Rating' },
                { key: 'cuisineMatch' as const, label: 'Cuisine Match' },
                { key: 'popularity' as const, label: 'Popularity' },
                { key: 'cost' as const, label: 'Cost (Cheaper)' },
              ].map(s => (
                <div key={s.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>{s.label}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>
                      {weights[s.key]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={weights[s.key]}
                    onChange={e => handleSliderChange(s.key, Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent)', height: 4 }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
