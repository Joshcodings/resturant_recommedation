import { X } from 'lucide-react';
import { useShortlist } from '@/context/ShortlistContext';
import { useCurrency } from '@/context/CurrencyContext';
import { PRICE_TIERS } from '@/lib/currency';

interface Props {
  onCompare: () => void;
}

export function CompareTray({ onCompare }: Props) {
  const { compareTray, removeFromCompare } = useShortlist();
  if (compareTray.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 35,
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text)',
          fontFamily: "'Space Grotesk', sans-serif",
          flexShrink: 0,
        }}
      >
        Compare ({compareTray.length}/3)
      </span>
      <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
        {compareTray.map(r => (
          <span
            key={r.restaurant_id}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 999,
              fontSize: 13,
              color: 'var(--text)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {r.restaurant_name}
            <button
              onClick={() => removeFromCompare(r.restaurant_id)}
              aria-label={`Remove ${r.restaurant_name} from compare`}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
              }}
            >
              <X size={12} strokeWidth={2} />
            </button>
          </span>
        ))}
      </div>
      <button
        onClick={onCompare}
        disabled={compareTray.length < 2}
        style={{
          height: 36,
          padding: '0 20px',
          background: 'var(--accent)',
          color: 'var(--accent-ink)',
          border: 'none',
          borderRadius: 8,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
          fontSize: 13,
          cursor: compareTray.length < 2 ? 'not-allowed' : 'pointer',
          opacity: compareTray.length < 2 ? 0.5 : 1,
          flexShrink: 0,
        }}
      >
        Compare
      </button>
    </div>
  );
}

// ─── Compare Modal ────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
}

export function CompareModal({ open, onClose }: ModalProps) {
  const { compareTray, clearCompare } = useShortlist();
  const { convert, formatDual } = useCurrency();

  if (!open || compareTray.length < 2) return null;

  // Compute best values
  // For cost: convert all amounts to selected currency, find the minimum (lowest cost)
  const convertedCosts = compareTray.map(r => {
    if (r.average_cost_for_two === null || r.average_cost_for_two === undefined) return Infinity;
    const c = convert(r.average_cost_for_two, r.currency);
    return c !== null ? c : Infinity;
  });
  const minCost = Math.min(...convertedCosts);
  const bestCostIdx = minCost < Infinity ? convertedCosts.indexOf(minCost) : -1;

  // Best rating
  const ratings = compareTray.map(r => r.aggregate_rating);
  const maxRating = Math.max(...ratings);
  const bestRatingIdx = ratings.indexOf(maxRating);

  // Best votes
  const votes = compareTray.map(r => r.votes);
  const maxVotes = Math.max(...votes);
  const bestVotesIdx = votes.indexOf(maxVotes);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Compare restaurants"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          width: '100%',
          maxWidth: 900,
          maxHeight: '85vh',
          overflow: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            position: 'sticky',
            top: 0,
            background: 'var(--surface)',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 20,
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            Compare
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => {
                clearCompare();
                onClose();
              }}
              style={{
                padding: '6px 12px',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text-muted)',
                fontSize: 13,
                fontFamily: 'Inter, sans-serif',
                cursor: 'pointer',
              }}
            >
              Clear all
            </button>
            <button
              onClick={onClose}
              aria-label="Close compare"
              style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ padding: 24, overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 14,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    color: 'var(--text-muted)',
                    fontWeight: 500,
                    width: 130,
                  }}
                >
                  Attribute
                </th>
                {compareTray.map(r => (
                  <th
                    key={r.restaurant_id}
                    style={{
                      padding: '8px 12px',
                      textAlign: 'left',
                      color: 'var(--text)',
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 600,
                    }}
                  >
                    {r.restaurant_name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* City */}
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
                  City
                </td>
                {compareTray.map(r => (
                  <td key={r.restaurant_id} style={{ padding: '10px 12px', color: 'var(--text)' }}>
                    {r.city}, {r.country}
                  </td>
                ))}
              </tr>

              {/* Cuisines */}
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
                  Cuisines
                </td>
                {compareTray.map(r => (
                  <td key={r.restaurant_id} style={{ padding: '10px 12px', color: 'var(--text)' }}>
                    {r.cuisines}
                  </td>
                ))}
              </tr>

              {/* Rating */}
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
                  Rating
                </td>
                {compareTray.map((r, idx) => {
                  const isBest = idx === bestRatingIdx;
                  return (
                    <td
                      key={r.restaurant_id}
                      style={{
                        padding: '10px 12px',
                        color: 'var(--text)',
                        borderBottom: isBest ? '2px solid var(--accent)' : 'none',
                        fontWeight: isBest ? 600 : 400,
                      }}
                    >
                      ⭐ {r.aggregate_rating.toFixed(1)}
                    </td>
                  );
                })}
              </tr>

              {/* Votes */}
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
                  Votes
                </td>
                {compareTray.map((r, idx) => {
                  const isBest = idx === bestVotesIdx;
                  return (
                    <td
                      key={r.restaurant_id}
                      style={{
                        padding: '10px 12px',
                        color: 'var(--text)',
                        borderBottom: isBest ? '2px solid var(--accent)' : 'none',
                        fontWeight: isBest ? 600 : 400,
                      }}
                    >
                      {r.votes.toLocaleString()}
                    </td>
                  );
                })}
              </tr>

              {/* Cost for two (Requirement 7: converted amounts, highlight lowest cost with label "≈") */}
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
                  Cost for two
                </td>
                {compareTray.map((r, idx) => {
                  const costInfo = formatDual(r.average_cost_for_two, r.currency);
                  const isBest = idx === bestCostIdx;
                  return (
                    <td
                      key={r.restaurant_id}
                      style={{
                        padding: '10px 12px',
                        color: 'var(--text)',
                        borderBottom: isBest ? '2px solid var(--accent)' : 'none',
                        fontWeight: isBest ? 600 : 400,
                      }}
                    >
                      <div>
                        {costInfo.display}
                        {isBest && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 11,
                              color: 'var(--accent-deep)',
                              fontWeight: 600,
                            }}
                          >
                            (Lowest)
                          </span>
                        )}
                      </div>
                      {costInfo.listed && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {costInfo.listed}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Price tier (Requirement 1: name + dots) */}
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
                  Price range
                </td>
                {compareTray.map(r => {
                  const tier = PRICE_TIERS[(r.price_range as 1 | 2 | 3 | 4) || 2];
                  return (
                    <td key={r.restaurant_id} style={{ padding: '10px 12px', color: 'var(--text)' }}>
                      {tier.name} {tier.dots}
                    </td>
                  );
                })}
              </tr>

              {/* Table booking */}
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
                  Table booking
                </td>
                {compareTray.map(r => (
                  <td key={r.restaurant_id} style={{ padding: '10px 12px', color: 'var(--text)' }}>
                    {r.has_table_booking === 1 ? '✓ Yes' : '– No'}
                  </td>
                ))}
              </tr>

              {/* Delivery */}
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
                  Delivery
                </td>
                {compareTray.map(r => (
                  <td key={r.restaurant_id} style={{ padding: '10px 12px', color: 'var(--text)' }}>
                    {r.has_online_delivery === 1 ? '✓ Yes' : '– No'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
