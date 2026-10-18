/**
 * src/views/TakedownView.tsx
 * ==========================
 * Dedicated route for "/takedown":
 * Restaurant removal and correction requests with 7-day review SLA.
 * Provides transparent compliance with the Nigeria Data Protection Act (NDPA 2023).
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  ArrowLeft,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { generateTakedownGitHubIssueUrl } from '@/lib/ownerValidation';
import type { TakedownRequestInput } from '@/types/owner';

export default function TakedownView() {
  const navigate = useNavigate();

  const [restaurantName, setRestaurantName] = useState('');
  const [placeUid, setPlaceUid] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [requesterRole, setRequesterRole] = useState<'owner' | 'authorized_manager' | 'legal_rep'>('owner');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [reason, setReason] = useState<'permanently_closed' | 'duplicate' | 'incorrect_ownership' | 'privacy_request' | 'other'>('permanently_closed');
  const [details, setDetails] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!restaurantName.trim()) {
      setErrorMsg('Please specify the restaurant name.');
      return;
    }
    if (!requesterName.trim() || !contactEmail.trim()) {
      setErrorMsg('Requester name and contact email are required.');
      return;
    }
    if (!details.trim()) {
      setErrorMsg('Please provide context or details for this request.');
      return;
    }

    const payload: TakedownRequestInput = {
      placeUid: placeUid.trim() || 'unknown',
      restaurantName: restaurantName.trim(),
      requesterName: requesterName.trim(),
      requesterRole,
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      reason,
      details: details.trim(),
    };

    const ghUrl = generateTakedownGitHubIssueUrl(payload);
    window.open(ghUrl, '_blank', 'noreferrer');
    setSubmitted(true);
  };

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
          <ArrowLeft size={16} /> Back
        </button>

        {/* Hero */}
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              marginBottom: 12,
            }}
          >
            <ShieldAlert size={26} style={{ color: '#ef4444' }} />
          </div>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 24,
              fontWeight: 700,
              margin: '0 0 8px',
            }}
          >
            Listing Takedown & Correction Request
          </h1>
          <p
            style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              lineHeight: '20px',
              margin: 0,
            }}
          >
            TasteMatch processes business listing removals, corrections, and closures within <strong>7 business days</strong>.
          </p>
        </div>

        {/* SLA Notice */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            borderRadius: 10,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            marginBottom: 20,
            fontSize: 12,
            color: 'var(--text)',
          }}
        >
          <Clock size={16} style={{ color: 'var(--accent-deep)', flexShrink: 0 }} />
          <span>
            <strong>7-Day Service Level Agreement:</strong> Once submitted via GitHub Issue or admin email, our moderation team verifies authorization and applies removals or updates within 7 business days.
          </span>
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
              marginBottom: 16,
            }}
          >
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {submitted ? (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 24,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <CheckCircle size={36} style={{ color: '#10b981' }} />
            <h2 style={{ margin: 0, fontSize: 18, fontFamily: "'Space Grotesk', sans-serif" }}>
              Request Opened Successfully
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: '20px' }}>
              Your takedown ticket has been submitted to the moderation queue. We will review and action this request within 7 business days.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
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

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Place UID or URL (if known)
              </label>
              <input
                type="text"
                value={placeUid}
                onChange={(e) => setPlaceUid(e.target.value)}
                placeholder="e.g. osm:node/12345678 or https://tastematch.pages.dev/place/..."
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Your Name *
                </label>
                <input
                  type="text"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="Full name"
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
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Relationship to Business *
                </label>
                <select
                  value={requesterRole}
                  onChange={(e) => setRequesterRole(e.target.value as any)}
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
                >
                  <option value="owner">Restaurant Owner</option>
                  <option value="authorized_manager">Authorized Manager / Staff</option>
                  <option value="legal_rep">Legal Representative</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Contact Email *
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="name@restaurant.ng"
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
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Contact Phone (234 Format)
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="2348012345678"
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

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Reason for Request *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as any)}
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
              >
                <option value="permanently_closed">Business is permanently closed</option>
                <option value="incorrect_ownership">Incorrect ownership or unauthorized listing</option>
                <option value="privacy_request">Privacy / Right to Erasure request (NDPA 2023)</option>
                <option value="duplicate">Duplicate listing</option>
                <option value="other">Other correction</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Details & Authorization Notes *
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={4}
                placeholder="Explain what should be removed or changed, and provide any link or proof confirming your authorization..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: 13,
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 16px',
                borderRadius: 8,
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                marginTop: 6,
              }}
            >
              <Send size={15} />
              <span>Submit Takedown Request</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
