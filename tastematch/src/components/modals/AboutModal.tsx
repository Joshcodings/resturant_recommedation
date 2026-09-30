import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AboutModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="About TasteMatch"
        style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
          width: '100%', maxWidth: 560, maxHeight: '85vh', overflow: 'auto',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, background: 'var(--surface)',
        }}>
          <h2 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>
            About TasteMatch
          </h2>
          <button
            onClick={onClose}
            aria-label="Close about modal"
            style={{
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: '1px solid var(--border)', borderRadius: 8,
              color: 'var(--text-muted)', cursor: 'pointer',
            }}
          ><X size={18} strokeWidth={1.5} /></button>
        </div>

        {/* Content */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, fontFamily: 'Inter, sans-serif', fontSize: 14, lineHeight: '22px', color: 'var(--text)' }}>

          <section>
            <h3 style={{ margin: '0 0 8px', fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
              Data Source
            </h3>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              TasteMatch is powered by a public Zomato restaurant dataset sourced from Kaggle.
              This dataset has <strong style={{ color: 'var(--text)' }}>no explicit date</strong> and
              appears <strong style={{ color: 'var(--text)' }}>several years old</strong>.
              Restaurants may have closed, changed ownership, or altered their details since the snapshot was taken.
            </p>
          </section>

          <section>
            <h3 style={{ margin: '0 0 8px', fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
              Geographic Skew
            </h3>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              Approximately <strong style={{ color: 'var(--text)' }}>90% of the 7,403 rated restaurants</strong> are
              from the <strong style={{ color: 'var(--text)' }}>Delhi NCR region of India</strong>.
              Other cities and countries are represented in the data but with far fewer entries — recommendations
              in those areas may be limited.
            </p>
          </section>

          <section>
            <h3 style={{ margin: '0 0 8px', fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
              Coverage & Exclusions
            </h3>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              Only <strong style={{ color: 'var(--text)' }}>rated restaurants</strong> with at least one vote are included.
              Unrated or unreviewed restaurants are excluded from all recommendations.
            </p>
          </section>

          <section>
            <h3 style={{ margin: '0 0 8px', fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
              How Ratings Work
            </h3>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              We display both the raw Zomato aggregate rating and a <strong style={{ color: 'var(--text)' }}>weighted rating</strong> used for ranking.
              The weighted rating uses a Bayesian approach that pulls ratings with
              <strong style={{ color: 'var(--text)' }}> very few votes toward the city average</strong>
              — or the country average for cities with fewer than 30 rated restaurants.
              This prevents a restaurant with 2 five-star votes from outranking one with 500 honest reviews.
              Ratings with fewer than 20 votes are marked <em>"few votes"</em> throughout the app.
            </p>
          </section>

          <section>
            <h3 style={{ margin: '0 0 8px', fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
              What We Don't Show
            </h3>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              TasteMatch never invents or infers information not present in the dataset.
              We do <strong style={{ color: 'var(--text)' }}>not</strong> show:
              opening hours, phone numbers, menu items, photos, real-time availability, or reviews.
            </p>
          </section>

          <section>
            <h3 style={{ margin: '0 0 8px', fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
              Pricing & Live Currency Conversion
            </h3>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              Prices come from an older dataset snapshot and are converted at today's indicative exchange rates, so treat amounts as rough estimates. Current menu prices are likely higher. Rates are not for financial use.
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              Live exchange rates powered by open currency APIs.{' '}
              <a
                href="https://www.exchangerate-api.com"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--accent-deep)', textDecoration: 'underline' }}
              >
                Rates by ExchangeRate-API
              </a>.
            </p>
          </section>

          <section style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
              TasteMatch is a university data science project. Dataset: Zomato Restaurants Dataset via Kaggle.
              Built with React, Vite, TypeScript, Tailwind CSS, Leaflet, and Recharts. Zero paid APIs.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
