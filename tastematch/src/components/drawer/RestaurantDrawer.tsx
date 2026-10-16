import { useEffect, useRef, useMemo, useState } from 'react';
import WhatsAppShareModal from '@/components/common/WhatsAppShareModal';
import { generatePlanDeepLink, capMessageLength } from '@/lib/whatsappShare';
import {
  X,
  Utensils,
  Bike,
  MapPin,
  Share2,
  Star,
  Target,
  Search,
  Clock,
  Phone,
  Globe,
  Banknote,
  CreditCard,
  Smartphone,
  Snowflake,
  Wind,
  Zap,
  Users,
  ShieldCheck,
  Check,
  ExternalLink,
  Flag,
} from 'lucide-react';
import CuisineIcon from '@/components/common/CuisineIcon';
import { formatVotes, isFewVotes } from '@/lib/formatters';
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
        <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CuisineIcon cuisines={r.cuisineList} size={20} />
        </div>
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
      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 3 }}>
        <Star size={11} fill="#eab308" stroke="#eab308" />
        <span>{r.hasRating ? r.aggregate_rating!.toFixed(1) : 'Unrated'} · {r.locality || r.city}</span>
      </div>
    </button>
  );
}

interface Props {
  restaurant: ScoredRestaurant | null;
  onClose: () => void;
  onOpenSimilar: (r: RestaurantParsed) => void;
  onFoodRun?: (r: ScoredRestaurant) => void;
  distanceFromLandmark?: { landmarkName: string; distanceKm: number };
}

