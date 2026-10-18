/**
 * src/components/owner/ClaimRestaurantModal.tsx
 * =============================================
 * Owner Claim Form: finish in under 3 minutes on a mobile phone, $0 budget.
 *
 * Provides:
 * - Dual submission: GitHub Issue Form AND "Send via WhatsApp to TasteMatch Admin"
 * - Dynamic admin number input fallback if ADMIN_WHATSAPP_NUMBER is not set in config (never hard-coded)
 * - Strict 234 phone normalization
 * - Proof of ownership input (Instagram/Facebook/Google Maps/Shop sign)
 */

import { useState } from 'react';
import {
  X,
  ShieldCheck,
  Send,
  MessageSquare,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  validateNigerian234Phone,
  validateProofUrl,
  generateOwnerClaimGitHubIssueUrl,
  getAdminClaimWhatsAppUrl,
} from '@/lib/ownerValidation';
import { trackEvent } from '@/lib/analytics';
import { useOwner } from '@/context/OwnerContext';
import { ADMIN_WHATSAPP_NUMBER, hasAdminWhatsApp } from '@/config/site';
import type { RestaurantParsed } from '@/types/restaurant';
import type { OwnerClaimInput } from '@/types/owner';

interface Props {
  open: boolean;
  onClose: () => void;
  restaurant?: RestaurantParsed | null;
  onSuccess?: () => void;
}

