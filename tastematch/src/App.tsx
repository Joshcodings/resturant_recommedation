import { useState } from 'react';
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { RestaurantProvider } from '@/context/RestaurantContext';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { ShortlistProvider, useShortlist } from '@/context/ShortlistContext';
import CurrencySelector from '@/components/currency/CurrencySelector';
import DiscoverView from '@/views/DiscoverView';
import GroupView from '@/views/GroupView';
import InsightsView from '@/views/InsightsView';
import StyleguideView from '@/views/StyleguideView';
import AboutModal from '@/components/modals/AboutModal';
import ShortlistDrawer from '@/components/modals/ShortlistDrawer';
import { Sun, Moon, Heart, Info, Search, Users, BarChart3 } from 'lucide-react';
import type { RestaurantParsed } from '@/types/restaurant';
import './index.css';

// ─── Top Bar ─────────────────────────────────────────────────────────────────

interface TopBarProps {
  onOpenAbout: () => void;
  onOpenShortlist: () => void;
}

function TopBar({ onOpenAbout, onOpenShortlist }: TopBarProps) {
  const { theme, toggleTheme } = useTheme();
  const { shortlist } = useShortlist();

  return (
    <header
      className="top-bar-header"
      style={{
        height: 64,
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
      }}
    >
      {/* Wordmark: lowercase Space Grotesk 600 with 8px lime dot */}
      <NavLink
        to="/"
        style={{
          textDecoration: 'none',
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
          fontWeight: 600,
          fontSize: 20,
          color: 'var(--text)',
          letterSpacing: '-0.02em',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          userSelect: 'none',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--accent)',
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
        <span>tastematch</span>
      </NavLink>

      {/* Nav tabs: Discover, Group, Insights, About */}
      <nav className="desktop-nav" aria-label="Main navigation">
        {[
          { to: '/', label: 'Discover' },
          { to: '/group', label: 'Group' },
          { to: '/insights', label: 'Insights' },
        ].map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              fontFamily: 'Inter, sans-serif',
              color: isActive ? 'var(--accent-ink)' : 'var(--text-muted)',
              background: isActive ? 'var(--accent)' : 'transparent',
              textDecoration: 'none',
              transition: 'color 150ms, background 150ms',
            })}
          >
            {label}
          </NavLink>
        ))}

        {/* About tab triggers honesty modal */}
        <button
          onClick={onOpenAbout}
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            fontFamily: 'Inter, sans-serif',
            color: 'var(--text-muted)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            transition: 'color 150ms',
          }}
        >
          About
        </button>
      </nav>

      {/* Right Action Icons: Shortlist & Theme */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Shortlist button */}
        <button
          onClick={onOpenShortlist}
          aria-label={`Open shortlist (${shortlist.length} saved)`}
          title={`Shortlist (${shortlist.length})`}
          style={{
            height: 40,
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: shortlist.length > 0 ? 'var(--accent-deep)' : 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <Heart size={16} strokeWidth={1.5} fill={shortlist.length > 0 ? 'var(--accent)' : 'none'} />
          <span>{shortlist.length}</span>
        </button>

        {/* Currency selector (left of theme toggle per amendment 5) */}
        <CurrencySelector />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          style={{
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text-muted)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {theme === 'dark' ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
        </button>
      </div>
    </header>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer({ onOpenAbout }: { onOpenAbout: () => void }) {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--surface)',
        padding: '32px 24px',
        color: 'var(--text-muted)',
        fontSize: 13,
        fontFamily: 'Inter, sans-serif',
        lineHeight: '20px',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 20,
        }}
      >
        <div style={{ maxWidth: 640 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}>
            <span>TasteMatch</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>· University Data Science Project</span>
          </div>
          <p style={{ margin: 0, fontSize: 12 }}>
            Data source: Public Zomato dataset (Kaggle). This is an older snapshot with no explicit date; restaurants may have closed.
            Approx. 90% of records are from the Delhi NCR region.
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 11 }}>
            Restaurant location data © OpenStreetMap contributors, available under the Open Database License (ODbL).
            Nigeria data retrieved 2026-10-07. OpenStreetMap is community-mapped, so many places are missing or out of date.
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 11 }}>
            Prices come from an older dataset snapshot and are converted at today's indicative exchange rates, so treat amounts as rough estimates. Current menu prices are likely higher. Rates are not for financial use.{' '}
            <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>
              Rates by ExchangeRate-API
            </a>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={onOpenAbout}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: 'var(--text)',
              fontSize: 13,
              cursor: 'pointer',
              textDecoration: 'underline',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Info size={14} strokeWidth={1.5} />
            <span>Honesty & Methodology</span>
          </button>
        </div>
      </div>
    </footer>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────

function AppShell() {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isShortlistOpen, setIsShortlistOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <TopBar
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenShortlist={() => setIsShortlistOpen(true)}
      />

      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<DiscoverView />} />
          <Route path="/group" element={<GroupView />} />
          <Route path="/insights" element={<InsightsView />} />
          <Route
            path="/about"
            element={
              <div style={{ padding: '64px 24px', maxWidth: 680, margin: '0 auto' }}>
                <AboutModal open={true} onClose={() => window.history.back()} />
              </div>
            }
          />
          {/* Hidden dev route — not in nav (amendment 8) */}
          <Route path="/styleguide" element={<StyleguideView />} />
        </Routes>
      </main>

      <Footer onOpenAbout={() => setIsAboutOpen(true)} />

      {/* Mobile Bottom Navigation Bar (below 768px) */}
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          <Search size={18} strokeWidth={2} />
          <span>Discover</span>
        </NavLink>
        <NavLink to="/group" className={({ isActive }) => (isActive ? 'active' : '')}>
          <Users size={18} strokeWidth={2} />
          <span>Group</span>
        </NavLink>
        <NavLink to="/insights" className={({ isActive }) => (isActive ? 'active' : '')}>
          <BarChart3 size={18} strokeWidth={2} />
          <span>Insights</span>
        </NavLink>
        <button onClick={() => setIsAboutOpen(true)} type="button">
          <Info size={18} strokeWidth={2} />
          <span>About</span>
        </button>
      </nav>

      {/* Global Modals */}
      <AboutModal open={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <ShortlistDrawer
        open={isShortlistOpen}
        onClose={() => setIsShortlistOpen(false)}
        onSelectRestaurant={(_r: RestaurantParsed) => {
          // Handled via session shortlist
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <RestaurantProvider>
        <CurrencyProvider>
          <ShortlistProvider>
            <HashRouter>
              <AppShell />
            </HashRouter>
          </ShortlistProvider>
        </CurrencyProvider>
      </RestaurantProvider>
    </ThemeProvider>
  );
}
