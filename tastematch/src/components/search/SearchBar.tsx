import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, Navigation, Globe, ExternalLink, MapPin, Compass } from 'lucide-react';
import { useRestaurants } from '@/context/RestaurantContext';
import { useCurrency } from '@/context/CurrencyContext';
import { useLocationContext } from '@/context/LocationContext';
import { trackEvent } from '@/lib/analytics';
import { computeLargestCity, getCityCount } from '@/lib/dataLoader';
import { fetchLandmarks } from '@/lib/landmarks';
import type { Landmark } from '@/types/restaurant';
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
    let allCities = list;
    if (selectedCountry === 'Nigeria') {
      const set = new Set(list);
      for (const sc of NIGERIAN_STATE_CAPITALS) {
        set.add(sc.capital);
      }
      allCities = Array.from(set);
    }
    const full = allCities.filter(c => getCityCount(data, c) >= 5).sort((a, b) => a.localeCompare(b));
    const limited = allCities.filter(c => getCityCount(data, c) < 5).sort((a, b) => a.localeCompare(b));
    return [...full, ...limited];
  }, [countryCityIndex, selectedCountry, data]);
  const cityCuisines = getCuisines(selectedCity);

  const [isCityOpen, setIsCityOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'city' | 'country'>('city');
  const [cityFilter, setCityFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');

  const [isCuisineOpen, setIsCuisineOpen] = useState(false);
  const [cuisineFilter, setCuisineFilter] = useState('');

  const {
    location,
    status: geoStatus,
    accuracyLabel,
    statusMessage: geoStatusMessage,
    permissionGuide,
    coverageHonesty,
    requestGpsLocation,
    dismissCoverageHonesty,
    confirmCoverageHonestyCity,
    setManualLocality,
    setManualLandmark,
    setManualPin,
  } = useLocationContext();

  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [pinLatInput, setPinLatInput] = useState('');
  const [pinLonInput, setPinLonInput] = useState('');

  useEffect(() => {
    fetchLandmarks().then(lms => setLandmarks(lms));
  }, []);

  const cityLocalities = useMemo(() => {
    const set = new Set<string>();
    for (const r of data) {
      if (r.country === selectedCountry && r.city === selectedCity && r.locality) {
        set.add(r.locality);
      }
    }
    return Array.from(set).sort();
  }, [data, selectedCountry, selectedCity]);

  const cityLandmarks = useMemo(() => {
    return landmarks.filter(
      l => l.city.toLowerCase() === selectedCity.toLowerCase(),
    );
  }, [landmarks, selectedCity]);

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

  const handleNearMe = async () => {
    trackEvent({ type: 'near_me_click' });
    const code = selectedCountry === 'Nigeria' ? 'NG' : (selectedCountry === 'India' ? 'IN' : 'NG');
    await requestGpsLocation(code, (nearestCity) => {
      onCityChange(nearestCity);
    });
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
              disabled={geoStatus === 'locating'}
              style={{
                width: '100%',
                height: 32,
                borderRadius: 6,
                border: '1px solid var(--accent)',
                background: location?.source === 'gps' ? 'rgba(200, 240, 60, 0.15)' : 'var(--surface)',
                color: 'var(--accent-deep)',
                fontSize: 12,
                fontWeight: 600,
                cursor: geoStatus === 'locating' ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                marginBottom: 6,
              }}
            >
              <Navigation size={13} />
              <span>
                {geoStatus === 'locating'
                  ? 'Finding GPS position...'
                  : geoStatus === 'refining'
                  ? `Refining... (${accuracyLabel || ''})`
                  : location?.source === 'gps'
                  ? `GPS: ${accuracyLabel || 'Active'}`
                  : 'Near me (GPS)'}
              </span>
            </button>

            {/* Geolocation feedback notice */}
            {geoStatusMessage && (
              <div
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  lineHeight: '15px',
                  marginBottom: 6,
                  background: geoStatus === 'error' ? 'rgba(235, 87, 87, 0.1)' : 'rgba(39, 174, 96, 0.1)',
                  color: geoStatus === 'error' ? 'var(--warn)' : '#27ae60',
                  border: `1px solid ${geoStatus === 'error' ? 'rgba(235, 87, 87, 0.2)' : 'rgba(39, 174, 96, 0.2)'}`,
                }}
              >
                {geoStatusMessage}
              </div>
            )}

            {/* Browser permission instructions (2 short lines on denial) */}
            {permissionGuide && (
              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  lineHeight: '16px',
                  marginBottom: 6,
                  background: 'rgba(235, 87, 87, 0.1)',
                  color: 'var(--warn)',
                  border: '1px solid rgba(235, 87, 87, 0.2)',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 2 }}>
                  Location permission denied. {permissionGuide.title}
                </div>
                {permissionGuide.lines.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            )}

            {/* Manual fallbacks that need no GPS */}
            <div style={{ marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => setShowManualFallback(!showManualFallback)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: 11,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Compass size={11} />
                <span>{showManualFallback ? 'Hide manual fallbacks' : 'Manual location (no GPS): Area · Landmark · Pin'}</span>
              </button>

              {showManualFallback && (
                <div
                  style={{
                    marginTop: 6,
                    padding: 8,
                    borderRadius: 6,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  {/* 1. Locality fallback */}
                  {cityLocalities.length > 0 && (
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                        Choose area in {selectedCity}:
                      </label>
                      <select
                        onChange={(e) => {
                          const loc = e.target.value;
                          if (loc) {
                            const matched = data.find(r => r.city === selectedCity && r.locality === loc && r.hasCoords);
                            setManualLocality(loc, matched ? { lat: matched.latitude, lon: matched.longitude } : undefined);
                          }
                        }}
                        style={{
                          width: '100%',
                          height: 28,
                          fontSize: 11,
                          borderRadius: 4,
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                        }}
                      >
                        <option value="">Select area...</option>
                        {cityLocalities.map(loc => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 2. Landmark fallback */}
                  {cityLandmarks.length > 0 && (
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                        Choose landmark in {selectedCity} ({cityLandmarks.length}):
                      </label>
                      <select
                        onChange={(e) => {
                          const lmUid = e.target.value;
                          const lm = cityLandmarks.find(l => l.uid === lmUid);
                          if (lm) setManualLandmark(lm);
                        }}
                        style={{
                          width: '100%',
                          height: 28,
                          fontSize: 11,
                          borderRadius: 4,
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                        }}
                      >
                        <option value="">Select landmark...</option>
                        {cityLandmarks.map(lm => (
                          <option key={lm.uid} value={lm.uid}>{lm.name} ({lm.category})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 3. Map pin coords fallback */}
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                      Drop pin coordinates:
                    </label>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input
                        type="number"
                        step="0.0001"
                        placeholder="Lat"
                        value={pinLatInput}
                        onChange={e => setPinLatInput(e.target.value)}
                        style={{ flex: 1, height: 26, fontSize: 11, padding: '0 4px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                      />
                      <input
                        type="number"
                        step="0.0001"
                        placeholder="Lon"
                        value={pinLonInput}
                        onChange={e => setPinLonInput(e.target.value)}
                        style={{ flex: 1, height: 26, fontSize: 11, padding: '0 4px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const lat = parseFloat(pinLatInput);
                          const lon = parseFloat(pinLonInput);
                          if (!isNaN(lat) && !isNaN(lon)) {
                            setManualPin(lat, lon);
                          }
                        }}
                        style={{
                          padding: '0 8px',
                          height: 26,
                          fontSize: 11,
                          fontWeight: 600,
                          borderRadius: 4,
                          background: 'var(--accent)',
                          color: '#0C0D10',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Set Pin
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

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
                  {filteredCities.map(c => {
                    const count = getCityCount(data, c);
                    const isLimited = count < 5;
                    return (
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
                          gap: 8,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c}</span>
                          {isLimited && (
                            <span
                              style={{
                                fontSize: 10,
                                padding: '1px 5px',
                                borderRadius: 4,
                                background: c === selectedCity ? 'rgba(0,0,0,0.1)' : 'rgba(255, 184, 77, 0.15)',
                                color: c === selectedCity ? 'var(--accent-ink)' : 'var(--warn)',
                                border: c === selectedCity ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(255, 184, 77, 0.3)',
                                whiteSpace: 'nowrap',
                              }}
                              title="Fewer than 5 listings available in this city"
                            >
                              Limited coverage ({count})
                            </span>
                          )}
                        </div>
                        {c === selectedCity && <Check size={14} strokeWidth={2} />}
                      </div>
                    );
                  })}
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
          onClick={() => {
            trackEvent({
              type: 'search',
              city: selectedCity,
              cuisine: selectedCuisines[0],
            });
            onFind();
          }}
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

      {/* Coverage Honesty Modal: When user is > 40 km from nearest city centre */}
      {coverageHonesty && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 24,
              maxWidth: 440,
              width: '100%',
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <MapPin size={22} style={{ color: 'var(--warn)' }} />
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                Coverage Notice
              </h4>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: 13, lineHeight: '20px', color: 'var(--text)' }}>
              You're about <strong>{Math.round(coverageHonesty.distanceKm)} km</strong> from <strong>{coverageHonesty.nearestCity}</strong>. We have no listings near you yet.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  confirmCoverageHonestyCity(coverageHonesty.nearestCity);
                  onCityChange(coverageHonesty.nearestCity);
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'var(--accent)',
                  color: '#0C0D10',
                  fontWeight: 600,
                  fontSize: 13,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                1. Browse {coverageHonesty.nearestCity}
              </button>
              <button
                type="button"
                onClick={() => {
                  dismissCoverageHonesty();
                  setIsCityOpen(true);
                  setActiveTab('city');
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: 13,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                2. Pick another city from list
              </button>
              <a
                href={`https://www.openstreetmap.org/edit#map=16/${coverageHonesty.userCoords.lat}/${coverageHonesty.userCoords.lon}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => dismissCoverageHonesty()}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'transparent',
                  border: '1px dashed var(--border)',
                  color: 'var(--text-muted)',
                  fontSize: 13,
                  textAlign: 'left',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>3. Help add places here (OSM)</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
