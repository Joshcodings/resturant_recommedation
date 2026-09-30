import type { ReactNode } from 'react';
import { contrastRatio, passesAA } from '@/lib/formatters';
import { useTheme } from '@/context/ThemeContext';
import {
  Heart, Utensils, Bike, Info, AlertTriangle, CheckCircle2,
  ChevronDown, SlidersHorizontal, GitCompare, Sparkles,
} from 'lucide-react';

// ─── Helper: read a CSS variable from :root at render time ──────────────────

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

// ─── Section heading ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 64 }}>
      <h2
        style={{
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
          fontWeight: 700,
          fontSize: 28,
          lineHeight: '34px',
          color: 'var(--text)',
          marginBottom: 24,
          paddingBottom: 12,
          borderBottom: '1px solid var(--border)',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

// ─── Color Token Swatch ───────────────────────────────────────────────────────

interface SwatchProps {
  name: string;
  hex: string;
  textHex: string;
  label: string;
}

function Swatch({ name, hex, textHex, label }: SwatchProps) {
  const ratio = contrastRatio(textHex, hex);
  const passBody = passesAA(ratio, false);
  const passUI = passesAA(ratio, true);

  return (
    <div
      style={{
        background: hex,
        borderRadius: 8,
        padding: '16px 12px',
        border: '1px solid var(--border)',
        minWidth: 140,
        flex: '1 1 140px',
      }}
    >
      <div
        style={{
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
          fontWeight: 600,
          fontSize: 14,
          color: textHex,
          marginBottom: 4,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {hex.toUpperCase()}
      </div>
      <div style={{ fontSize: 12, color: textHex, opacity: 0.8, marginBottom: 8 }}>
        {name}
      </div>
      <div style={{ fontSize: 11, color: textHex, opacity: 0.75 }}>
        {label}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 11,
          fontVariantNumeric: 'tabular-nums',
          color: textHex,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            padding: '1px 5px',
            borderRadius: 4,
            background: passBody
              ? 'rgba(0,200,80,0.25)'
              : passUI
              ? 'rgba(255,180,0,0.25)'
              : 'rgba(255,80,80,0.25)',
            marginRight: 4,
          }}
        >
          {ratio.toFixed(1)}:1
        </span>
        {passBody ? '✓ AA Body' : passUI ? '~ AA UI only' : '✗ Fails AA'}
      </div>
    </div>
  );
}

// ─── Typography specimen ──────────────────────────────────────────────────────

function TypeSpec({
  tag,
  size,
  lh,
  weight,
  font,
  sample,
  extra,
}: {
  tag: string;
  size: number;
  lh: number | string;
  weight: number;
  font: 'Space Grotesk' | 'Inter';
  sample: string;
  extra?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 24,
        padding: '12px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span
        style={{
          width: 120,
          fontSize: 11,
          color: 'var(--text-muted)',
          fontFamily: 'Inter',
          flexShrink: 0,
        }}
      >
        {tag}
        <br />
        {size}px/{lh} • {weight}
        <br />
        {font}
      </span>
      <span
        style={{
          fontFamily: `'${font}', system-ui, sans-serif`,
          fontSize: size,
          lineHeight: typeof lh === 'number' ? `${lh}px` : lh,
          fontWeight: weight,
          color: 'var(--text)',
          ...extra,
        }}
      >
        {sample}
      </span>
    </div>
  );
}

// ─── Button specimens ─────────────────────────────────────────────────────────

function ButtonRow() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      {/* Primary */}
      <button
        style={{
          height: 44,
          padding: '0 20px',
          background: 'var(--accent)',
          color: 'var(--accent-ink)',
          border: 'none',
          borderRadius: 8,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 600,
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        Primary
      </button>

      {/* Secondary */}
      <button
        style={{
          height: 44,
          padding: '0 20px',
          background: 'transparent',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 500,
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        Secondary
      </button>

      {/* Ghost */}
      <button
        style={{
          height: 44,
          padding: '0 16px',
          background: 'transparent',
          color: 'var(--text-muted)',
          border: 'none',
          borderRadius: 8,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 500,
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        Ghost
      </button>

      {/* Icon button */}
      <button
        aria-label="Save restaurant"
        style={{
          width: 44,
          height: 44,
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
        <Heart size={20} strokeWidth={1.5} />
      </button>

      {/* Disabled */}
      <button
        disabled
        style={{
          height: 44,
          padding: '0 20px',
          background: 'var(--surface-2)',
          color: 'var(--text-muted)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 500,
          fontSize: 14,
          cursor: 'not-allowed',
          opacity: 0.5,
        }}
      >
        Disabled
      </button>
    </div>
  );
}

// ─── Chip specimens ───────────────────────────────────────────────────────────

function ChipRow() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {/* Inactive preset chip */}
      {['Date night 🕯️', 'Cheap eats 💸', 'Hidden gems 💎'].map(label => (
        <button
          key={label}
          style={{
            height: 36,
            padding: '0 14px',
            background: 'transparent',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: 999,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </button>
      ))}

      {/* Active preset chip */}
      <button
        style={{
          height: 36,
          padding: '0 14px',
          background: 'var(--accent)',
          color: 'var(--accent-ink)',
          border: '1px solid var(--accent)',
          borderRadius: 999,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Crowd favourites 🔥
      </button>

      {/* Cuisine chip */}
      {['North Indian', 'Chinese', '+2'].map(label => (
        <span
          key={label}
          style={{
            height: 28,
            padding: '0 10px',
            display: 'inline-flex',
            alignItems: 'center',
            background: 'transparent',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
            borderRadius: 999,
            fontSize: 12,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

// ─── Input specimens ──────────────────────────────────────────────────────────

function InputRow() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <input
        type="text"
        placeholder="City search…"
        style={{
          height: 44,
          padding: '0 12px',
          background: 'var(--surface)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 14,
          width: 200,
          outline: 'none',
        }}
      />
      <select
        style={{
          height: 44,
          padding: '0 12px',
          background: 'var(--surface)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 14,
          width: 160,
        }}
      >
        <option>Any price</option>
        <option>1 — Budget</option>
        <option>2 — Mid-range</option>
        <option>3 — Upscale</option>
        <option>4 — Fine dining</option>
      </select>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          height: 44,
          padding: '0 12px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          fontSize: 14,
          color: 'var(--text)',
          cursor: 'pointer',
        }}
      >
        <span>Cuisines</span>
        <ChevronDown size={16} strokeWidth={1.5} color="var(--text-muted)" />
      </div>
    </div>
  );
}

// ─── Slider specimens ─────────────────────────────────────────────────────────

function SliderRow() {
  const labels = ['Rating', 'Cuisine match', 'Popularity', 'Cost'];
  const values = [70, 50, 30, 60];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
      {labels.map((label, i) => (
        <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <label style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>
              {label}
            </label>
            <span style={{ fontSize: 13, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', fontFamily: 'Inter, sans-serif' }}>
              {values[i]}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            defaultValue={values[i]}
            aria-label={`${label} weight`}
            style={{ width: '100%', accentColor: 'var(--accent)', height: 4 }}
          />
        </div>
      ))}
      <button
        style={{
          alignSelf: 'flex-start',
          padding: '6px 12px',
          background: 'transparent',
          color: 'var(--text-muted)',
          border: 'none',
          fontSize: 13,
          cursor: 'pointer',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        Reset
      </button>
    </div>
  );
}

// ─── Badge specimens ──────────────────────────────────────────────────────────

function BadgeRow() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      {/* Limited data pill */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 10px',
          borderRadius: 999,
          border: '1px solid var(--warn)',
          color: 'var(--warn)',
          fontSize: 12,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
        }}
      >
        <AlertTriangle size={12} strokeWidth={1.5} />
        Limited data: 20 restaurants
      </span>

      {/* Few votes badge */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 999,
          border: '1px solid var(--border)',
          color: 'var(--text-muted)',
          fontSize: 11,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        few votes
      </span>

      {/* Service badges */}
      <span
        aria-label="Table booking available"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          background: 'var(--surface-2)',
          borderRadius: 999,
          border: '1px solid var(--border)',
          fontSize: 12,
          color: 'var(--text-muted)',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <Utensils size={12} strokeWidth={1.5} />
        Table booking
      </span>
      <span
        aria-label="Online delivery available"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          background: 'var(--surface-2)',
          borderRadius: 999,
          border: '1px solid var(--border)',
          fontSize: 12,
          color: 'var(--text-muted)',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <Bike size={12} strokeWidth={1.5} />
        Delivery
      </span>
    </div>
  );
}

// ─── Notice Banner specimens ──────────────────────────────────────────────────

function NoticeBanners() {
  const banners: Array<{ label: string; text: string }> = [
    {
      label: 'Stage a — Exact match',
      text: 'Exact match',
    },
    {
      label: 'Stage b',
      text: 'No exact price match. Showing restaurants within price range ±1 while matching your cuisines.',
    },
    {
      label: 'Stage c',
      text: 'No exact cuisine match. Showing top-rated restaurants within price range ±1 (cuisine filter relaxed).',
    },
    {
      label: 'Stage d',
      text: 'Showing the highest-rated restaurants across all price ranges and cuisines in this city.',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {banners.map(b => (
        <div
          key={b.label}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '12px 16px',
            background: 'var(--surface-2)',
            borderLeft: '2px solid var(--accent)',
            borderRadius: '0 8px 8px 0',
          }}
        >
          <Info size={16} strokeWidth={1.5} color="var(--accent-deep)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>
              {b.label}{' '}
            </span>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text)', fontFamily: 'Inter, sans-serif', lineHeight: '20px' }}>
              {b.text}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Price Dots ───────────────────────────────────────────────────────────────

function PriceDots({ level }: { level: 1 | 2 | 3 | 4 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 4 }} aria-label={`Price range ${level} of 4`}>
      {[1, 2, 3, 4].map(i => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: i <= level ? 'var(--accent)' : 'var(--border)',
            display: 'inline-block',
          }}
        />
      ))}
    </span>
  );
}

// ─── Rating Bar ───────────────────────────────────────────────────────────────

function RatingBar({ value }: { value: number }) {
  return (
    <div className="rating-bar-track" style={{ width: '100%' }}>
      <div
        className="rating-bar-fill"
        style={{ width: `${(value / 5) * 100}%` }}
      />
    </div>
  );
}

// ─── Sample Restaurant Card ───────────────────────────────────────────────────

function SampleCard() {
  return (
    <article
      className="card-hover"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        maxWidth: 400,
        cursor: 'pointer',
      }}
      role="article"
      aria-label="Sample restaurant card"
    >
      {/* Row 1: emoji tile + rank + heart */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            background: 'var(--surface-2)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          🍛
        </div>
        <div style={{ flex: 1 }} />
        <span
          style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text-muted)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          01
        </span>
        <button
          aria-label="Save to shortlist"
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
          }}
        >
          <Heart size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* Row 2: name + locality */}
      <div>
        <h3
          style={{
            margin: 0,
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontSize: 20,
            fontWeight: 600,
            lineHeight: '28px',
            color: 'var(--text)',
          }}
        >
          Karim's Restaurant
        </h3>
        <p
          style={{
            margin: '2px 0 0',
            fontSize: 14,
            color: 'var(--text-muted)',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          Jama Masjid · New Delhi
        </p>
      </div>

      {/* Row 3: cuisine chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {['Mughlai', 'North Indian', 'Biryani'].map(c => (
          <span
            key={c}
            style={{
              height: 24,
              padding: '0 8px',
              display: 'inline-flex',
              alignItems: 'center',
              border: '1px solid var(--border)',
              borderRadius: 999,
              fontSize: 12,
              color: 'var(--text-muted)',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {c}
          </span>
        ))}
      </div>

      {/* Stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        {/* Rating */}
        <div>
          <div
            style={{
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              fontSize: 28,
              fontWeight: 600,
              lineHeight: '34px',
              color: 'var(--text)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            4.6
          </div>
          <RatingBar value={4.6} />
        </div>
        {/* Votes */}
        <div>
          <div
            style={{
              fontSize: 14,
              color: 'var(--text-muted)',
              fontFamily: 'Inter, system-ui, sans-serif',
              marginTop: 6,
            }}
          >
            1,071 votes
          </div>
        </div>
        {/* Cost */}
        <div>
          <div
            style={{
              fontSize: 14,
              color: 'var(--text-muted)',
              fontFamily: 'Inter, system-ui, sans-serif',
              marginTop: 6,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            600 INR
          </div>
        </div>
      </div>

      {/* Price dots + service badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <PriceDots level={2} />
        <span
          aria-label="Table booking available"
          title="Table booking"
          style={{ color: 'var(--text-muted)' }}
        >
          <Utensils size={14} strokeWidth={1.5} />
        </span>
        <span
          aria-label="Online delivery available"
          title="Online delivery"
          style={{ color: 'var(--text-muted)' }}
        >
          <Bike size={14} strokeWidth={1.5} />
        </span>
      </div>

      {/* "Why this pick" */}
      <div
        style={{
          fontSize: 14,
          color: 'var(--text-muted)',
          fontFamily: 'Inter, system-ui, sans-serif',
          lineHeight: '20px',
          borderLeft: '2px solid var(--accent)',
          paddingLeft: 12,
        }}
      >
        Serves 2 of your 2 cuisines, rated 4.6 from 1,071 votes, in your price range.
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          style={{
            padding: '6px 12px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 13,
            fontFamily: 'Inter, sans-serif',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Sparkles size={14} strokeWidth={1.5} />
          Similar
        </button>
        <button
          style={{
            padding: '6px 12px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 13,
            fontFamily: 'Inter, sans-serif',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <GitCompare size={14} strokeWidth={1.5} />
          Compare
        </button>
      </div>
    </article>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        maxWidth: 400,
      }}
      aria-hidden="true"
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 10 }} />
        <div className="skeleton" style={{ flex: 1, height: 14, borderRadius: 4 }} />
      </div>
      <div className="skeleton" style={{ height: 22, width: '70%', borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 14, width: '50%', borderRadius: 4 }} />
      <div style={{ display: 'flex', gap: 6 }}>
        {[80, 70, 55].map(w => (
          <div key={w} className="skeleton" style={{ height: 24, width: w, borderRadius: 999 }} />
        ))}
      </div>
    </div>
  );
}

// ─── Contrast Table ───────────────────────────────────────────────────────────

function ContrastTable() {
  // We read CSS vars at render time so the table reflects the ACTIVE theme.
  const pairs: Array<{ label: string; fg: string; bg: string }> = [
    { label: '--text on --bg',           fg: cssVar('--text'),       bg: cssVar('--bg') },
    { label: '--text on --surface',      fg: cssVar('--text'),       bg: cssVar('--surface') },
    { label: '--text-muted on --bg',     fg: cssVar('--text-muted'), bg: cssVar('--bg') },
    { label: '--text-muted on --surface',fg: cssVar('--text-muted'), bg: cssVar('--surface') },
    { label: '--accent-ink on --accent', fg: cssVar('--accent-ink'), bg: cssVar('--accent') },
    { label: '--accent-deep on --bg (light: text link)', fg: cssVar('--accent-deep'), bg: cssVar('--bg') },
    { label: '--danger on --bg',         fg: cssVar('--danger'),     bg: cssVar('--bg') },
    { label: '--warn on --bg',           fg: cssVar('--warn'),       bg: cssVar('--bg') },
  ];

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Pair', 'FG', 'BG', 'Ratio', 'AA Body (4.5:1)', 'AA UI/Large (3:1)'].map(h => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pairs.map(({ label, fg, bg }) => {
            const ratio = (fg && bg && fg.startsWith('#') && bg.startsWith('#'))
              ? contrastRatio(fg, bg)
              : 0;
            const bodyPass = passesAA(ratio, false);
            const uiPass = passesAA(ratio, true);
            return (
              <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 12px', color: 'var(--text)' }}>{label}</td>
                <td style={{ padding: '8px 12px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 11, fontFamily: 'monospace', color: 'var(--text)',
                  }}>
                    <span style={{ display: 'inline-block', width: 12, height: 12, background: fg, borderRadius: 2, border: '1px solid var(--border)' }} />
                    {fg || '—'}
                  </span>
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 11, fontFamily: 'monospace', color: 'var(--text)',
                  }}>
                    <span style={{ display: 'inline-block', width: 12, height: 12, background: bg, borderRadius: 2, border: '1px solid var(--border)' }} />
                    {bg || '—'}
                  </span>
                </td>
                <td style={{ padding: '8px 12px', fontVariantNumeric: 'tabular-nums', color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                  {ratio > 0 ? `${ratio.toFixed(2)}:1` : '—'}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  {ratio > 0 ? (
                    bodyPass
                      ? <CheckCircle2 size={16} color="var(--accent-deep)" strokeWidth={2} />
                      : <AlertTriangle size={16} color="var(--danger)" strokeWidth={2} />
                  ) : '—'}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  {ratio > 0 ? (
                    uiPass
                      ? <CheckCircle2 size={16} color="var(--accent-deep)" strokeWidth={2} />
                      : <AlertTriangle size={16} color="var(--danger)" strokeWidth={2} />
                  ) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Styleguide View ──────────────────────────────────────────────────────────

export default function StyleguideView() {
  const { theme } = useTheme();

  // Token sets for swatches — values read at render from CSS vars
  const darkSwatches: SwatchProps[] = [
    { name: '--bg',         hex: '#0C0D10', textHex: '#F3F2EE', label: 'Page background' },
    { name: '--surface',    hex: '#14161B', textHex: '#F3F2EE', label: 'Cards & panels' },
    { name: '--surface-2',  hex: '#1C1F26', textHex: '#F3F2EE', label: 'Inputs & nested bg' },
    { name: '--border',     hex: '#262A33', textHex: '#9AA0AC', label: 'Borders & tracks' },
    { name: '--text',       hex: '#F3F2EE', textHex: '#0C0D10', label: 'Primary text' },
    { name: '--text-muted', hex: '#9AA0AC', textHex: '#0C0D10', label: 'Secondary text' },
    { name: '--accent',     hex: '#C8F03C', textHex: '#0C0D10', label: 'Lime accent' },
    { name: '--danger',     hex: '#FF6B5A', textHex: '#0C0D10', label: 'Error / danger' },
    { name: '--warn',       hex: '#FFB84D', textHex: '#0C0D10', label: 'Warning' },
  ];

  const lightSwatches: SwatchProps[] = [
    { name: '--bg',          hex: '#F4F3EF', textHex: '#101216', label: 'Page background' },
    { name: '--surface',     hex: '#FFFFFF', textHex: '#101216', label: 'Cards & panels' },
    { name: '--surface-2',   hex: '#ECEBE5', textHex: '#101216', label: 'Inputs & nested bg' },
    { name: '--border',      hex: '#DAD8D0', textHex: '#5B616D', label: 'Borders' },
    { name: '--text',        hex: '#101216', textHex: '#F4F3EF', label: 'Primary text' },
    { name: '--text-muted',  hex: '#5B616D', textHex: '#F4F3EF', label: 'Secondary text' },
    { name: '--accent',      hex: '#C8F03C', textHex: '#101216', label: 'Lime accent (fill only!)' },
    { name: '--accent-deep', hex: '#4A6100', textHex: '#FFFFFF', label: 'High-contrast accent text' },
    { name: '--danger',      hex: '#C2321F', textHex: '#FFFFFF', label: 'Error / danger' },
    { name: '--warn',        hex: '#8A5A00', textHex: '#FFFFFF', label: 'Warning' },
  ];

  const chartSwatches: SwatchProps[] = [
    { name: 'Lime',       hex: '#C8F03C', textHex: '#0C0D10', label: 'Primary series' },
    { name: 'Sky',        hex: '#7DD3FC', textHex: '#0C0D10', label: 'Series 2' },
    { name: 'Rose',       hex: '#F9A8D4', textHex: '#0C0D10', label: 'Series 3' },
    { name: 'Amber',      hex: '#FDBA74', textHex: '#0C0D10', label: 'Series 4' },
    { name: 'Periwinkle', hex: '#A5B4FC', textHex: '#0C0D10', label: 'Series 5' },
  ];

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '48px 24px 96px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 64 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 12px',
            border: '1px solid var(--border)',
            borderRadius: 999,
            fontSize: 12,
            color: 'var(--text-muted)',
            fontFamily: 'Inter, sans-serif',
            marginBottom: 16,
          }}
        >
          <SlidersHorizontal size={12} strokeWidth={1.5} />
          Dev-only route — not in navigation (amendment 8)
        </div>
        <h1
          style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(40px, 7vw, 72px)',
            lineHeight: 1.02,
            color: 'var(--text)',
            letterSpacing: '-0.03em',
            margin: 0,
          }}
        >
          Styleguide
        </h1>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', fontSize: 16, marginTop: 8 }}>
          Ink & Lime design system — TasteMatch
          <br />
          Active theme: <strong style={{ color: 'var(--text)' }}>{theme}</strong>. Toggle via the top-right button.
        </p>
      </div>

      {/* 1. Color tokens */}
      <Section title="1. Color Tokens — Dark">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {darkSwatches.map(s => <Swatch key={s.name} {...s} />)}
        </div>
      </Section>

      <Section title="2. Color Tokens — Light">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {lightSwatches.map(s => <Swatch key={s.name} {...s} />)}
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'Inter, sans-serif', marginTop: 12 }}>
          ⚠️ Lime (<code>#C8F03C</code>) is never used as text on light backgrounds.
          Use <code>--accent-deep</code> (#4A6100) for accent text on light surfaces.
        </p>
      </Section>

      <Section title="3. Chart Palette">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {chartSwatches.map(s => <Swatch key={s.name} {...s} />)}
        </div>
      </Section>

      {/* 2. Live contrast table */}
      <Section title="4. Contrast Ratios (computed in code — amendment 10)">
        <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'Inter, sans-serif', marginBottom: 16 }}>
          Contrast ratios computed live using the WCAG 2.1 relative-luminance formula.
          Switch between dark and light mode to verify both themes. Body text requires ≥4.5:1; UI/large text ≥3:1.
        </p>
        <ContrastTable />
      </Section>

      {/* 3. Typography */}
      <Section title="5. Typography Scale">
        <TypeSpec tag="Hero heading" size={40} lh="1.02" weight={600} font="Space Grotesk" sample="Where are we eating?" extra={{ letterSpacing: '-0.03em' }} />
        <TypeSpec tag="Section title" size={40} lh={44} weight={700} font="Space Grotesk" sample="Top picks in Delhi" />
        <TypeSpec tag="Stat number" size={28} lh={34} weight={600} font="Space Grotesk" sample="4.6 · 1,071 votes" extra={{ fontVariantNumeric: 'tabular-nums' }} />
        <TypeSpec tag="Card title" size={20} lh={28} weight={600} font="Space Grotesk" sample="Karim's Restaurant" />
        <TypeSpec tag="Body" size={16} lh={24} weight={400} font="Inter" sample="The perfect restaurant for every occasion." />
        <TypeSpec tag="Small / label" size={14} lh={20} weight={500} font="Inter" sample="Jama Masjid · New Delhi" />
        <TypeSpec tag="Caption / badge" size={12} lh={16} weight={400} font="Inter" sample="North Indian · Mughlai · +2" />
      </Section>

      {/* 4. Buttons */}
      <Section title="6. Buttons">
        <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'Inter, sans-serif', marginBottom: 16 }}>
          Primary: lime fill, accent-ink text, 44px height, radius 8.
          Secondary: transparent, 1px border. Ghost: text only. All touch targets ≥44×44px.
        </p>
        <ButtonRow />
      </Section>

      {/* 5. Chips */}
      <Section title="7. Chips & Pills">
        <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'Inter, sans-serif', marginBottom: 16 }}>
          Preset chips (36px, radius 999). Active = lime fill, ink text. One active at a time.
          Cuisine chips (28px). Count badge on overflow. Service badges with icons.
        </p>
        <ChipRow />
      </Section>

      {/* 6. Inputs */}
      <Section title="8. Inputs & Selects">
        <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'Inter, sans-serif', marginBottom: 16 }}>
          44px height, surface bg, 1px border, radius 8. Focus ring: 2px --accent-deep, 2px offset.
        </p>
        <InputRow />
      </Section>

      {/* 7. Sliders */}
      <Section title="9. Priority Sliders">
        <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'Inter, sans-serif', marginBottom: 16 }}>
          Range 0–100. Re-ranks the full qualifying pool live (amendment 1). Accent thumb.
        </p>
        <SliderRow />
      </Section>

      {/* 8. Badges */}
      <Section title="10. Badges & Labels">
        <BadgeRow />
      </Section>

      {/* 9. Notice banners */}
      <Section title="11. Relaxation Stage Notices">
        <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'Inter, sans-serif', marginBottom: 16 }}>
          Stage a: shown as a small "Exact match" chip (amendment 13). Stages b–d: inline banner with
          2px lime left border (amendment 5 cuisine-only variant applied when price = Any).
        </p>
        <NoticeBanners />
      </Section>

      {/* 10. Price dots */}
      <Section title="12. Price Range Dots">
        <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'Inter, sans-serif', marginBottom: 16 }}>
          4 dots; filled dots = price tier. Never currency symbols on the card.
        </p>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          {([1, 2, 3, 4] as const).map(l => (
            <div key={l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <PriceDots level={l} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>
                Tier {l}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* 11. Rating bar */}
      <Section title="13. Rating Bar">
        <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'Inter, sans-serif', marginBottom: 16 }}>
          4px height. Track = --border. Fill = --accent. Width = (rating / 5) × 100%.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 300 }}>
          {[4.8, 4.2, 3.6, 2.0].map(v => (
            <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 14,
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--text)',
                width: 28,
                flexShrink: 0,
              }}>
                {v}
              </span>
              <div style={{ flex: 1 }}>
                <RatingBar value={v} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 12. Sample restaurant card */}
      <Section title="14. Restaurant Card (Sample)">
        <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'Inter, sans-serif', marginBottom: 16 }}>
          Hover to see translateY(-2px) and border-color transition. Surface, 1px border, radius 12, padding 20.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <SampleCard />
          <SkeletonCard />
        </div>
      </Section>

      {/* 13. Skeleton */}
      <Section title="15. Skeleton & Loading States">
        <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'Inter, sans-serif', marginBottom: 16 }}>
          Shimmering surface-2 blocks with shimmer animation. Disabled under prefers-reduced-motion.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[200, 150, 120, 180].map(w => (
            <div key={w} className="skeleton" style={{ height: 24, width: w, borderRadius: 4 }} />
          ))}
        </div>
      </Section>

      {/* 14. Spacing scale */}
      <Section title="16. Spacing Scale (4px base)">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
          {[4, 8, 12, 16, 24, 32, 48, 64, 96].map(s => (
            <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: s, height: s, background: 'var(--accent)', borderRadius: 2, opacity: 0.7 }} />
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>{s}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* 15. Motion */}
      <Section title="17. Motion & Animation">
        <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'Inter, sans-serif', marginBottom: 16 }}>
          Durations: 150ms (fast/hover), 250ms (base transitions). Easing: cubic-bezier(0.2, 0.8, 0.2, 1).
          All animations disabled under <code>prefers-reduced-motion: reduce</code>. No looping animations.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <div
            className="card-enter"
            style={{
              padding: '12px 20px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--text)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Card enter (fade + translateY 8px)
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '12px 20px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--text)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <span className="count-up">Rating: 4.6</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(count-up 400ms)</span>
          </div>
        </div>
      </Section>
    </div>
  );
}
