/**
 * src/components/owner/OwnerToolkit.tsx
 * =====================================
 * Zero-server owner perks for TasteMatch restaurant owners:
 * 1. "Order on WhatsApp" direct action button (uses validated 234 number)
 * 2. "Print QR Poster (A4 PDF)" client-side generator (offline)
 * 3. Copy-paste "Find us on TasteMatch" WhatsApp status text
 */

import { useState } from 'react';
import {
  MessageSquare,
  Printer,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { generateWhatsAppOrderUrl, generateStatusShareText } from '@/lib/ownerValidation';
import { downloadQrPosterPdf } from '@/lib/pdfPoster';
import { trackEvent } from '@/lib/analytics';
import type { OwnerProfile } from '@/types/owner';
import type { RestaurantParsed } from '@/types/restaurant';

interface Props {
  restaurant: RestaurantParsed;
  ownerProfile: OwnerProfile | null;
  onOpenClaimModal?: () => void;
}

export default function OwnerToolkit({
  restaurant,
  ownerProfile,
  onOpenClaimModal,
}: Props) {
  const [copiedStatus, setCopiedStatus] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Derive phone for WhatsApp order: owner WhatsApp takes priority if verified, else valid OSM phone
  const orderPhone = ownerProfile?.whatsapp_phone || restaurant.phone;
  const whatsappOrderUrl = orderPhone
    ? generateWhatsAppOrderUrl(orderPhone, restaurant.restaurant_name)
    : null;

  const placeSlug = `${restaurant.restaurant_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${restaurant.uid.replace(/[^a-z0-9]+/g, '-')}`;
  const statusShareText = generateStatusShareText(restaurant.restaurant_name, placeSlug);

  const handleCopyStatus = async () => {
    try {
      await navigator.clipboard.writeText(statusShareText);
      setCopiedStatus(true);
      setTimeout(() => setCopiedStatus(false), 2500);
    } catch {
      // Fallback
      setCopiedStatus(true);
      setTimeout(() => setCopiedStatus(false), 2500);
    }
  };

  const handleDownloadPoster = () => {
    setIsGeneratingPdf(true);
    try {
      downloadQrPosterPdf({
        restaurantName: restaurant.restaurant_name,
        locality: restaurant.locality,
        city: restaurant.city,
        placeSlug,
        phone: orderPhone,
      });
    } catch (e) {
      console.error('Failed to generate poster PDF:', e);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 16,
      }}
    >
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={16} style={{ color: 'var(--accent-deep)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text)' }}>
            Owner Toolkit & Perks
          </span>
        </div>
        {ownerProfile ? (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 4,
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <ShieldCheck size={12} /> {ownerProfile.attribution}
          </span>
        ) : (
          <button
            onClick={() => {
              trackEvent({ type: 'claim_form_started', placeUid: restaurant.uid });
              onOpenClaimModal?.();
            }}
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 8px',
              borderRadius: 6,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--accent-deep)',
              cursor: 'pointer',
            }}
          >
            Claim your restaurant
          </button>
        )}
      </div>

      {/* Perk A: Order on WhatsApp Button */}
      {whatsappOrderUrl ? (
        <a
          href={whatsappOrderUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => {
            trackEvent({
              type: 'owner_whatsapp_order_clicked',
              placeUid: restaurant.uid,
            });
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 8,
            background: '#25D366',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: 13,
            textDecoration: 'none',
            fontFamily: "'Space Grotesk', sans-serif",
            boxShadow: '0 2px 6px rgba(37, 211, 102, 0.25)',
          }}
        >
          <MessageSquare size={16} fill="#ffffff" />
          <span>Order on WhatsApp</span>
        </a>
      ) : (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            fontSize: 11,
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>No WhatsApp order number on file.</span>
          <button
            onClick={() => {
              trackEvent({ type: 'claim_form_started', placeUid: restaurant.uid });
              onOpenClaimModal?.();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-deep)',
              fontWeight: 600,
              fontSize: 11,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            Add your number
          </button>
        </div>
      )}

      {/* Perk B & C: Action Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {/* Printable QR Poster (A4 PDF) */}
        <button
          onClick={handleDownloadPoster}
          disabled={isGeneratingPdf}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '12px 10px',
            borderRadius: 8,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          <Printer size={18} style={{ color: 'var(--accent-deep)' }} />
          <span style={{ fontSize: 11, fontWeight: 600 }}>Print QR Poster (A4)</span>
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Offline browser PDF</span>
        </button>

        {/* Copy-Paste WhatsApp Status */}
        <button
          onClick={handleCopyStatus}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '12px 10px',
            borderRadius: 8,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          {copiedStatus ? (
            <Check size={18} style={{ color: '#10b981' }} />
          ) : (
            <Copy size={18} style={{ color: 'var(--accent-deep)' }} />
          )}
          <span style={{ fontSize: 11, fontWeight: 600 }}>
            {copiedStatus ? 'Copied to Clipboard!' : 'Copy WhatsApp Status'}
          </span>
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Ready to paste & share</span>
        </button>
      </div>

      {/* Menu Link if provided by owner */}
      {ownerProfile?.menu_url && (
        <a
          href={ownerProfile.menu_url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--accent-deep)',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          <ExternalLink size={13} /> View Menu (Provided by Owner)
        </a>
      )}

      {/* Data Layer Conflict Warning / Coexistence Indicator */}
      {ownerProfile && (
        <div
          style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            lineHeight: '14px',
            borderTop: '1px solid var(--border)',
            paddingTop: 8,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 6,
          }}
        >
          <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            Verified owner details complement OpenStreetMap records. Open data is preserved and never overwritten.
          </span>
        </div>
      )}
    </div>
  );
}
