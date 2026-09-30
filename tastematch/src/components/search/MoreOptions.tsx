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
  mode?: 'strict' | 'flexible';
  onModeChange?: (mode: 'strict' | 'flexible') => void;
  radiusKm?: number | null;
  onRadiusChange?: (radius: number | null) => void;
  diversificationLambda?: number;
  onDiversificationChange?: (val: number) => void;
}

export default function MoreOptions({
  needsTableBooking,
  onTableBookingChange,
  needsOnlineDelivery,
  onOnlineDeliveryChange,
  weights,
  onWeightsChange,
  mode = 'flexible',
  onModeChange,
  radiusKm = null,
  onRadiusChange,
  diversificationLambda = 0.85,
  onDiversificationChange,
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

          {/* Engine Mode & Radius Controls */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text)' }}>
                  Recommendation Mode
                </span>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>
                  Choose strict matching or controlled progressive relaxation
                </p>
              </div>

              {onModeChange && (
                <div style={{ display: 'flex', background: 'var(--surface-2)', padding: 3, borderRadius: 8, border: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => onModeChange('flexible')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: mode === 'flexible' ? 600 : 400,
                      background: mode === 'flexible' ? 'var(--accent)' : 'transparent',
                      color: mode === 'flexible' ? 'var(--accent-ink)' : 'var(--text-muted)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Flexible (Auto-Relax)
                  </button>
                  <button
                    type="button"
                    onClick={() => onModeChange('strict')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: mode === 'strict' ? 600 : 400,
                      background: mode === 'strict' ? 'var(--accent)' : 'transparent',
                      color: mode === 'strict' ? 'var(--accent-ink)' : 'var(--text-muted)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Strict (Exact Only)
                  </button>
                </div>
              )}
            </div>

            {/* Proximity Radius */}
            {onRadiusChange && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>
                    Proximity Filter
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>
                    (from city center)
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[
                    { label: 'Any distance', val: null },
                    { label: 'Within 3 km', val: 3 },
                    { label: 'Within 5 km', val: 5 },
                    { label: 'Within 10 km', val: 10 },
                  ].map(opt => {
                    const active = radiusKm === opt.val;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => onRadiusChange(opt.val)}
                        style={{
                          height: 28,
                          padding: '0 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: active ? 600 : 400,
                          background: active ? 'var(--surface-2)' : 'transparent',
                          color: active ? 'var(--accent-deep)' : 'var(--text-muted)',
                          border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                          cursor: 'pointer',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Diversification MMR Control */}
            {onDiversificationChange && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                  <span>Maximal Marginal Relevance (MMR) Diversification</span>
                  <span style={{ color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                    {diversificationLambda < 0.7 ? 'High Diversity' : diversificationLambda > 0.85 ? 'Focus on Top Score' : 'Balanced'}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={1.0}
                  step={0.05}
                  value={diversificationLambda}
                  onChange={e => onDiversificationChange(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent)', height: 4 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                  <span>Explore Variety</span>
                  <span>Strict Relevance</span>
                </div>
              </div>
            )}
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
