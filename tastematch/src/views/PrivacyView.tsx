/**
 * src/views/PrivacyView.tsx
 * =========================
 * Dedicated route for "/privacy":
 * Transparent declaration of what is published, what is stored, and NDPA 2023 compliance notes.
 */

import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowLeft,
  Lock,
  EyeOff,
  FileText,
  AlertTriangle,
} from 'lucide-react';

export default function PrivacyView() {
  const navigate = useNavigate();

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

        {/* Title */}
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
            Privacy, Data & Moderation
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
            TasteMatch is built with zero surveillance, zero diner tracking, and transparent business listings.
          </p>
        </div>

        {/* Content Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Section 1: What is published */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 18,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <FileText size={18} style={{ color: 'var(--accent-deep)' }} />
              <h2 style={{ margin: 0, fontSize: 16, fontFamily: "'Space Grotesk', sans-serif" }}>
                1. What We Publish
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: '20px', color: 'var(--text-muted)' }}>
              We publish <strong>public business information only</strong>: restaurant name, city/locality, geographic coordinates, verified opening hours, cuisine tags, and official WhatsApp ordering numbers. We <strong>never</strong> publish private diner messages or personal consumer contact details.
            </p>
          </div>

          {/* Section 2: What is stored */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 18,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <EyeOff size={18} style={{ color: '#10b981' }} />
              <h2 style={{ margin: 0, fontSize: 16, fontFamily: "'Space Grotesk', sans-serif" }}>
                2. What We Store About Visitors
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: '20px', color: 'var(--text-muted)' }}>
              <strong>Nothing.</strong> TasteMatch uses no tracking cookies, no cross-site fingerprinting, and stores zero personal visitor data. If you use "Near Me" GPS location search, coordinates are processed entirely inside your local device memory to calculate distance; they are never sent to or logged on any server.
            </p>
          </div>

          {/* Section 3: How to request removal */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 18,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Lock size={18} style={{ color: 'var(--accent-deep)' }} />
              <h2 style={{ margin: 0, fontSize: 16, fontFamily: "'Space Grotesk', sans-serif" }}>
                3. How to Request Removal or Correction
              </h2>
            </div>
            <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: '20px', color: 'var(--text-muted)' }}>
              Any restaurant owner or authorized representative can request complete removal, correction of inaccurate details, or closure marking. Requests are verified and completed within <strong>7 business days</strong>.
            </p>
            <button
              onClick={() => navigate('/takedown')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Open Takedown Form &rarr;
            </button>
          </div>

          {/* Section 4: Nigerian Data Protection Compliance Note */}
          <div
            style={{
              background: 'rgba(255, 184, 77, 0.1)',
              border: '1px solid rgba(255, 184, 77, 0.3)',
              borderRadius: 12,
              padding: 18,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <AlertTriangle size={18} style={{ color: 'var(--warn)' }} />
              <h2 style={{ margin: 0, fontSize: 15, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--warn)' }}>
                Nigerian Data Protection Act (NDPA 2023) Flag
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: 12, lineHeight: '19px', color: 'var(--text)' }}>
              <strong>Notice for Site Operator:</strong> Under Nigeria's <em>Nigeria Data Protection Act 2023 (NDPA)</em>, processing business contact data (such as sole proprietor WhatsApp numbers) requires a legal basis (such as owner consent or legitimate interest for public business directory services).
            </p>
            <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 12, color: 'var(--text-muted)', lineHeight: '18px' }}>
              <li>Owner claim submissions capture explicit consent for publishing business contact information.</li>
              <li>Owners retain an unqualified right to rectification and erasure under Section 34 of the NDPA.</li>
              <li>Please consult the Nigeria Data Protection Commission (NDPC) guidelines (<a href="https://ndpc.gov.ng" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-deep)' }}>ndpc.gov.ng</a>) when onboarding commercial vendors at scale.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