export default function ClaimRestaurantModal({
  open,
  onClose,
  restaurant,
  onSuccess,
}: Props) {
  const { addStagedOwner } = useOwner();

  const [restaurantName, setRestaurantName] = useState(restaurant?.restaurant_name || '');
  const [city, setCity] = useState(restaurant?.city || 'Lagos');
  const [locality, setLocality] = useState(restaurant?.locality || '');
  const placeUid = restaurant?.uid || 'not_listed';
  const [ownerName, setOwnerName] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [openingHours, setOpeningHours] = useState(restaurant?.opening_hours || '');
  const [menuUrl, setMenuUrl] = useState('');
  const [cuisines, setCuisines] = useState(restaurant?.cuisines || '');
  const [delivery, setDelivery] = useState(true);
  const [proofUrl, setProofUrl] = useState('');

  // Fallback admin phone for WhatsApp submission if config is empty
  const [customAdminPhone, setCustomAdminPhone] = useState('');
  const [showAdminInput, setShowAdminInput] = useState(!hasAdminWhatsApp());

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successStaged, setSuccessStaged] = useState(false);

  if (!open) return null;

  const buildClaimObject = (): OwnerClaimInput | null => {
    setErrorMsg(null);

    if (!restaurantName.trim()) {
      setErrorMsg('Restaurant name is required.');
      return null;
    }
    if (!ownerName.trim()) {
      setErrorMsg('Owner or manager full name is required.');
      return null;
    }

    const phoneVal = validateNigerian234Phone(whatsappPhone);
    if (!phoneVal.isValid) {
      setErrorMsg(phoneVal.error || 'Please enter a valid Nigerian WhatsApp number in 234 format.');
      return null;
    }

    if (!proofUrl.trim() || !validateProofUrl(proofUrl)) {
      setErrorMsg('Please provide a valid http/https link as proof of ownership (e.g. your Instagram page or business link).');
      return null;
    }

    const cuisineList = cuisines
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    return {
      placeUid: placeUid.trim() || `community:claim_${Date.now()}`,
      restaurantName: restaurantName.trim(),
      city: city.trim(),
      locality: locality.trim() || undefined,
      ownerName: ownerName.trim(),
      whatsappPhone: phoneVal.normalized,
      openingHours: openingHours.trim() || undefined,
      menuUrl: menuUrl.trim() || undefined,
      cuisines: cuisineList,
      delivery,
      proofUrl: proofUrl.trim(),
    };
  };

  const handleSubmitGitHub = () => {
    const claim = buildClaimObject();
    if (!claim) return;

    // Stage locally for immediate feedback
    addStagedOwner(claim);
    setSuccessStaged(true);

    trackEvent({ type: 'claim_submitted', placeUid: claim.placeUid });

    const ghUrl = generateOwnerClaimGitHubIssueUrl(claim);
    window.open(ghUrl, '_blank', 'noreferrer');

    if (onSuccess) onSuccess();
  };

  const handleSubmitWhatsApp = () => {
    const claim = buildClaimObject();
    if (!claim) return;

    const targetAdmin = (hasAdminWhatsApp() ? ADMIN_WHATSAPP_NUMBER : customAdminPhone).trim();
    if (!targetAdmin) {
      setShowAdminInput(true);
      setErrorMsg('Admin WhatsApp number is not configured in site settings. Please enter the TasteMatch admin WhatsApp number below to send.');
      return;
    }

    const adminVal = validateNigerian234Phone(targetAdmin);
    if (!adminVal.isValid) {
      setErrorMsg('Admin WhatsApp number must be in valid 234 format.');
      return;
    }

    // Stage locally
    addStagedOwner(claim);
    setSuccessStaged(true);

    trackEvent({ type: 'claim_submitted', placeUid: claim.placeUid });

    const waUrl = getAdminClaimWhatsAppUrl(claim, adminVal.normalized);
    if (waUrl) {
      window.open(waUrl, '_blank', 'noreferrer');
    }

    if (onSuccess) onSuccess();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 540,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={22} style={{ color: 'var(--accent-deep)' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text)' }}>
                Claim Your Restaurant
              </h2>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                100% Free · WhatsApp Ordering · Printable A4 QR Poster
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successStaged && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10b981',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Check size={14} style={{ flexShrink: 0 }} />
            <span>Claim submitted and staged for preview! Verified badge is now active.</span>
          </div>
        )}

        {/* Form Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Restaurant Name */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
              Restaurant Name *
            </label>
            <input
              type="text"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="e.g. Taste & Joy Eatery"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* City & Locality */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                City *
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Lagos"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                Locality / Area
              </label>
              <input
                type="text"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="e.g. Ikeja"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Owner Full Name */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
              Owner or Manager Full Name *
            </label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="e.g. Funke Adeleke"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* WhatsApp Phone (234 Format) */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
              WhatsApp Phone for Orders (234 Format) *
            </label>
            <input
              type="text"
              value={whatsappPhone}
              onChange={(e) => setWhatsappPhone(e.target.value)}
              placeholder="e.g. 2348012345678 or 08012345678"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Diners will click your listing to order directly to this WhatsApp number.
            </span>
          </div>

          {/* Opening Hours & Menu Link */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                Opening Hours
              </label>
              <input
                type="text"
                value={openingHours}
                onChange={(e) => setOpeningHours(e.target.value)}
                placeholder="Mo-Sa 09:00-21:00"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                Menu Link or Photo URL
              </label>
              <input
                type="url"
                value={menuUrl}
                onChange={(e) => setMenuUrl(e.target.value)}
                placeholder="https://..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Cuisines */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
              Cuisines & Specialties
            </label>
            <input
              type="text"
              value={cuisines}
              onChange={(e) => setCuisines(e.target.value)}
              placeholder="e.g. Nigerian, Suya, Jollof Rice, Small Chops"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Delivery & Proof of Ownership */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <input
              type="checkbox"
              id="delivery_check"
              checked={delivery}
              onChange={(e) => setDelivery(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
            />
            <label htmlFor="delivery_check" style={{ fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}>
              We offer food delivery (in-house or dispatch rider)
            </label>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
              Proof of Ownership / Social Page *
            </label>
            <input
              type="url"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder="https://instagram.com/yourplace or storefront sign photo link"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Required to prevent impersonation. Can be an Instagram profile, Google Maps listing, or public photo.
            </span>
          </div>

          {/* Dynamic Admin WhatsApp input if config is empty */}
          {showAdminInput && (
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: 'var(--surface-2)',
                border: '1px dashed var(--border)',
              }}
            >
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                TasteMatch Admin WhatsApp Number (for WhatsApp submission)
              </label>
              <input
                type="text"
                value={customAdminPhone}
                onChange={(e) => setCustomAdminPhone(e.target.value)}
                placeholder="e.g. 2348000000000 (Set in config or enter here)"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: 12,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
          {/* Option 1: GitHub Issue Form */}
          <button
            onClick={handleSubmitGitHub}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 14px',
              borderRadius: 8,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            <Send size={15} style={{ color: 'var(--accent-deep)' }} />
            <span>Submit via GitHub Form</span>
          </button>

          {/* Option 2: WhatsApp to Admin */}
          <button
            onClick={handleSubmitWhatsApp}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 14px',
              borderRadius: 8,
              background: '#25D366',
              border: 'none',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            <MessageSquare size={15} fill="#ffffff" />
            <span>Send via WhatsApp to Admin</span>
          </button>
        </div>

        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
          Reviewed manually within 72 hours. OpenStreetMap data is never overwritten.
        </p>
      </div>
    </div>
  );
}
