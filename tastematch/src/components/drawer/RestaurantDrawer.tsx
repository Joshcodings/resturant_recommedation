import { useEffect, useRef, useMemo } from 'react';
import { X, Utensils, Bike, MapPin } from 'lucide-react';
import { formatVotes, isFewVotes } from '@/lib/formatters';
import { getCuisineEmoji } from '@/config/emojis';
import { morelikeThis } from '@/lib/similarity';
import { useRestaurants } from '@/context/RestaurantContext';
import { useCurrency } from '@/context/CurrencyContext';
import { PRICE_TIERS } from '@/lib/currency';
import type { ScoredRestaurant } from '@/types/recommendation';
import type { RestaurantParsed } from '@/types/restaurant';

function CompactCard({ r, onOpen }: { r: RestaurantParsed & { similarity?: number }; onOpen: () => void }) {
  const matchPct = r.similarity !== undefined ? Math.round(r.similarity * 100) : null;
  return (
    <button
      onClick={onOpen}
      style={{
        minWidth: 170,
        padding: 12,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        textAlign: 'left',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 20 }}>{getCuisineEmoji(r.cuisineList)}</span>
        {matchPct !== null && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 4,
              background: 'var(--surface)',
              color: 'var(--accent-deep)',
              border: '1px solid var(--border)',
            }}
          >
            {matchPct}% match
          </span>
        )}
      </div>
      <div
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text)',
          lineHeight: '18px',
          marginBottom: 2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 144,
        }}
      >
        {r.restaurant_name}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>
        ⭐ {r.aggregate_rating.toFixed(1)} · {r.locality}
      </div>
    </button>
  );
}

interface Props {
  restaurant: ScoredRestaurant | null;
  onClose: () => void;
  onOpenSimilar: (r: RestaurantParsed) => void;
}