export default function RestaurantDrawer({ restaurant, onClose, onOpenSimilar, onFoodRun, distanceFromLandmark }: Props) {
  const { data, vocabulary } = useRestaurants();
  const { formatDual } = useCurrency();
  const panelRef = useRef<HTMLDivElement>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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

  const placeDeepLink = generatePlanDeepLink({
    type: 'restaurant',
    city: r.city,
    stops: [r.uid],
    restaurantUid: r.uid,
    restaurantName: r.restaurant_name,
  });

  const fullShareText = () =>
    [
      `🍽️ *${r.restaurant_name}*`,
      `📍 ${r.locality ? `${r.locality}, ` : ''}${r.city}`,
      r.cuisines ? `🍴 Cuisines: ${r.cuisines}` : '',
      r.hasRating ? `⭐ Rating: ${r.aggregate_rating?.toFixed(1)}` : '',
      r.opening_hours ? `🕒 Hours: ${r.opening_hours}` : '',
      r.phone ? `📞 Phone: ${r.phone}` : '',
      '',
      `Open on TasteMatch: ${placeDeepLink}`,
      '_Found on TasteMatch_',
    ]
      .filter(Boolean)
      .join('\n');

  const shortShareText = () =>
    [
      `🍽️ *${r.restaurant_name}* (${r.locality || r.city})`,
      r.cuisines ? `🍴 ${r.cuisines}` : '',
      `Open: ${placeDeepLink}`,
    ]
      .filter(Boolean)
      .join('\n');

  const minimalShareText = () =>
    `🍽️ Check out ${r.restaurant_name} in ${r.city}: ${placeDeepLink}`;

  const placeShareMessage = capMessageLength({
    full: fullShareText,
    short: shortShareText,
    minimal: minimalShareText,
  });

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
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}><CuisineIcon cuisines={r.cuisineList} size={24} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{
                margin: 0, fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 20, fontWeight: 600, color: 'var(--text)',
              }}>{r.restaurant_name}</h2>
              {r.matchReason && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'rgba(200, 240, 60, 0.15)',
                    color: 'var(--accent-deep)',
                    fontSize: 11,
                    fontWeight: 600,
                    border: '1px solid var(--accent)',
                  }}
                >
                  {r.matchReason.startsWith('cuisine tag') ? <Target size={12} /> : <Search size={12} />} {r.matchReason}
                </span>
              )}
              {(r.isLocalCommunity || r.uid?.startsWith('local:')) && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    fontSize: 11,
                    fontWeight: 600,
                    border: '1px solid #10b981',
                  }}
                >
                  Added by you (local)
                </span>
              )}
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 14, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>
              <MapPin size={12} strokeWidth={1.5} style={{ display: 'inline', marginRight: 3 }} />
              {r.locality} · {r.city}
            </p>
            {distanceFromLandmark && (
              <div style={{ marginTop: 4 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'rgba(59, 130, 246, 0.1)',
                    color: 'rgb(37, 99, 235)',
                    fontSize: 12,
                    fontWeight: 500,
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                  }}
                >
                  <MapPin size={12} /> {distanceFromLandmark.distanceKm < 1 ? `${Math.round(distanceFromLandmark.distanceKm * 1000)}m` : `${distanceFromLandmark.distanceKm.toFixed(1)} km`} from {distanceFromLandmark.landmarkName}
                </span>
              </div>
            )}
            {r.distanceKm !== undefined && (
              <div style={{ marginTop: 4 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'var(--surface-2)',
                    color: 'var(--text-muted)',
                    fontSize: 12,
                    fontWeight: 500,
                    border: '1px solid var(--border)',
                  }}
                  title={r.distanceSource === 'gps' || r.distanceSource === 'pin' ? `Approx. ${r.distanceKm.toFixed(1)} km from you` : `Approx. ${r.distanceKm.toFixed(1)} km from city center`}
                >
                  <MapPin size={12} /> {r.distanceKm < 1 ? `${Math.round(r.distanceKm * 1000)}m` : `${r.distanceKm.toFixed(1)} km`} from {r.distanceSource === 'gps' || r.distanceSource === 'pin' ? 'you' : 'city centre'}
                </span>
              </div>
            )}
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

        {/* OSM info bar if applicable */}
        {r.data_source === 'OpenStreetMap' && (
          <div style={{ padding: '12px 20px 0', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)' }}>
              OpenStreetMap Data
            </span>
            {r.place_type && <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><MapPin size={11} /> {r.place_type.replace('_', ' ')}</span>}
            {r.opening_hours && <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Clock size={11} /> {r.opening_hours}</span>}
            {r.phone && <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Phone size={11} /> {r.phone}</span>}
            {r.website && <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><a href={r.website} target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Globe size={11} /> Website</a></span>}
          </div>
        )}

        {/* Content */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: r.hasRating ? 20 : 14, fontWeight: 600, color: r.hasRating ? 'var(--text)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', lineHeight: '24px' }}>
                {r.hasRating ? r.aggregate_rating!.toFixed(1) : 'Unrated'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>Rating</div>
            </div>

            <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: r.hasRating ? 20 : 14, fontWeight: 600, color: r.hasRating ? 'var(--text)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', lineHeight: '24px' }}>
                {r.hasRating ? formatVotes(r.votes) : 'n/a'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>Votes</div>
              {r.hasRating && isFewVotes(r.votes) && (
                <span style={{ display: 'inline-block', marginTop: 4, padding: '0 6px', height: 18, lineHeight: '18px', border: '1px solid var(--border)', borderRadius: 999, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>
                  few votes
                </span>
              )}
            </div>

            {(() => {
              const costInfo = formatDual(r.average_cost_for_two, r.currency);
              return (
                <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12, border: '1px solid var(--border)' }}>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: r.hasPrice ? 20 : 14, fontWeight: 600, color: r.hasPrice ? 'var(--text)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', lineHeight: '24px' }}>
                    {r.hasPrice ? costInfo.display : 'n/a'}
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
            const tier = r.hasPrice && r.price_range ? PRICE_TIERS[r.price_range as 1 | 2 | 3 | 4] : null;
            const costInfo = formatDual(r.average_cost_for_two, r.currency);
            const tierTooltip = tier ? `${tier.name}: ${costInfo.display} for two in ${r.country}${costInfo.listed ? ` (${costInfo.listed})` : ''}` : 'Price unavailable';
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
                    {tier ? `${tier.name} ${tier.dots}` : 'n/a'}
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
            {/* Real payment method indicators */}
            {r.payment_methods?.cash && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>
                <Banknote size={13} strokeWidth={1.6} /> Cash
              </span>
            )}
            {(r.payment_methods?.cards || r.payment_methods?.debit_cards || r.payment_methods?.credit_cards) && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>
                <CreditCard size={13} strokeWidth={1.6} /> Cards
              </span>
            )}
            {(r.payment_methods?.mobile_payment || r.payment_methods?.bank_transfer || r.payment_methods?.pos) && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>
                <Smartphone size={13} strokeWidth={1.6} /> Mobile / Transfer
              </span>
            )}
            {/* Real Power & Breeze indicators (F5: Real tags only) */}
            {r.amenities?.air_conditioning && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }} title="Air conditioning">
                <Snowflake size={13} strokeWidth={1.6} /> AC
              </span>
            )}
            {r.amenities?.outdoor_seating && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }} title="Outdoor seating (breeze when hot/no power)">
                <Wind size={13} strokeWidth={1.6} /> Outdoor Breeze
              </span>
            )}
            {(r.amenities?.generator || r.amenities?.backup_generator || r.amenities?.['generator:source'] || (r as any).generator) && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }} title="Backup generator tagged">
                <Zap size={13} strokeWidth={1.6} /> Backup Generator
              </span>
            )}
          </div>
        );
      })()}

          {/* Action Buttons: Food Run & Share Place */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {onFoodRun && (
              <button
                type="button"
                onClick={() => onFoodRun(r)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'Inter, sans-serif',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                <Utensils size={16} strokeWidth={1.8} style={{ color: '#10b981' }} />
                Organise WhatsApp Food Run
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 16px',
                borderRadius: 10,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'Inter, sans-serif',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              <Share2 size={16} strokeWidth={1.8} style={{ color: '#10b981' }} />
              Share Place via WhatsApp
            </button>
          </div>

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
                  <Utensils size={13} style={{ flexShrink: 0, marginTop: 2, color: 'var(--text-muted)' }} />
                  <span>{r.explanation.cuisineSummary}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <Star size={13} fill="#eab308" stroke="#eab308" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{r.explanation.qualitySummary}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <Banknote size={13} style={{ flexShrink: 0, marginTop: 2, color: 'var(--text-muted)' }} />
                  <span>{r.explanation.priceSummary}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <Users size={13} style={{ flexShrink: 0, marginTop: 2, color: 'var(--text-muted)' }} />
                  <span>{r.explanation.popularitySummary}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <MapPin size={13} style={{ flexShrink: 0, marginTop: 2, color: 'var(--text-muted)' }} />
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
                  <CompactCard key={s.uid} r={s} onOpen={() => onOpenSimilar(s)} />
                ))}
              </div>
            </div>
          )}

          {/* Trust Panel & Verification (Feature 12 & Feature 8) */}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={16} strokeWidth={1.8} style={{ color: 'var(--accent-deep)' }} />
                Trust & Data Verification
              </span>
              <span
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: 'var(--surface)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                }}
              >
                {r.data_source || 'Zomato'}
              </span>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>
              <div><strong>Source:</strong> {r.data_source || 'Zomato Public Dataset (Kaggle)'}</div>
              <div><strong>UID:</strong> {r.uid}</div>
              {r.osm_timestamp && (
                <div><strong>Last Edited:</strong> {new Date(r.osm_timestamp).toLocaleDateString()} (v{r.osm_version || 1})</div>
              )}
            </div>

            {/* Field Completeness Tick-Grid */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                Field Completeness Grid:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11, fontFamily: 'Inter, sans-serif' }}>
                {[
                  { label: 'Name', present: !!r.restaurant_name },
                  { label: 'Coordinates', present: !!(r.hasCoords || (r.latitude && r.longitude)) },
                  { label: 'Cuisines', present: !!(r.cuisines && r.cuisines.trim()) },
                  { label: 'Opening Hours', present: !!r.opening_hours },
                  { label: 'Phone', present: !!r.phone },
                  { label: 'Website', present: !!r.website },
                  { label: 'Payment Options', present: !!r.payment_methods },
                  { label: 'Air Conditioning', present: r.air_conditioning !== null && r.air_conditioning !== undefined },
                  { label: 'Backup Power', present: !!(r.power?.backup_generator || r.amenities?.generator) },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      color: item.present ? 'var(--text)' : 'var(--text-muted)',
                    }}
                  >
                    <span>{item.present ? <Check size={13} strokeWidth={2.2} style={{ color: '#10b981' }} /> : <X size={13} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: '16px' }}>
              "Open data is incomplete and may include closed places."
            </p>

            {/* Actions: Add what you know on OSM & Report closed or wrong */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              {r.data_source === 'OpenStreetMap' && (
                <a
                  href={`https://www.openstreetmap.org/edit?${r.source_id ? r.source_id.replace('/', '=') : 'node'}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    background: 'rgba(200, 240, 60, 0.15)',
                    border: '1px solid var(--accent)',
                    color: 'var(--accent-deep)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <ExternalLink size={12} strokeWidth={1.6} /> Add what you know on OpenStreetMap
                </a>
              )}

              <a
                href={`https://github.com/Joshcodings/resturant_recommedation/issues/new?title=${encodeURIComponent(`[Data Issue] Report closed or wrong: ${r.restaurant_name} (${r.uid})`)}&body=${encodeURIComponent(`Place Name: ${r.restaurant_name}\nUID: ${r.uid}\nCity: ${r.city}\nSource: ${r.data_source || 'Zomato'}\n\nDescription of issue / Closure status:\n`)}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Flag size={12} strokeWidth={1.6} /> Report closed or wrong
              </a>
            </div>
          </div>

          {/* Honesty note */}

          <p style={{
            margin: 0, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif',
            borderTop: '1px solid var(--border)', paddingTop: 16,
          }}>
            Data from the Zomato dataset snapshot. Opening hours, phone numbers, and current availability are not shown. Restaurant may have closed.
          </p>
        </div>
      </div>

      {isShareModalOpen && (
        <WhatsAppShareModal
          open={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          title={r.restaurant_name}
          message={placeShareMessage}
          planDeepLink={placeDeepLink}
        />
      )}
    </>
  );
}
