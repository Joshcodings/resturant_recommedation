import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { useRestaurants } from '@/context/RestaurantContext';
import { useCurrency } from '@/context/CurrencyContext';
import {
  PRICE_TIERS,
  computeCountryTierMedian,
  convertCurrency,
  formatCurrency,
} from '@/lib/currency';

interface Props {
  selectedCountry: string;
  onCountryChange: (country: string) => void;
  selectedCity: string;
  onCityChange: (city: string) => void;
  selectedPrice: (1 | 2 | 3 | 4) | null;
  onPriceChange: (price: (1 | 2 | 3 | 4) | null) => void;
  isPriceOverriddenByPreset: boolean;
  selectedCuisines: string[];
  onCuisinesChange: (cuisines: string[]) => void;
  onFind: () => void;
}

export default function SearchBar({
  selectedCountry,
  onCountryChange,
  selectedCity,
  onCityChange,
  selectedPrice,
  onPriceChange,
  isPriceOverriddenByPreset,
  selectedCuisines,
  onCuisinesChange,
  onFind,
}: Props) {
  const { data, countryCityIndex, getCuisines } = useRestaurants();
  const { selectedCurrency, ratesState } = useCurrency();

  const priceOptions = useMemo(() => {
    const opts: Array<{
      value: (1 | 2 | 3 | 4) | null;
      label: string;
      tooltip: string;
    }> = [{ value: null, label: 'Any', tooltip: 'Any price range' }];

    const tiers = [1, 2, 3, 4] as const;
    for (const t of tiers) {
      const tierInfo = PRICE_TIERS[t];
      const stats = computeCountryTierMedian(data, selectedCountry, t);
      let typicalStr = '';
      let tooltip = `${tierInfo.name} (${tierInfo.dots})`;

      if (stats.medianLocal !== null) {
        const converted = convertCurrency(
          stats.medianLocal,
          stats.currency,
          selectedCurrency,
          ratesState.rates,
        );
        if (converted !== null) {
          typicalStr = formatCurrency(converted, selectedCurrency, { isApprox: true });
          const localStr = formatCurrency(stats.medianLocal, stats.currency);
          tooltip = `${tierInfo.name}: about ${typicalStr} for two in ${selectedCountry} (median ${localStr})`;
        }
      }

      opts.push({
        value: t,
        label: typicalStr
          ? `${tierInfo.name} ${tierInfo.shortDots} · ${typicalStr}`
          : `${tierInfo.name} ${tierInfo.shortDots}`,
        tooltip,
      });
    }

    return opts;
  }, [data, selectedCountry, selectedCurrency, ratesState.rates]);

  const countries = Object.keys(countryCityIndex).sort();
  const cities = countryCityIndex[selectedCountry] || [];
  const cityCuisines = getCuisines(selectedCity);

  const [isCityOpen, setIsCityOpen] = useState(false);
  const [cityFilter, setCityFilter] = useState('');

  const [isCuisineOpen, setIsCuisineOpen] = useState(false);
  const [cuisineFilter, setCuisineFilter] = useState('');

  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const cuisineDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node)) {
        setIsCityOpen(false);
      }
      if (cuisineDropdownRef.current && !cuisineDropdownRef.current.contains(e.target as Node)) {
        setIsCuisineOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCities = cities.filter(c =>
    c.toLowerCase().includes(cityFilter.toLowerCase().trim())
  );

  const filteredCuisines = cityCuisines.filter(c =>
    c.toLowerCase().includes(cuisineFilter.toLowerCase().trim())
  );

  const toggleCuisine = (c: string) => {
    if (selectedCuisines.includes(c)) {
      onCuisinesChange(selectedCuisines.filter(item => item !== c));
    } else {
      onCuisinesChange([...selectedCuisines, c]);
    }
  };

  return (
    <div
      className="search-bar-grid"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        backgroundColor: 'var(--border)',
        overflow: 'visible',
        position: 'relative',
        zIndex: 20,
      }}
    >
      {/* Segment 1: Country & City */}
      <div
        ref={cityDropdownRef}
        className="search-bar-seg-1"
        style={{
          background: 'var(--surface)',
          padding: '10px 16px',
          position: 'relative',
        }}
      >
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Location
        </div>
        <div
          onClick={() => setIsCityOpen(!isCityOpen)}
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 4,
          }}
        >
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>
              {selectedCity || 'Select city'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>
              ({selectedCountry})
            </span>
          </div>
          <ChevronDown size={16} strokeWidth={1.5} color="var(--text-muted)" />
        </div>

        {/* City Dropdown Menu */}
        {isCityOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              width: 280,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 12,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              zIndex: 50,
            }}
          >
            {/* Country Selector */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Country
              </label>
              <select
                value={selectedCountry}
                onChange={e => {
                  const newCountry = e.target.value;
                  onCountryChange(newCountry);
                  const firstCity = countryCityIndex[newCountry]?.[0] || '';
                  onCityChange(firstCity);
                }}
                style={{
                  width: '100%',
                  height: 36,
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '0 8px',
                  fontSize: 13,
                }}
              >
                {countries.map(country => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            {/* City search filter */}
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <input
                type="text"
                placeholder="Search city..."
                value={cityFilter}
                onChange={e => setCityFilter(e.target.value)}
                style={{
                  width: '100%',
                  height: 34,
                  padding: '0 10px',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  fontSize: 13,
                }}
              />
            </div>

            {/* City list */}
            <div style={{ maxHeight: 180, overflowY: 'auto' }}>
              {filteredCities.map(c => (
                <div
                  key={c}
                  onClick={() => {
                    onCityChange(c);
                    setIsCityOpen(false);
                    setCityFilter('');
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: 'pointer',
                    color: c === selectedCity ? 'var(--accent-ink)' : 'var(--text)',
                    background: c === selectedCity ? 'var(--accent)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{c}</span>
                  {c === selectedCity && <Check size={14} strokeWidth={2} />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Segment 2: Price (Any, 1, 2, 3, 4) */}
      <div
        style={{
          background: 'var(--surface)',
          padding: '10px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Price Range
          </span>
          {isPriceOverriddenByPreset && (
            <span style={{ fontSize: 10, color: 'var(--warn)', fontFamily: 'Inter, sans-serif' }}>
              Set by preset
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {priceOptions.map(opt => {
            const isActive = selectedPrice === opt.value;
            return (
              <button
                key={opt.label}
                disabled={isPriceOverriddenByPreset}
                onClick={() => onPriceChange(opt.value)}
                title={opt.tooltip}
                aria-label={opt.tooltip}
                style={{
                  flex: '1 1 auto',
                  height: 32,
                  padding: '0 8px',
                  borderRadius: 6,
                  border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: isActive ? 'var(--accent)' : 'var(--surface-2)',
                  color: isActive ? 'var(--accent-ink)' : 'var(--text)',
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 500,
                  cursor: isPriceOverriddenByPreset ? 'not-allowed' : 'pointer',
                  opacity: isPriceOverriddenByPreset ? 0.6 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', marginTop: 4 }}>
          Price tiers are relative to each country
        </div>
      </div>

      {/* Segment 3: Cuisines (multi-select popover) */}
      <div
        ref={cuisineDropdownRef}
        style={{
          background: 'var(--surface)',
          padding: '10px 16px',
          position: 'relative',
        }}
      >
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Cuisines ({selectedCuisines.length})
        </div>
        <div
          onClick={() => setIsCuisineOpen(!isCuisineOpen)}
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 4,
          }}
        >
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: selectedCuisines.length ? 'var(--text)' : 'var(--text-muted)' }}>
              {selectedCuisines.length ? selectedCuisines.join(', ') : 'All cuisines'}
            </span>
          </div>
          <ChevronDown size={16} strokeWidth={1.5} color="var(--text-muted)" />
        </div>

        {/* Cuisine Popover */}
        {isCuisineOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              width: 320,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 12,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              zIndex: 50,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                Cuisines in {selectedCity}
              </span>
              {selectedCuisines.length > 0 && (
                <button
                  onClick={() => onCuisinesChange([])}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  Clear all
                </button>
              )}
            </div>

            <div style={{ marginBottom: 8 }}>
              <input
                type="text"
                placeholder="Search cuisines..."
                value={cuisineFilter}
                onChange={e => setCuisineFilter(e.target.value)}
                style={{
                  width: '100%',
                  height: 32,
                  padding: '0 8px',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  fontSize: 12,
                }}
              />
            </div>

            <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filteredCuisines.map(c => {
                const checked = selectedCuisines.includes(c);
                return (
                  <div
                    key={c}
                    onClick={() => toggleCuisine(c)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      borderRadius: 6,
                      fontSize: 13,
                      cursor: 'pointer',
                      background: checked ? 'var(--surface)' : 'transparent',
                      color: checked ? 'var(--accent-deep)' : 'var(--text)',
                      fontWeight: checked ? 600 : 400,
                    }}
                  >
                    <span>{c}</span>
                    {checked && <Check size={14} strokeWidth={2} />}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Segment 4: Find Button */}
      <div
        className="search-bar-seg-4"
        style={{
          background: 'var(--surface)',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <button
          onClick={onFind}
          className="search-bar-find-btn"
          style={{
            height: 44,
            padding: '0 24px',
            background: 'var(--accent)',
            color: 'var(--accent-ink)',
            border: 'none',
            borderRadius: 8,
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            whiteSpace: 'nowrap',
          }}
        >
          <Search size={16} strokeWidth={2} />
          Find
        </button>
      </div>
    </div>
  );
}
