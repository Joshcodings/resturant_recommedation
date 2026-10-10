/**
 * src/components/search/StateCapitalSwitcher.tsx
 * ===============================================
 * Component for Feature 10: State Capital Switcher.
 *
 * Allows users to quickly explore and switch between all 36 Nigerian State Capitals + FCT Abuja.
 * Shows place count for each capital from live dataset.
 * Unmapped capitals (0 places) trigger the friendly empty state and F9 contribution prompt.
 */

import { useState, useMemo } from 'react';
import {
  NIGERIAN_STATE_CAPITALS,
  GEOPOLITICAL_ZONES,
  type GeopoliticalZone,
  type NigerianStateCapital,
} from '@/config/nigerianCapitals';
import { useRestaurants } from '@/context/RestaurantContext';
import { MapPin, Search, ChevronRight, X, Building2 } from 'lucide-react';

interface Props {
  selectedCity: string;
  onSelectCity: (city: string) => void;
  open: boolean;
  onClose: () => void;
}

export default function StateCapitalSwitcher({
  selectedCity,
  onSelectCity,
  open,
  onClose,
}: Props) {
  const { data } = useRestaurants();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState<GeopoliticalZone>('All');

  // Compute live count per capital from actual data
  const countsByCapital = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of data) {
      if (r.country !== 'Nigeria') continue;
      const c = r.city;
      counts[c] = (counts[c] || 0) + 1;
    }
    return counts;
  }, [data]);

  const getCapitalCount = (item: NigerianStateCapital) => {
    let count = countsByCapital[item.capital] || 0;
    // Check aliases if count is 0
    if (count === 0 && item.aliases) {
      for (const alias of item.aliases) {
        if (countsByCapital[alias]) count += countsByCapital[alias];
      }
    }
    return count;
  };

  const filteredCapitals = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return NIGERIAN_STATE_CAPITALS.filter((item) => {
      // Zone filter
      if (selectedZone !== 'All' && item.zone !== selectedZone) {
        return false;
      }
      // Query filter
      if (q) {
        const matchesName = item.capital.toLowerCase().includes(q);
        const matchesState = item.state.toLowerCase().includes(q);
        return matchesName || matchesState;
      }
      return true;
    });
  }, [searchQuery, selectedZone]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 680,
          maxHeight: '85vh',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(200, 240, 60, 0.15)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building2 size={18} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--text)',
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                Nigerian State Capitals Switcher
              </h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Feature 10: 36 State Capitals + FCT Abuja
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 4,
            }}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search bar & Zone filters */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search by state or capital (e.g. Kano, Enugu, Osun)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: 38,
                paddingLeft: 36,
                paddingRight: 12,
                borderRadius: 8,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: 13,
              }}
            />
          </div>

          {/* Geopolitical Zone filter chips */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            {GEOPOLITICAL_ZONES.map((zone) => {
              const active = selectedZone === zone;
              return (
                <button
                  key={zone}
                  type="button"
                  onClick={() => setSelectedZone(zone)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: active ? 'var(--accent)' : 'var(--surface-2)',
                    color: active ? 'var(--accent-ink)' : 'var(--text-muted)',
                    fontSize: 11,
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {zone}
                </button>
              );
            })}
          </div>
        </div>

        {/* Capitals Grid / List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 8,
          }}
        >
          {filteredCapitals.map((item) => {
            const count = getCapitalCount(item);
            const isSelected = selectedCity.toLowerCase() === item.capital.toLowerCase();

            return (
              <div
                key={item.capital}
                data-capital-card={item.capital}
                onClick={() => {
                  onSelectCity(item.capital);
                  onClose();
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: isSelected ? 'rgba(200, 240, 60, 0.1)' : 'var(--surface-2)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  transition: 'background 120ms ease, border-color 120ms ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={13} color={isSelected ? 'var(--accent)' : 'var(--text-muted)'} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                      {item.capital}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {item.state} State · <span style={{ opacity: 0.8 }}>{item.zone}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: count > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      color: count > 0 ? '#10b981' : 'var(--text-muted)',
                      border: count > 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border)',
                    }}
                  >
                    {count > 0 ? `${count} places` : '0 mapped'}
                  </span>
                  <ChevronRight size={14} color="var(--text-muted)" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
