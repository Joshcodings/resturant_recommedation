import { Heart, Utensils, Bike, Sparkles, GitCompare } from 'lucide-react';
import { getCuisineEmoji } from '@/config/emojis';
import { formatVotes, isFewVotes } from '@/lib/formatters';
import { useShortlist } from '@/context/ShortlistContext';
import { useCurrency } from '@/context/CurrencyContext';
import { PRICE_TIERS } from '@/lib/currency';
import type { ScoredRestaurant } from '@/types/recommendation';

function RatingBar({ value }: { value: number }) {
  return (
    <div className="rating-bar-track" style={{ width: '100%', marginTop: 4 }}>
      <div className="rating-bar-fill" style={{ width: `${(value / 5) * 100}%` }} />
    </div>
  );
}

// ─── Restaurant Card ──────────────────────────────────────────────────────────

interface Props {
  r: ScoredRestaurant;
  isHovered: boolean;
  isActive: boolean;  // drawer open
  onHover: () => void;
  onHoverEnd: () => void;
  onOpen: () => void;
  onSimilar: () => void;
  delay?: number;     // stagger delay in ms
}

export default function RestaurantCard({
  r,
  isHovered,
  isActive,
  onHover,
  onHoverEnd,
  onOpen,
  onSimilar,
  delay = 0,
}: Props) {
  const {
    addToShortlist,
    removeFromShortlist,
    isInShortlist,
    addToCompare,
    removeFromCompare,
    isInCompare,
  } = useShortlist();
  const { formatDual } = useCurrency();

  const saved = isInShortlist(r.restaurant_id);
  const compared = isInCompare(r.restaurant_id);

  const emoji = getCuisineEmoji(r.cuisineList);
  const chips = r.cuisineList.slice(0, 3);
  const extra = r.cuisineList.length - 3;
  const rankStr = String(r.rank).padStart(2, '0');

  const borderColor = isHovered || isActive ? 'var(--text-muted)' : 'var(--border)';

  const tier = PRICE_TIERS[(r.price_range as 1 | 2 | 3 | 4) || 2];
  const costInfo = formatDual(r.average_cost_for_two, r.currency);

  const tierTooltip = `${tier.name}: ${costInfo.display} for two in ${r.country}${
    costInfo.listed ? ` (${costInfo.listed})` : ''
  }`;

  return (
    <article
      className="card-enter"
      style={{
        background: 'var(--surface)',
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        cursor: 'pointer',
        transform: isHovered ? 'translateY(-2px)' : 'none',
        transition: 'transform 150ms cubic-bezier(0.2,0.8,0.2,1), border-color 150ms',
        animationDelay: `${delay}ms`,
        outline: isActive ? '2px solid var(--accent)' : 'none',
        outlineOffset: 2,
      }}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={`${r.restaurant_name} — press Enter to view details`}
    >
      {/* Row 1: emoji tile + rank + heart */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            background: 'var(--surface-2)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          {emoji}
        </div>
        <div style={{ flex: 1 }} />
        <span
          style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text-muted)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {rankStr}
        </span>
        <button
          aria-label={saved ? 'Remove from shortlist' : 'Save to shortlist'}
          title={saved ? 'Remove from shortlist' : 'Save to shortlist'}
          onClick={e => {
            e.stopPropagation();
            saved ? removeFromShortlist(r.restaurant_id) : addToShortlist(r);
          }}
          style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: saved ? 'var(--accent-deep)' : 'var(--text-muted)',
            cursor: 'pointer',
            borderRadius: 6,
            flexShrink: 0,
          }}
        >
          <Heart size={16} strokeWidth={1.5} fill={saved ? 'var(--accent)' : 'none'} />
        </button>
      </div>

      {/* Name + locality */}
      <div>
        <h3
          style={{
            margin: 0,
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontSize: 20,
            fontWeight: 600,
            lineHeight: '28px',
            color: 'var(--text)',
          }}
        >
          {r.restaurant_name}
        </h3>
        <p
          style={{
            margin: '2px 0 0',
            fontSize: 14,
            color: 'var(--text-muted)',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {r.locality} · {r.city}
        </p>
      </div>

      {/* Cuisine chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {chips.map(c => (
          <span
            key={c}
            style={{
              height: 24,
              padding: '0 8px',
              display: 'inline-flex',
              alignItems: 'center',
              border: '1px solid var(--border)',
              borderRadius: 999,
              fontSize: 12,
              color: 'var(--text-muted)',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {c}
          </span>
        ))}
        {extra > 0 && (
          <span
            style={{
              height: 24,
              padding: '0 8px',
              display: 'inline-flex',
              alignItems: 'center',
              border: '1px solid var(--border)',
              borderRadius: 999,
              fontSize: 12,
              color: 'var(--text-muted)',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            +{extra}
          </span>
        )}
      </div>

      {/* Stat row: Rating, Votes, Cost for two */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {/* Rating */}
        <div>
          <div
            className="count-up"
            style={{
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              fontSize: 28,
              fontWeight: 600,
              lineHeight: '34px',
              color: 'var(--text)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {r.aggregate_rating.toFixed(1)}
          </div>
          <RatingBar value={r.aggregate_rating} />
        </div>

        {/* Votes */}
        <div style={{ paddingTop: 6 }}>
          <div
            style={{
              fontSize: 14,
              color: 'var(--text-muted)',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatVotes(r.votes)} votes
          </div>
          {isFewVotes(r.votes) && (
            <span
              style={{
                display: 'inline-block',
                marginTop: 2,
                padding: '0 6px',
                height: 18,
                lineHeight: '18px',
                border: '1px solid var(--border)',
                borderRadius: 999,
                fontSize: 10,
                color: 'var(--text-muted)',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              few votes
            </span>
          )}
        </div>

        {/* Cost cell (Requirement 7) */}
        <div style={{ paddingTop: 4 }}>
          <div
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--text)',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: '20px',
            }}
            title={costInfo.isConverted ? `Converted at live indicative exchange rate` : undefined}
          >
            {costInfo.display} for two
          </div>
          {costInfo.listed ? (
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                fontFamily: 'Inter, system-ui, sans-serif',
                marginTop: 2,
              }}
            >
              {costInfo.listed}
            </div>
          ) : (
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                fontFamily: 'Inter, system-ui, sans-serif',
                marginTop: 2,
              }}
            >
              listed cost
            </div>
          )}
        </div>
      </div>

      {/* Price Tier Chip (Requirement 1 & 7) + Service badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 9px',
            borderRadius: 999,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            fontSize: 12,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: 'var(--text)',
            fontWeight: 500,
          }}
          title={tierTooltip}
          aria-label={tierTooltip}
        >
          {tier.name} {tier.dots}
        </span>

        {r.has_table_booking === 1 && (
          <span
            aria-label="Table booking available"
            title="Table booking"
            style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
          >
            <Utensils size={14} strokeWidth={1.5} />
          </span>
        )}
        {r.has_online_delivery === 1 && (
          <span
            aria-label="Online delivery available"
            title="Online delivery"
            style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
          >
            <Bike size={14} strokeWidth={1.5} />
          </span>
        )}
      </div>

      {/* Why this pick */}
      {r.whyThisPick && (
        <div
          style={{
            fontSize: 14,
            color: 'var(--text-muted)',
            fontFamily: 'Inter, system-ui, sans-serif',
            lineHeight: '20px',
            borderLeft: '2px solid var(--accent)',
            paddingLeft: 12,
          }}
        >
          {r.whyThisPick}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
        <button
          onClick={onSimilar}
          style={{
            padding: '6px 12px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 13,
            fontFamily: 'Inter, sans-serif',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            borderRadius: 6,
          }}
        >
          <Sparkles size={14} strokeWidth={1.5} />
          Similar
        </button>
        <button
          onClick={() => (compared ? removeFromCompare(r.restaurant_id) : addToCompare(r))}
          aria-pressed={compared}
          style={{
            padding: '6px 12px',
            background: compared ? 'var(--surface-2)' : 'transparent',
            border: compared ? '1px solid var(--accent)' : 'none',
            color: compared ? 'var(--accent-deep)' : 'var(--text-muted)',
            fontSize: 13,
            fontFamily: 'Inter, sans-serif',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            borderRadius: 6,
          }}
        >
          <GitCompare size={14} strokeWidth={1.5} />
          {compared ? 'Remove' : 'Compare'}
        </button>
      </div>
    </article>
  );
}
