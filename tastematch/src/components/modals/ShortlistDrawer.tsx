import { useEffect, useRef } from 'react';
import { X, Trash2, MapPin } from 'lucide-react';
import { useShortlist } from '@/context/ShortlistContext';
import { getCuisineEmoji } from '@/config/emojis';
import { formatCost } from '@/lib/formatters';
import type { RestaurantParsed } from '@/types/restaurant';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectRestaurant: (r: RestaurantParsed) => void;
}

export default function ShortlistDrawer({ open, onClose, onSelectRestaurant }: Props) {
  const { shortlist, removeFromShortlist } = useShortlist();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
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
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className="drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Your saved shortlist"
        tabIndex={-1}
        style={{ outline: 'none' }}
      >
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
            zIndex: 2,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                fontSize: 20,
                fontWeight: 600,
                color: 'var(--text)',
              }}
            >
              Shortlist ({shortlist.length})
            </h2>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: 12,
                color: 'var(--text-muted)',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              Saved in your browser session
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close shortlist"
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

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {shortlist.length === 0 ? (
            <div
              style={{
                padding: '48px 16px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontFamily: 'Inter, sans-serif',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 36 }}>🔖</span>
              <p style={{ margin: 0, fontSize: 14 }}>No saved restaurants yet.</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                Click the heart icon on any card to save it to your shortlist.
              </p>
            </div>
          ) : (
            shortlist.map(r => (
              <div
                key={r.restaurant_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  onSelectRestaurant(r);
                  onClose();
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    background: 'var(--surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  {getCuisineEmoji(r.cuisineList)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "'Space Grotesk', system-ui, sans-serif",
                      fontWeight: 600,
                      fontSize: 14,
                      color: 'var(--text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {r.restaurant_name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      fontFamily: 'Inter, sans-serif',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 2,
                    }}
                  >
                    <MapPin size={11} strokeWidth={1.5} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.locality}
                    </span>
                    <span>·</span>
                    <span>⭐ {r.aggregate_rating.toFixed(1)}</span>
                    <span>·</span>
                    <span>{formatCost(r.average_cost_for_two, r.currency)}</span>
                  </div>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    removeFromShortlist(r.restaurant_id);
                  }}
                  aria-label={`Remove ${r.restaurant_name} from shortlist`}
                  title="Remove from shortlist"
                  style={{
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    borderRadius: 6,
                    flexShrink: 0,
                  }}
                >
                  <Trash2 size={15} strokeWidth={1.5} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
