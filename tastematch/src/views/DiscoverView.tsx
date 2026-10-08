import { useState, useMemo, useEffect } from 'react';
import { useRestaurants } from '@/context/RestaurantContext';
import { recommend, liveScore, DEFAULT_WEIGHTS, type PriorityWeights } from '@/lib/recommendation';
import type { RecommendationQuery, ScoredRestaurant } from '@/types/recommendation';
import type { MoodPreset } from '@/config/presets';
import SearchBar from '@/components/search/SearchBar';
import PresetChips from '@/components/search/PresetChips';
import MoreOptions from '@/components/search/MoreOptions';
import PlaceTypeChips from '@/components/search/PlaceTypeChips';
import AreaDropdown from '@/components/search/AreaDropdown';
import RestaurantCard from '@/components/card/RestaurantCard';
import RestaurantMap from '@/components/map/RestaurantMap';
import RestaurantDrawer from '@/components/drawer/RestaurantDrawer';
import { CompareTray, CompareModal } from '@/components/compare/CompareComponents';
import { AlertTriangle, Info, Map, ChevronDown, CheckCircle2 } from 'lucide-react';

export default function DiscoverView() {
  const { data, loading, countryCityIndex, getCityCapabilities } = useRestaurants();

  // Selected filters
  const [country, setCountry] = useState('India');
  const [city, setCity] = useState('New Delhi');
  const [priceRange, setPriceRange] = useState<(1 | 2 | 3 | 4) | null>(2);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [needsTableBooking, setNeedsTableBooking] = useState(false);
  const [needsOnlineDelivery, setNeedsOnlineDelivery] = useState(false);
  const [activePreset, setActivePreset] = useState<MoodPreset | null>(null);
  const [selectedPlaceType, setSelectedPlaceType] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  // Engine controls: Mode, Proximity Radius, Diversification
  const [mode, setMode] = useState<'strict' | 'flexible'>('flexible');
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [diversificationLambda, setDiversificationLambda] = useState(0.85);

  // Live priority sliders
  const [weights, setWeights] = useState<PriorityWeights>(DEFAULT_WEIGHTS);

  // Pagination / topN
  const [topN, setTopN] = useState(3);

  // Interactive sync states
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [drawerRestaurant, setDrawerRestaurant] = useState<ScoredRestaurant | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isMobileMapOpen, setIsMobileMapOpen] = useState(false);

  // Ensure default country & city match when index loads
  useEffect(() => {
    if (Object.keys(countryCityIndex).length > 0) {
      if (!countryCityIndex[country]) {
        const firstC = Object.keys(countryCityIndex)[0];
        setCountry(firstC);
        setCity(countryCityIndex[firstC][0]);
      } else if (!countryCityIndex[country].includes(city)) {
        setCity(countryCityIndex[country][0]);
      }
    }
  }, [countryCityIndex, country, city]);

  const caps = getCityCapabilities(city);

  // Handle active preset overriding price selection
  const effectivePriceRange = useMemo(() => {
    if (activePreset?.minPriceRange && activePreset?.maxPriceRange && activePreset.minPriceRange === activePreset.maxPriceRange) {
      return activePreset.minPriceRange;
    }
    return priceRange;
  }, [activePreset, priceRange]);

  // Run Recommendation Engine
  const recommendation = useMemo(() => {
    if (data.length === 0 || !country || !city) return null;

    const query: RecommendationQuery = {
      country,
      city,
      priceRange: effectivePriceRange,
      cuisines,
      needsTableBooking,
      needsOnlineDelivery,
      topN: 3,
      mode,
      radiusKm,
      diversificationLambda,
    };

    return recommend(data, query, activePreset);
  }, [
    data,
    country,
    city,
    effectivePriceRange,
    cuisines,
    needsTableBooking,
    needsOnlineDelivery,
    activePreset,
    mode,
    radiusKm,
    diversificationLambda,
  ]);

  // Live re-ranking over qualifyingPool using priority sliders (amendment 1)
  const rankedRestaurants = useMemo(() => {
    if (!recommendation) return [];

    const pool = recommendation.qualifyingPool.map(r => ({
      ...r,
      _liveScore: liveScore(r, weights),
    }));

    pool.sort((a, b) => b._liveScore - a._liveScore || (b.votes || 0) - (a.votes || 0));

    return pool.map((r, i) => ({
      ...r,
      rank: i + 1,
    }));
  }, [recommendation, weights]);

  // Places in current city for locality / place_type options
  const cityRestaurants = useMemo(() => {
    return data.filter(r => r.country === country && r.city === city);
  }, [data, country, city]);

  const localityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of cityRestaurants) {
      if (r.locality) {
        counts[r.locality] = (counts[r.locality] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [cityRestaurants]);

  const placeTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of cityRestaurants) {
      if (r.place_type) {
        counts[r.place_type] = (counts[r.place_type] || 0) + 1;
      }
    }
    return counts;
  }, [cityRestaurants]);

  const hasOsmData = useMemo(() => {
    return cityRestaurants.some(r => r.data_source === 'OpenStreetMap');
  }, [cityRestaurants]);

  // Filter ranked pool by area & place type if selected
  const filteredRankedRestaurants = useMemo(() => {
    let pool = rankedRestaurants;
    if (selectedPlaceType) {
      pool = pool.filter(r => r.place_type === selectedPlaceType);
    }
    if (selectedArea) {
      pool = pool.filter(r => r.locality === selectedArea);
    }
    return pool;
  }, [rankedRestaurants, selectedPlaceType, selectedArea]);

  // Sliced for display
  const displayedRestaurants = useMemo(() => {
    return filteredRankedRestaurants.slice(0, topN);
  }, [filteredRankedRestaurants, topN]);

  // Surprise Me Handler
  const handleSurpriseMe = () => {
    if (filteredRankedRestaurants.length === 0) return;
    const randomIdx = Math.floor(Math.random() * filteredRankedRestaurants.length);
    setDrawerRestaurant(filteredRankedRestaurants[randomIdx]);
  };

  const handleShowMore = () => {
    setTopN(prev => Math.min(prev + 3, 10, filteredRankedRestaurants.length));
  };

  return (
    <div className="page-container">
      {/* Hero Section */}
      <section style={{ paddingTop: 96, paddingBottom: 32 }}>
        <h1
          style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontWeight: 600,
            fontSize: 'clamp(40px, 7vw, 72px)',
            lineHeight: 1.02,
            letterSpacing: '-0.03em',
            color: 'var(--text)',
            margin: 0,
          }}
        >
          Where are we eating?
        </h1>
        <p
          style={{
            fontSize: 16,
            lineHeight: '24px',
            color: 'var(--text-muted)',
            fontFamily: 'Inter, sans-serif',
            marginTop: 12,
            maxWidth: 640,
          }}
        >
          {country === 'Nigeria' 
            ? 'Data-driven restaurant recommendations powered by OpenStreetMap data. '
            : 'Data-driven restaurant recommendations powered by Kaggle’s Zomato dataset. '}
          Choose your city, set your preferences, or tune priorities live.
        </p>

        {/* Search Bar */}
        <div style={{ marginTop: 32 }}>
          <SearchBar
            selectedCountry={country}
            onCountryChange={c => {
              setCountry(c);
              setCuisines([]);
              setSelectedPlaceType(null);
              setSelectedArea(null);
            }}
            selectedCity={city}
            onCityChange={c => {
              setCity(c);
              setCuisines([]);
              setSelectedPlaceType(null);
              setSelectedArea(null);
            }}
            selectedPrice={priceRange}
            onPriceChange={setPriceRange}
            isPriceOverriddenByPreset={Boolean(activePreset?.priceRangeOverride)}
            selectedCuisines={cuisines}
            onCuisinesChange={setCuisines}
            onFind={() => {
              // Smooth scroll to results
              window.scrollTo({ top: 380, behavior: 'smooth' });
            }}
          />

          {/* Area & Place Type Filters (OSM / Multi-locality markets) */}
          {(localityCounts.filter(l => l.count >= 5).length >= 3 || hasOsmData) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
              <AreaDropdown
                localities={localityCounts}
                selectedArea={selectedArea}
                onSelectArea={setSelectedArea}
              />
              {hasOsmData && (
                <PlaceTypeChips
                  selectedType={selectedPlaceType}
                  onSelectType={setSelectedPlaceType}
                  counts={placeTypeCounts}
                />
              )}
            </div>
          )}

          {/* Preset Chips */}
          <PresetChips
            activePreset={activePreset}
            onSelectPreset={p => {
              setActivePreset(p);
              if (p?.requireTableBooking) setNeedsTableBooking(true);
              if (p?.requireOnlineDelivery) setNeedsOnlineDelivery(true);
            }}
            onSurpriseMe={handleSurpriseMe}
            caps={caps}
          />

          {/* More Options & Priority Sliders */}
          <MoreOptions
            needsTableBooking={needsTableBooking}
            onTableBookingChange={setNeedsTableBooking}
            needsOnlineDelivery={needsOnlineDelivery}
            onOnlineDeliveryChange={setNeedsOnlineDelivery}
            weights={weights}
            onWeightsChange={setWeights}
            mode={mode}
            onModeChange={setMode}
            radiusKm={radiusKm}
            onRadiusChange={setRadiusKm}
            diversificationLambda={diversificationLambda}
            onDiversificationChange={setDiversificationLambda}
            caps={caps}
          />
        </div>
      </section>

      {/* Main Results View */}
      <section style={{ marginTop: 24 }}>
        {/* Notices and Warnings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          
          {/* Unrated City Banner */}
          {!caps.hasRatings && (
            <div style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '12px 16px',
              display: 'flex',
              gap: 12,
              alignItems: 'center',
            }}>
              <Info size={18} style={{ color: 'var(--accent-deep)' }} />
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                No ratings available for {city}. Results are ordered by cuisine match, nearness and listing completeness, not by quality.
              </p>
            </div>
          )}

          {/* Active Mode and Filter Status Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'Inter, sans-serif',
                background: mode === 'strict' ? 'rgba(200, 240, 60, 0.15)' : 'var(--surface-2)',
                color: mode === 'strict' ? 'var(--accent-deep)' : 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}
            >
              {mode === 'strict' ? '🔒 Strict Mode' : '⚡ Flexible Mode'}
            </span>

            {radiusKm !== null && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 10px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontFamily: 'Inter, sans-serif',
                  background: 'var(--surface-2)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                }}
              >
                📍 Within {radiusKm} km
              </span>
            )}

            {recommendation?.isLimitedData && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 10px',
                  borderRadius: 999,
                  border: '1px solid var(--warn)',
                  color: 'var(--warn)',
                  fontSize: 12,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                }}
              >
                <AlertTriangle size={14} strokeWidth={1.5} />
                <span>Limited data: {recommendation.cityRestaurantCount} restaurants</span>
              </div>
            )}

            {/* Exact match label (amendment 13) */}
            {recommendation?.stage === 'exact_all' && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 10px',
                  borderRadius: 999,
                  border: '1px solid var(--accent)',
                  background: 'var(--surface-2)',
                  color: 'var(--accent-deep)',
                  fontSize: 12,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={13} strokeWidth={2} />
                <span>Exact match</span>
              </div>
            )}
          </div>

          {/* Stage notices */}
          {recommendation?.notice && (
            <div
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
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    lineHeight: '20px',
                    color: 'var(--text)',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {recommendation.notice}
                </p>
                {recommendation.relaxedCriteria && recommendation.relaxedCriteria.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {recommendation.relaxedCriteria.map(item => (
                      <span
                        key={item}
                        style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: 'rgba(255, 184, 77, 0.15)',
                          color: 'var(--warn)',
                          border: '1px solid rgba(255, 184, 77, 0.3)',
                          fontWeight: 500,
                          fontFamily: 'Inter, sans-serif',
                        }}
                      >
                        Relaxed: {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {[1, 2, 3].map(n => (
              <div
                key={n}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 20,
                  height: 240,
                }}
              >
                <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 10, marginBottom: 12 }} />
                <div className="skeleton" style={{ width: '60%', height: 20, borderRadius: 4, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: '40%', height: 14, borderRadius: 4 }} />
              </div>
            ))}
          </div>
        ) : displayedRestaurants.length === 0 ? (
          /* Empty State */
          <div
            style={{
              padding: '64px 24px',
              textAlign: 'center',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
            }}
          >
            <span style={{ fontSize: 40 }}>🍽️</span>
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, color: 'var(--text)', margin: '16px 0 8px' }}>
              No matching restaurants found
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', maxWidth: 400, margin: '0 auto' }}>
              Try selecting "Any price", clearing cuisine filters, or relaxing table booking and delivery needs.
            </p>
          </div>
        ) : (
          /* 2-Column Split View (Cards 55%, Map 45% sticky) */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
              gap: 24,
              alignItems: 'start',
            }}
            className="split-view-container"
          >
            {/* Cards List Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {displayedRestaurants.map((r, i) => (
                <RestaurantCard
                  key={r.restaurant_id}
                  r={r}
                  isHovered={hoveredId === r.restaurant_id}
                  isActive={drawerRestaurant?.restaurant_id === r.restaurant_id}
                  onHover={() => setHoveredId(r.restaurant_id)}
                  onHoverEnd={() => setHoveredId(null)}
                  onOpen={() => setDrawerRestaurant(r)}
                  onSimilar={() => setDrawerRestaurant(r)}
                  delay={i * 40}
                />
              ))}

              {/* Show more button (up to 10) (amendment 1) */}
              {displayedRestaurants.length < filteredRankedRestaurants.length && displayedRestaurants.length < 10 && (
                <button
                  onClick={handleShowMore}
                  style={{
                    height: 44,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text)',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    marginTop: 8,
                  }}
                >
                  <span>Show more ({displayedRestaurants.length} of {Math.min(10, filteredRankedRestaurants.length)})</span>
                  <ChevronDown size={16} strokeWidth={1.5} />
                </button>
              )}
            </div>

            {/* Sticky Map Column (Desktop) */}
            <div
              style={{
                position: 'sticky',
                top: 88,
                height: 'calc(100vh - 112px)',
                borderRadius: 12,
                border: '1px solid var(--border)',
                overflow: 'hidden',
              }}
              className="desktop-map-container"
            >
              <RestaurantMap
                restaurants={displayedRestaurants}
                hoveredId={hoveredId}
                onPinHover={id => setHoveredId(id)}
                onPinHoverEnd={() => setHoveredId(null)}
                onPinClick={r => setDrawerRestaurant(r)}
              />
            </div>
          </div>
        )}
      </section>

      {/* Floating Map Pill Button (Mobile Only) */}
      <div
        className="mobile-map-button"
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 30,
        }}
      >
        <button
          onClick={() => setIsMobileMapOpen(true)}
          style={{
            height: 44,
            padding: '0 20px',
            background: 'var(--accent)',
            color: 'var(--accent-ink)',
            border: 'none',
            borderRadius: 999,
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 600,
            fontSize: 14,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Map size={16} strokeWidth={2} />
          <span>View Map ({displayedRestaurants.filter(r => r.hasCoords).length})</span>
        </button>
      </div>

      {/* Mobile Fullscreen Map Modal */}
      {isMobileMapOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'var(--bg)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              height: 56,
              background: 'var(--surface)',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
            }}
          >
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>
              Map View
            </span>
            <button
              onClick={() => setIsMobileMapOpen(false)}
              style={{
                height: 36,
                padding: '0 14px',
                background: 'var(--accent)',
                color: 'var(--accent-ink)',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <RestaurantMap
              restaurants={displayedRestaurants}
              hoveredId={hoveredId}
              onPinHover={id => setHoveredId(id)}
              onPinHoverEnd={() => setHoveredId(null)}
              onPinClick={r => {
                setDrawerRestaurant(r);
                setIsMobileMapOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      <RestaurantDrawer
        restaurant={drawerRestaurant}
        onClose={() => setDrawerRestaurant(null)}
        onOpenSimilar={s => {
          const scored = rankedRestaurants.find(r => r.restaurant_id === s.restaurant_id) || {
            ...s,
            cuisineMatch: 0,
            score: s.hasRating ? (s.weighted_rating || 0) : 0,
            rank: 0,
            whyThisPick: '',
          };
          setDrawerRestaurant(scored as ScoredRestaurant);
        }}
      />

      {/* Compare Tray & Modal */}
      <CompareTray onCompare={() => setIsCompareOpen(true)} />
      <CompareModal open={isCompareOpen} onClose={() => setIsCompareOpen(false)} />
    </div>
  );
}
