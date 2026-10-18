/**
 * src/views/ClaimView.tsx
 * =======================
 * Dedicated page for "/claim" and "/claim/:placeSlug".
 * Owners search for their eatery, or click "I'm not listed" to fill the claim form.
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Search,
  PlusCircle,
  ArrowLeft,
} from 'lucide-react';
import { useRestaurants } from '@/context/RestaurantContext';
import { useOwner } from '@/context/OwnerContext';
import ClaimRestaurantModal from '@/components/owner/ClaimRestaurantModal';
import OwnerToolkit from '@/components/owner/OwnerToolkit';
import { trackEvent } from '@/lib/analytics';
import type { RestaurantParsed } from '@/types/restaurant';

export default function ClaimView() {
  const { placeSlug } = useParams<{ placeSlug?: string }>();
  const navigate = useNavigate();
  const { data } = useRestaurants();
  const { getOwnerByUid } = useOwner();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<RestaurantParsed | null>(() => {
    if (!placeSlug || data.length === 0) return null;
    return (
      data.find((r) => {
        const slug = `${r.restaurant_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${r.uid.replace(/[^a-z0-9]+/g, '-')}`;
        return slug === placeSlug || r.uid === placeSlug;
      }) || null
    );
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Search filter for Nigeria restaurants
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return data
      .filter((r) => {
        return (
          r.country === 'Nigeria' &&
          (r.restaurant_name.toLowerCase().includes(q) ||
            r.city.toLowerCase().includes(q) ||
            (r.locality && r.locality.toLowerCase().includes(q)))
        );
      })
      .slice(0, 10);
  }, [searchQuery, data]);

  const ownerProfile = selectedPlace ? getOwnerByUid(selectedPlace.uid) : null;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg)',
        color: 'var(--text)',
        padding: '24px 16px 80px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 640 }}>
        {/* Back Link */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            color: 'var(--accent-deep)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            padding: '8px 0',
            marginBottom: 16,
          }}
        >
          <ArrowLeft size={16} /> Back to Discovery
        </button>

        {/* Hero Header */}
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'rgba(200, 240, 60, 0.15)',
              border: '1px solid var(--accent)',
              marginBottom: 12,
            }}
          >
            <ShieldCheck size={28} style={{ color: 'var(--accent-deep)' }} />
          </div>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 26,
              fontWeight: 700,
              margin: '0 0 8px',
            }}
          >
            Claim Your Restaurant on TasteMatch
          </h1>
          <p
            style={{
              fontSize: 14,
              color: 'var(--text-muted)',
              lineHeight: '21px',
              margin: 0,
            }}
          >
            Get a direct <strong>Order on WhatsApp</strong> button, free printable A4 QR poster, and verified hours. 100% free with zero commission.
          </p>
        </div>

        {/* Step 1: Find Restaurant or Start New */}
        {!selectedPlace && (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ position: 'relative' }}>
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your restaurant by name or city (e.g. Lagos, Ikeja)..."
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: 10,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Results list */}
            {searchResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Matching Listings:
                </span>
                {searchResults.map((r) => (
                  <button
                    key={r.uid}
                    onClick={() => {
                      setSelectedPlace(r);
                      trackEvent({ type: 'claim_form_started', placeUid: r.uid });
                      setIsModalOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 12,
                      borderRadius: 8,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{r.restaurant_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {r.locality ? `${r.locality}, ` : ''}{r.city}
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--accent-deep)', fontWeight: 600 }}>
                      Claim &rarr;
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Not listed button */}
            <div
              style={{
                borderTop: '1px solid var(--border)',
                paddingTop: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Don't see your restaurant in the list?
              </span>
              <button
                onClick={() => {
                  setSelectedPlace(null);
                  trackEvent({ type: 'claim_form_started' });
                  setIsModalOpen(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  background: 'rgba(200, 240, 60, 0.15)',
                  border: '1px solid var(--accent)',
                  color: 'var(--accent-deep)',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                <PlusCircle size={14} /> I'm not listed (Add new)
              </button>
            </div>
          </div>
        )}

        {/* Selected Place View & Owner Toolkit */}
        {selectedPlace && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Selected Restaurant
                </div>
                <h2 style={{ margin: '4px 0 2px', fontSize: 18, fontFamily: "'Space Grotesk', sans-serif" }}>
                  {selectedPlace.restaurant_name}
                </h2>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {selectedPlace.locality ? `${selectedPlace.locality}, ` : ''}{selectedPlace.city} · UID: {selectedPlace.uid}
                </div>
              </div>
              <button
                onClick={() => setSelectedPlace(null)}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '4px 10px',
                  color: 'var(--text-muted)',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                Change
              </button>
            </div>

            {/* Owner Toolkit (WhatsApp ordering, printable poster, status) */}
            <OwnerToolkit
              restaurant={selectedPlace}
              ownerProfile={ownerProfile}
              onOpenClaimModal={() => setIsModalOpen(true)}
            />
          </div>
        )}

        {/* Claim modal */}
        <ClaimRestaurantModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          restaurant={selectedPlace}
          onSuccess={() => setIsModalOpen(false)}
        />
      </div>
    </div>
  );
}
