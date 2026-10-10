import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, Navigation, Globe, ExternalLink, MapPin } from 'lucide-react';
import { useRestaurants } from '@/context/RestaurantContext';
import { useCurrency } from '@/context/CurrencyContext';
import { haversineDistance } from '@/lib/location';
import { computeLargestCity } from '@/lib/dataLoader';
import {
  PRICE_TIERS,
  computeCountryTierMedian,
  convertCurrency,
  formatCurrency,
} from '@/lib/currency';
import { NIGERIAN_STATE_CAPITALS } from '@/config/nigerianCapitals';

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

// Accent-insensitive normalization helper
function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const COMMON_ISO_CODES = [
  'NG', 'IN', 'US', 'GB', 'AE', 'ZA', 'BR', 'CA', 'AU', 'NZ', 'SG', 'PH', 'ID', 'QA', 'LK', 'TR',
  'GH', 'KE', 'EG', 'FR', 'DE', 'IT', 'ES', 'JP', 'MX', 'NL', 'SE', 'CH', 'RW', 'UG', 'SN', 'CI', 'TZ', 'ET'
];

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

  const cities = useMemo(() => {
    const list = countryCityIndex[selectedCountry] || [];
    if (selectedCountry === 'Nigeria') {
      const set = new Set(list);
      for (const sc of NIGERIAN_STATE_CAPITALS) {
        set.add(sc.capital);
      }
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    }
    return list;
  }, [countryCityIndex, selectedCountry]);
  const cityCuisines = getCuisines(selectedCity);

  const [isCityOpen, setIsCityOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'city' | 'country'>('city');
  const [cityFilter, setCityFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');

  const [isCuisineOpen, setIsCuisineOpen] = useState(false);
  const [cuisineFilter, setCuisineFilter] = useState('');

  // Geolocation states
  const [isLocating, setIsLocating] = useState(false);
  const [geoNotice, setGeoNotice] = useState<{ text: string; isError?: boolean } | null>(null);

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

  // Intl.DisplayNames for country resolution
  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames(['en'], { type: 'region' });
    } catch {
      return null;
    }
  }, []);

  // Searchable Country Catalog
  const fullCountryCatalog = useMemo(() => {
    const builtMap = new Set(Object.keys(countryCityIndex).map(normalizeText));
    const list: Array<{ code?: string; name: string; isBuilt: boolean; cityCount: number }> = [];

    // 1. Built countries
    for (const name of Object.keys(countryCityIndex).sort()) {
      list.push({
        name,
        isBuilt: true,
        cityCount: countryCityIndex[name]?.length || 0,
      });
    }

    // 2. Additional worldwide countries via Intl.DisplayNames
    if (regionNames) {
      for (const code of COMMON_ISO_CODES) {
        try {
          const name = regionNames.of(code);
          if (name && !builtMap.has(normalizeText(name))) {
            builtMap.add(normalizeText(name));
            list.push({
              code,
              name,
              isBuilt: false,
              cityCount: 0,
            });
          }
        } catch {
          // ignore
        }
      }
    }

    return list.sort((a, b) => {
      if (a.isBuilt !== b.isBuilt) return a.isBuilt ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [countryCityIndex, regionNames]);

  const filteredCountries = useMemo(() => {
    if (!countryFilter.trim()) return fullCountryCatalog;
    const query = normalizeText(countryFilter);
    return fullCountryCatalog.filter(c => normalizeText(c.name).includes(query));
  }, [fullCountryCatalog, countryFilter]);

  const filteredCities = useMemo(() => {
    if (!cityFilter.trim()) return cities;
    const query = normalizeText(cityFilter);
    return cities.filter(c => normalizeText(c).includes(query));
  }, [cities, cityFilter]);

  const filteredCuisines = useMemo(() => {
    if (!cuisineFilter.trim()) return cityCuisines;
    const query = normalizeText(cuisineFilter);
    return cityCuisines.filter(c => normalizeText(c).includes(query));
  }, [cityCuisines, cuisineFilter]);

  const toggleCuisine = (c: string) => {
    if (selectedCuisines.includes(c)) {
      onCuisinesChange(selectedCuisines.filter(item => item !== c));
    } else {
      onCuisinesChange([...selectedCuisines, c]);
    }
  };

  // Near me geolocation handler (click-only, never stores/sends location, handles denial gracefully)
  const handleNearMe = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGeoNotice({ text: 'Geolocation is not supported by your browser.', isError: true });
      return;
    }

    setIsLocating(true);
    setGeoNotice(null);

    navigator.geolocation.getCurrentPosition(
      position => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;

        // Find nearest restaurant in current country with coordinates
        const countryPlaces = data.filter(r => r.country === selectedCountry && r.hasCoords);

        if (countryPlaces.length === 0) {
          setGeoNotice({
            text: `No coordinate locations available for ${selectedCountry}.`,
            isError: true,
          });
          return;
        }

        let nearestCity = countryPlaces[0].city;
        let minDist = Infinity;

        for (const place of countryPlaces) {
          const dist = haversineDistance(latitude, longitude, place.latitude, place.longitude);
          if (dist < minDist) {
            minDist = dist;
            nearestCity = place.city;
          }
        }

        onCityChange(nearestCity);
        try {
          localStorage.setItem('tm-saved-city', nearestCity);
        } catch {
          // ignore
        }
        setGeoNotice({
          text: `Found nearest: ${nearestCity} (~${minDist.toFixed(1)} km)`,
          isError: false,
        });
      },
      error => {
        setIsLocating(false);
        if (error.code === 1) { // PERMISSION_DENIED
          setGeoNotice({
            text: 'Location permission denied. Please choose your city from the list.',
            isError: true,
          });
        } else if (error.code === 3) { // TIMEOUT
          setGeoNotice({
            text: 'Location request timed out. Please choose your city from the list.',
            isError: true,
          });
        } else {
          setGeoNotice({
            text: 'Could not access location. Please choose your city from the list.',
            isError: true,
          });
        }
      },
      { timeout: 8000, maximumAge: 60000, enableHighAccuracy: false },
    );
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
          onClick={() => {
            setIsCityOpen(!isCityOpen);
            setActiveTab('city');
          }}
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

        {/* Location Dropdown Menu */}
        {isCityOpen && (
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
            {/* Tab switch: City vs Country */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <button
                type="button"
                onClick={() => setActiveTab('city')}
                style={{
                  flex: 1,
                  height: 30,
                  borderRadius: 6,
                  border: activeTab === 'city' ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: activeTab === 'city' ? 'var(--accent)' : 'var(--surface)',
                  color: activeTab === 'city' ? 'var(--accent-ink)' : 'var(--text-muted)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <MapPin size={13} />
                <span>Cities</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('country')}
                style={{
                  flex: 1,
                  height: 30,
                  borderRadius: 6,
                  border: activeTab === 'country' ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: activeTab === 'country' ? 'var(--accent)' : 'var(--surface)',
                  color: activeTab === 'country' ? 'var(--accent-ink)' : 'var(--text-muted)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <Globe size={13} />
                <span>Countries</span>
              </button>
            </div>

            {/* "Near me" button (Rule: click only, Haversine, never stores/sends location, graceful denial) */}
            <button
              type="button"
              onClick={handleNearMe}
              disabled={isLocating}
              style={{
                width: '100%',
                height: 32,
                borderRadius: 6,
                border: '1px solid var(--accent)',
                background: 'var(--surface)',
                color: 'var(--accent-deep)',
                fontSize: 12,
                fontWeight: 600,
                cursor: isLocating ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                marginBottom: 8,
              }}
            >
              <Navigation size={13} />
              <span>{isLocating ? 'Detecting nearest city...' : 'Near me (GPS)'}</span>
            </button>

            {/* Geolocation feedback notice */}
            {geoNotice && (
              <div
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  lineHeight: '15px',
                  marginBottom: 8,
                  background: geoNotice.isError ? 'rgba(235, 87, 87, 0.1)' : 'rgba(39, 174, 96, 0.1)',
                  color: geoNotice.isError ? 'var(--warn)' : '#27ae60',
                  border: `1px solid ${geoNotice.isError ? 'rgba(235, 87, 87, 0.2)' : 'rgba(39, 174, 96, 0.2)'}`,
                }}
              >
                {geoNotice.text}
              </div>
            )}

            {/* TAB: CITIES */}
            {activeTab === 'city' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    In {selectedCountry}:
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('country')}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: 'var(--accent-deep)',
                      fontSize: 11,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Change country
                  </button>
                </div>

                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <input
                    type="text"
                    placeholder="Search city (accent-insensitive)..."
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

                <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                  {filteredCities.map(c => (
                    <div
                      key={c}
                      onClick={() => {
                        onCityChange(c);
                        try {
                          localStorage.setItem('tm-saved-city', c);
                        } catch {
                          // ignore
                        }
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
                  {filteredCities.length === 0 && (
                    <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-muted)' }}>
                      No cities match "{cityFilter}"
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: COUNTRIES (Searchable with Intl.DisplayNames, accent-insensitive) */}
            {activeTab === 'country' && (
              <div>
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <input
                    type="text"
                    placeholder="Search country (accent-insensitive)..."
                    value={countryFilter}
                    onChange={e => setCountryFilter(e.target.value)}
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

                <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {filteredCountries.map(c => {
                    const isSelected = c.name === selectedCountry;

                    if (c.isBuilt) {
                      return (
                        <div
                          key={c.name}
                          onClick={() => {
                            onCountryChange(c.name);
                            const largest = computeLargestCity(data, c.name) || countryCityIndex[c.name]?.[0] || '';
                            onCityChange(largest);
                            try {
                              localStorage.setItem('tm-saved-country', c.name);
                              localStorage.setItem('tm-saved-city', largest);
                            } catch {
                              // ignore
                            }
                            setActiveTab('city');
                            setCountryFilter('');
                          }}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 6,
                            fontSize: 13,
                            cursor: 'pointer',
                            color: isSelected ? 'var(--accent-ink)' : 'var(--text)',
                            background: isSelected ? 'var(--accent)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{c.name}</span>
                            <span style={{ fontSize: 11, color: isSelected ? 'inherit' : 'var(--text-muted)' }}>
                              ({c.cityCount} {c.cityCount === 1 ? 'city' : 'cities'})
                            </span>
                          </div>
                          {isSelected && <Check size={14} strokeWidth={2} />}
                        </div>
                      );
                    }

                    // Unbuilt country (Rule: show "Not available yet" with prefilled GitHub issue link)
                    const issueUrl = `https://github.com/Joshcodings/resturant_recommedation/issues/new?title=${encodeURIComponent(`Request country support: ${c.name}`)}&body=${encodeURIComponent(`Please add restaurant coverage for ${c.name}.`)}`;

                    return (
                      <div
                        key={c.name}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 6,
                          fontSize: 12,
                          background: 'var(--surface)',
                          border: '1px dashed var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 6,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 500, color: 'var(--text)' }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Not available yet</div>
                        </div>
                        <a
                          href={issueUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 11,
                            color: 'var(--accent-deep)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            textDecoration: 'none',
                            fontWeight: 600,
                          }}
                        >
                          <span>Request</span>
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    );
                  })}
                  {filteredCountries.length === 0 && (
                    <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-muted)' }}>
                      No countries match "{countryFilter}"
                    </div>
                  )}
                </div>
              </div>
            )}
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
                type="button"
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
                  cursor: 'pointer',
                  opacity: 1,
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
