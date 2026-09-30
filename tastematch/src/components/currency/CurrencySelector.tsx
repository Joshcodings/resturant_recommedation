import { useState, useRef, useEffect, useMemo } from 'react';
import { useCurrency } from '@/context/CurrencyContext';
import { PINNED_CURRENCIES, getCurrencyDisplayName } from '@/lib/currency';
import { ChevronDown, Search, Check, AlertCircle } from 'lucide-react';

export default function CurrencySelector() {
  const {
    selectedCurrency,
    setSelectedCurrency,
    ratesState,
    availableCurrencies,
  } = useCurrency();

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const filteredCurrencies = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableCurrencies;
    return availableCurrencies.filter(code => {
      const name = getCurrencyDisplayName(code).toLowerCase();
      return code.toLowerCase().includes(q) || name.includes(q);
    });
  }, [availableCurrencies, search]);

  const selectCurrency = (code: string) => {
    setSelectedCurrency(code);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={popoverRef} style={{ position: 'relative' }}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={`Select currency, current is ${selectedCurrency}`}
        title={`Currency: ${selectedCurrency}`}
        style={{
          height: 40,
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          color: 'var(--text)',
          cursor: 'pointer',
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.02em',
          transition: 'border-color 150ms',
        }}
      >
        <span>{selectedCurrency}</span>
        <ChevronDown size={14} strokeWidth={2} color="var(--text-muted)" />
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Currency Selector"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 320,
            maxHeight: 460,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            zIndex: 60,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Search Box */}
          <div style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '0 10px',
                height: 36,
              }}
            >
              <Search size={14} strokeWidth={1.5} color="var(--text-muted)" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search currency..."
                autoFocus
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text)',
                  fontSize: 13,
                  fontFamily: 'Inter, sans-serif',
                }}
              />
            </div>
          </div>

          {/* Fallback Notice if active */}
          {ratesState.isFallback && (
            <div
              style={{
                padding: '8px 12px',
                background: 'rgba(255, 184, 77, 0.1)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                color: 'var(--warn)',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <AlertCircle size={13} strokeWidth={1.5} />
              <span>Using saved rates from {ratesState.date}</span>
            </div>
          )}

          {/* List Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {/* Pinned Currencies (shown when not searching) */}
            {!search && (
              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontSize: 11,
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    fontFamily: 'Inter, sans-serif',
                    letterSpacing: '0.05em',
                    padding: '4px 8px 8px',
                    fontWeight: 600,
                  }}
                >
                  Popular
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {PINNED_CURRENCIES.map(code => {
                    const isSelected = selectedCurrency === code;
                    return (
                      <button
                        key={code}
                        onClick={() => selectCurrency(code)}
                        style={{
                          height: 32,
                          borderRadius: 6,
                          border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                          background: isSelected ? 'var(--accent)' : 'var(--surface-2)',
                          color: isSelected ? 'var(--accent-ink)' : 'var(--text)',
                          fontFamily: "'Space Grotesk', sans-serif",
                          fontWeight: 600,
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        {code}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All Currencies */}
            <div>
              <div
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  fontFamily: 'Inter, sans-serif',
                  letterSpacing: '0.05em',
                  padding: '4px 8px 8px',
                  fontWeight: 600,
                }}
              >
                {search ? 'Search Results' : 'All Currencies'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {filteredCurrencies.map(code => {
                  const isSelected = selectedCurrency === code;
                  const displayName = getCurrencyDisplayName(code);
                  return (
                    <button
                      key={code}
                      onClick={() => selectCurrency(code)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: 'none',
                        background: isSelected ? 'var(--surface-2)' : 'transparent',
                        color: 'var(--text)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 100ms',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span
                          style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontWeight: 600,
                            fontSize: 13,
                            color: isSelected ? 'var(--accent-deep)' : 'var(--text)',
                          }}
                        >
                          {code}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: 'var(--text-muted)',
                            fontFamily: 'Inter, sans-serif',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 240,
                          }}
                        >
                          {displayName}
                        </span>
                      </div>
                      {isSelected && (
                        <Check size={14} strokeWidth={2} color="var(--accent-deep)" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Popover Footer */}
          <div
            style={{
              padding: '10px 12px',
              borderTop: '1px solid var(--border)',
              background: 'var(--surface-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 11,
              color: 'var(--text-muted)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <span>Rates updated {ratesState.date}</span>
            {ratesState.provider === 'open.er-api' && (
              <a
                href="https://www.exchangerate-api.com"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--accent-deep)', textDecoration: 'none' }}
              >
                ExchangeRate-API
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
