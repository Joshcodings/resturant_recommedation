import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { X, Star, CheckCircle2, XCircle, Zap, Snowflake, MapPin, Check, Minus } from 'lucide-react';
import { useShortlist } from '@/context/ShortlistContext';
import { useCurrency } from '@/context/CurrencyContext';
import { useLanguage } from '@/context/LanguageContext';
import { PRICE_TIERS } from '@/lib/currency';
import { isOpenNow } from '@/lib/openingHours';
import { fetchLandmarks, findNearestLandmark } from '@/lib/landmarks';
import type { Landmark } from '@/types/restaurant';

interface Props {
  onCompare: () => void;
}

export function CompareTray({ onCompare }: Props) {
  const { compareTray, removeFromCompare } = useShortlist();
  const { t } = useLanguage();
  if (compareTray.length === 0) return null;

  return (
    <div
      className="compare-tray-container"
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
        {t('btn_compare')} ({compareTray.length}/3)
      </span>

      <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
        {compareTray.map(r => (
          <span
            key={r.uid}
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
              onClick={() => removeFromCompare(r.uid)}
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
        data-compare-tray-open="true"
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
        {t('btn_compare')}
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
  const { t } = useLanguage();
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);

  useEffect(() => {
    fetchLandmarks().then(lms => setLandmarks(lms));
  }, []);

  // Nearest Landmark and distance (if landmark data exists)
  const nearestLandmarkMap = useMemo(() => {
    const map: Record<string, { landmarkName: string; distanceKm: number } | null> = {};
    for (const r of compareTray) {
      if ((r as any).distanceFromLandmark) {
        map[r.uid] = (r as any).distanceFromLandmark;
      } else if (landmarks.length > 0 && r.latitude && r.longitude) {
        const match = findNearestLandmark(r, landmarks, 35.0);
        if (match) {
          map[r.uid] = { landmarkName: match.landmark.name, distanceKm: match.distanceKm };
        } else {
          map[r.uid] = null;
        }
      } else {
        map[r.uid] = null;
      }
    }
    return map;
  }, [compareTray, landmarks]);

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
  const ratings = compareTray.map(r => r.hasRating ? r.aggregate_rating! : -1);
  const maxRating = Math.max(...ratings);
  const bestRatingIdx = maxRating > -1 ? ratings.indexOf(maxRating) : -1;

  // Best votes
  const votes = compareTray.map(r => r.hasRating ? r.votes! : -1);
  const maxVotes = Math.max(...votes);
  const bestVotesIdx = maxVotes > -1 ? votes.indexOf(maxVotes) : -1;

  // Feature 11: Nigerian-specific attribute checks
  // Open Now status
  const hasOpenHoursData = compareTray.some(r => !!r.opening_hours);

  // Payment methods accepted (Cash, Cards/POS, Mobile payment)
  const hasPaymentData = compareTray.some(
    r =>
      r.payment_methods &&
      (r.payment_methods.cash !== undefined ||
        r.payment_methods.cards !== undefined ||
        r.payment_methods.mobile_payment !== undefined)
  );

  // Backup power / Generator
  const hasPowerData = compareTray.some(
    r => r.power?.backup_generator !== undefined && r.power?.backup_generator !== null
  );

  // Air Conditioning (AC)
  const hasAcData = compareTray.some(
    r => r.air_conditioning !== undefined && r.air_conditioning !== null
  );

  const hasLandmarkData = compareTray.some(r => nearestLandmarkMap[r.uid] !== null);


  return (
    <div
      className="modal-overlay-responsive"
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
            {t('compare_title')}
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
                    key={r.uid}
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
                  <td key={r.uid} style={{ padding: '10px 12px', color: 'var(--text)' }}>
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
                  <td key={r.uid} style={{ padding: '10px 12px', color: 'var(--text)' }}>
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
                      key={r.uid}
                      style={{
                        padding: '10px 12px',
                        color: 'var(--text)',
                        borderBottom: isBest ? '2px solid var(--accent)' : 'none',
                        fontWeight: isBest ? 600 : 400,
                      }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Star size={12} fill="#eab308" stroke="#eab308" />
                        <span>{r.hasRating && r.aggregate_rating !== null ? r.aggregate_rating.toFixed(1) : 'Unrated'}</span>
                      </div>
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
                      key={r.uid}
                      style={{
                        padding: '10px 12px',
                        color: 'var(--text)',
                        borderBottom: isBest ? '2px solid var(--accent)' : 'none',
                        fontWeight: isBest ? 600 : 400,
                      }}
                    >
                      {r.hasRating && r.votes !== null ? r.votes.toLocaleString() : 'n/a'}
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
                      key={r.uid}
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
                  const tier = r.price_range ? PRICE_TIERS[r.price_range as 1 | 2 | 3 | 4] : null;
                  return (
                    <td key={r.uid} style={{ padding: '10px 12px', color: 'var(--text)' }}>
                      {tier ? `${tier.name} ${tier.dots}` : 'n/a'}
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
                  <td key={r.uid} style={{ padding: '10px 12px', color: 'var(--text)' }}>
                    {r.has_table_booking === 1 ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#10b981' }}>
                        <Check size={12} strokeWidth={2.5} /> Yes
                      </span>
                    ) : r.has_table_booking === 0 ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
                        <Minus size={12} strokeWidth={2} /> No
                      </span>
                    ) : (
                      'n/a'
                    )}
                  </td>
                ))}
              </tr>

              {/* Delivery */}
              <tr style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
                  Delivery
                </td>
                {compareTray.map(r => (
                  <td key={r.uid} style={{ padding: '10px 12px', color: 'var(--text)' }}>
                    {r.has_online_delivery === 1 ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#10b981' }}>
                        <Check size={12} strokeWidth={2.5} /> Yes
                      </span>
                    ) : r.has_online_delivery === 0 ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
                        <Minus size={12} strokeWidth={2} /> No
                      </span>
                    ) : (
                      'n/a'
                    )}
                  </td>
                ))}
              </tr>

              {/* Feature 11: Open now status */}
              {hasOpenHoursData && (
                <tr style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
                    {t('attr_open_now')}
                  </td>
                  {compareTray.map(r => {
                    const status = r.opening_hours ? isOpenNow(r.opening_hours) : null;
                    let display: ReactNode = '—';
                    if (status === true) display = <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#10b981' }}><CheckCircle2 size={13} /> Open Now</span>;
                    else if (status === false) display = <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#ef4444' }}><XCircle size={13} /> Closed</span>;
                    else if (r.opening_hours) display = 'Unlisted';
                    return (
                      <td key={r.uid} style={{ padding: '10px 12px', color: 'var(--text)' }}>
                        {display}
                      </td>
                    );
                  })}
                </tr>
              )}

              {/* Feature 11: Payment methods accepted */}
              {hasPaymentData && (
                <tr style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
                    {t('attr_payment_methods')}
                  </td>
                  {compareTray.map(r => {
                    let display = '—';
                    if (r.payment_methods) {
                      const p = r.payment_methods;
                      const methods: string[] = [];
                      if (p.cash) methods.push('Cash');
                      if (p.cards) methods.push('Cards / POS');
                      if (p.mobile_payment) methods.push('Transfer');
                      display = methods.length > 0 ? methods.join(', ') : 'None listed';
                    }
                    return (
                      <td key={r.uid} style={{ padding: '10px 12px', color: 'var(--text)' }}>
                        {display}
                      </td>
                    );
                  })}
                </tr>
              )}

              {/* Feature 11: Backup power / Generator */}
              {hasPowerData && (
                <tr style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
                    {t('attr_backup_power')}
                  </td>
                  {compareTray.map(r => {
                    const gen = r.power?.backup_generator;
                    let display: ReactNode = '—';
                    if (gen === true || gen === 'yes' || gen === 'generator') {
                      display = <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Zap size={13} strokeWidth={1.8} style={{ color: '#eab308' }} /> Yes (Generator)</span>;
                    } else if (gen === false || gen === 'no') {
                      display = '– No';
                    } else if (gen) {
                      display = String(gen);
                    }
                    return (
                      <td key={r.uid} style={{ padding: '10px 12px', color: 'var(--text)' }}>
                        {display}
                      </td>
                    );
                  })}
                </tr>
              )}

              {/* Feature 11: Air conditioning (AC) */}
              {hasAcData && (
                <tr style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
                    {t('attr_air_conditioning')}
                  </td>
                  {compareTray.map(r => {
                    let display: ReactNode = '—';
                    if (r.air_conditioning === true) display = <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Snowflake size={13} strokeWidth={1.8} style={{ color: '#06b6d4' }} /> Yes (AC)</span>;
                    else if (r.air_conditioning === false) display = '– No';
                    return (
                      <td key={r.uid} style={{ padding: '10px 12px', color: 'var(--text)' }}>
                        {display}
                      </td>
                    );
                  })}
                </tr>
              )}

              {/* Feature 11: Nearest landmark */}
              {hasLandmarkData && (
                <tr style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
                    {t('attr_nearest_landmark')}
                  </td>
                  {compareTray.map(r => {
                    const lm = nearestLandmarkMap[r.uid];
                    let display: ReactNode = '—';
                    if (lm) {
                      const dStr =
                        lm.distanceKm < 1
                          ? `${Math.round(lm.distanceKm * 1000)}m`
                          : `${lm.distanceKm.toFixed(1)} km`;
                      display = <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={13} style={{ flexShrink: 0 }} /> {dStr} from {lm.landmarkName}</span>;
                    }
                    return (
                      <td key={r.uid} style={{ padding: '10px 12px', color: 'var(--text)' }}>
                        {display}
                      </td>
                    );
                  })}
                </tr>
              )}

            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