export default function RestaurantDrawer({ restaurant, onClose, onOpenSimilar }: Props) {
  const { data, vocabulary } = useRestaurants();
  const { formatDual } = useCurrency();
  const panelRef = useRef<HTMLDivElement>(null);

  const similar = useMemo(() => {
    if (!restaurant || data.length === 0) return [];
    return morelikeThis(restaurant, data, vocabulary, 5);
  }, [restaurant, data, vocabulary]);

  // Focus trap & Esc close
  useEffect(() => {
    if (!restaurant) return;
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [restaurant, onClose]);

  if (!restaurant) return null;

  const r = restaurant;
  const chips = r.cuisineList;

  return (
    <>
      {/* Overlay */}
      <div
        className="drawer-overlay"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${r.restaurant_name}`}
        tabIndex={-1}
        style={{ outline: 'none' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 20px 0',
          position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1,
          borderBottom: '1px solid var(--border)', paddingBottom: 16,
        }}>
          <div style={{
            width: 48, height: 48, background: 'var(--surface-2)', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0,
          }}>{getCuisineEmoji(r.cuisineList)}</div>
          <div style={{ flex: 1 }}>
            <h2 style={{
              margin: 0, fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 20, fontWeight: 600, color: 'var(--text)',
            }}>{r.restaurant_name}</h2>
            <p style={{ margin: '2px 0 0', fontSize: 14, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>
              <MapPin size={12} strokeWidth={1.5} style={{ display: 'inline', marginRight: 3 }} />
              {r.locality} · {r.city}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            style={{
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: '1px solid var(--border)', borderRadius: 8,
              color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0,
            }}
          ><X size={18} strokeWidth={1.5} /></button>
        </div>

        {/* Content */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                {r.aggregate_rating.toFixed(1)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>Rating</div>
            </div>

            <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                {formatVotes(r.votes)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>Votes</div>
              {isFewVotes(r.votes) && (
                <span style={{ display: 'inline-block', marginTop: 4, padding: '0 6px', height: 18, lineHeight: '18px', border: '1px solid var(--border)', borderRadius: 999, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>
                  few votes
                </span>
              )}
            </div>

            {(() => {
              const costInfo = formatDual(r.average_cost_for_two, r.currency);
              return (
                <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12, border: '1px solid var(--border)' }}>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                    {costInfo.display}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>
                    {costInfo.listed ? costInfo.listed : 'Cost for two'}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Cuisine chips */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>Cuisines</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {chips.map(c => (
                <span key={c} style={{
                  height: 24, padding: '0 8px', display: 'inline-flex', alignItems: 'center',
                  border: '1px solid var(--border)', borderRadius: 999,
                  fontSize: 12, color: 'var(--text)', fontFamily: 'Inter, sans-serif',
                }}>{c}</span>
              ))}
            </div>
          </div>

          {/* Price & services */}
          {(() => {
            const tier = PRICE_TIERS[(r.price_range as 1 | 2 | 3 | 4) || 2];
            const costInfo = formatDual(r.average_cost_for_two, r.currency);
            const tierTooltip = `${tier.name}: ${costInfo.display} for two in ${r.country}${costInfo.listed ? ` (${costInfo.listed})` : ''}`;
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>Price tier</span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '3px 9px',
                      borderRadius: 999,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      fontSize: 12,
                      fontFamily: 'Inter, sans-serif',
                      color: 'var(--text)',
                      fontWeight: 500,
                    }}
                    title={tierTooltip}
                    aria-label={tierTooltip}
                  >
                    {tier.name} {tier.dots}
                  </span>
                </div>
            {r.has_table_booking === 1 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>
                <Utensils size={14} strokeWidth={1.5} /> Table booking
              </span>
            )}
            {r.has_online_delivery === 1 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>
                <Bike size={14} strokeWidth={1.5} /> Online delivery
              </span>
            )}
          </div>
        );
      })()}

          {/* Explainable AI Attribution Section */}
          <div
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text)' }}>
                Recommendation Explanation
              </span>
              <span
                style={{
                  fontSize: 10,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: 'var(--surface)',
                  color: 'var(--accent-deep)',
                  border: '1px solid var(--border)',
                  fontWeight: 600,
                }}
              >
                Explainable AI
              </span>
            </div>

            {r.whyThisPick && (
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  lineHeight: '19px',
                  color: 'var(--text)',
                  fontFamily: 'Inter, sans-serif',
                  borderLeft: '2px solid var(--accent)',
                  paddingLeft: 10,
                }}
              >
                {r.whyThisPick}
              </p>
            )}

            {r.explanation && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span>🍴</span>
                  <span>{r.explanation.cuisineSummary}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span>⭐</span>
                  <span>{r.explanation.qualitySummary}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span>💵</span>
                  <span>{r.explanation.priceSummary}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span>👥</span>
                  <span>{r.explanation.popularitySummary}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span>📍</span>
                  <span>{r.explanation.locationSummary}</span>
                </div>

                {r.explanation.relaxedItems && r.explanation.relaxedItems.length > 0 && (
                  <div style={{ marginTop: 4, padding: 8, borderRadius: 6, background: 'rgba(255, 184, 77, 0.1)', border: '1px solid rgba(255, 184, 77, 0.25)', color: 'var(--warn)', fontSize: 11 }}>
                    <strong>Progressive Relaxation Applied:</strong>
                    <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                      {r.explanation.relaxedItems.map(item => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* More like this */}
          {similar.length > 0 && (
            <div>
              <div style={{
                fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600,
                color: 'var(--text)', marginBottom: 10,
              }}>More like this</div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {similar.map(s => (
                  <CompactCard key={s.restaurant_id} r={s} onOpen={() => onOpenSimilar(s)} />
                ))}
              </div>
            </div>
          )}

          {/* Honesty note */}
          <p style={{
            margin: 0, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif',
            borderTop: '1px solid var(--border)', paddingTop: 16,
          }}>
            Data from the Zomato dataset snapshot. Opening hours, phone numbers, and current availability are not shown. Restaurant may have closed.
          </p>
        </div>
      </div>
    </>
  );
}
