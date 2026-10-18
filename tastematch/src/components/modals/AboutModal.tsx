import { X } from 'lucide-react';
import datasetMetrics from '@/data/datasetMetrics.json';

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
              Data Sources & Attribution (Validator-Verified)
            </h3>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              TasteMatch is powered by two independent open datasets totalling <strong style={{ color: 'var(--text)' }}>{datasetMetrics.totalPlaces.toLocaleString()}</strong> verified places:
            </p>
            <ul style={{ margin: '8px 0 0', paddingLeft: 20, color: 'var(--text-muted)' }}>
              <li>
                <strong style={{ color: 'var(--text)' }}>Zomato Dataset (Kaggle):</strong> Historical snapshot covering <strong style={{ color: 'var(--text)' }}>{datasetMetrics.zomatoPlaces.toLocaleString()}</strong> rated places across 15 countries (~90% Delhi NCR).
              </li>
              <li style={{ marginTop: 6 }}>
                <strong style={{ color: 'var(--text)' }}>OpenStreetMap (OSM):</strong> Live geospatial data for Nigeria covering <strong style={{ color: 'var(--text)' }}>{datasetMetrics.nigeriaPlaces.toLocaleString()}</strong> places across <strong style={{ color: 'var(--text)' }}>{datasetMetrics.nigeriaCitiesCount}</strong> cities. Licensed under the <strong style={{ color: 'var(--text)' }}>Open Database License (ODbL)</strong>. © OpenStreetMap contributors.
              </li>
            </ul>
          </section>

          <section>
            <h3 style={{ margin: '0 0 8px', fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
              Geographic Skew & Coverage
            </h3>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              Approximately <strong style={{ color: 'var(--text)' }}>90% of the {datasetMetrics.zomatoPlaces.toLocaleString()} rated Zomato restaurants</strong> are
              from the <strong style={{ color: 'var(--text)' }}>Delhi NCR region of India</strong>.
              In Nigeria, {datasetMetrics.fullCitiesCount} cities have 5 or more places, while {datasetMetrics.limitedCoverageCitiesCount} cities with fewer than 5 listings are flagged as <em>"Limited coverage"</em>.
            </p>
          </section>

          <section>
            <h3 style={{ margin: '0 0 8px', fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
              Field Coverage & Honesty
            </h3>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              We never invent or infer data not present in open records. Nigerian OpenStreetMap verified field coverage:
            </p>
            <ul style={{ margin: '8px 0 0', paddingLeft: 20, color: 'var(--text-muted)' }}>
              <li>Locality / neighborhood: <strong style={{ color: 'var(--text)' }}>{datasetMetrics.coverage.localityPct}%</strong> ({datasetMetrics.coverage.localityCount.toLocaleString()} places)</li>
              <li>Cuisine classification: <strong style={{ color: 'var(--text)' }}>{datasetMetrics.coverage.cuisinePct}%</strong> ({datasetMetrics.coverage.cuisineCount.toLocaleString()} places)</li>
              <li>Opening hours: <strong style={{ color: 'var(--text)' }}>{datasetMetrics.coverage.hoursPct}%</strong> ({datasetMetrics.coverage.hoursCount.toLocaleString()} places)</li>
              <li>Phone contact: <strong style={{ color: 'var(--text)' }}>{datasetMetrics.coverage.phonePct}%</strong> ({datasetMetrics.coverage.phoneCount.toLocaleString()} places)</li>
            </ul>
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
              Ratings with fewer than 20 votes are marked <em>"few votes"</em> throughout the app.
              Unrated OSM listings use proximity and verified feature scoring without simulated ratings.
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
              TasteMatch dataset snapshot: {datasetMetrics.totalPlaces.toLocaleString()} total places across {datasetMetrics.shardCount} shards. Validated: {new Date(datasetMetrics.validatedAt).toLocaleDateString()}. Zero paid APIs.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
