import { useState, useMemo, useEffect } from 'react';
import { useRestaurants } from '@/context/RestaurantContext';
import { useLocationContext } from '@/context/LocationContext';
import { recommend, liveScore, DEFAULT_WEIGHTS, type PriorityWeights } from '@/lib/recommendation';
import type { RecommendationQuery, ScoredRestaurant } from '@/types/recommendation';
import type { MoodPreset } from '@/config/presets';
import { DEFAULT_COUNTRY_NAME } from '@/config/defaults';
import { computeLargestCity } from '@/lib/dataLoader';
import SearchBar from '@/components/search/SearchBar';
import PresetChips from '@/components/search/PresetChips';
import MoreOptions from '@/components/search/MoreOptions';
import PlaceTypeChips from '@/components/search/PlaceTypeChips';
import AreaDropdown from '@/components/search/AreaDropdown';
import AmenityChips, { AMENITY_FILTERS } from '@/components/search/AmenityChips';
import PaymentChips, { type PaymentFilterType, PAYMENT_FILTERS } from '@/components/search/PaymentChips';
import MealClockFilter from '@/components/search/MealClockFilter';
import LandmarkFilter from '@/components/search/LandmarkFilter';
import { isOpenNow, isOpenLate, isOpenAtMealSlot, type MealSlot } from '@/lib/openingHours';
import { fetchLandmarks, getLandmarksForCity, filterAndSortByLandmark } from '@/lib/landmarks';
import type { Landmark } from '@/types/restaurant';
import { matchDishOrKeyword } from '@/lib/dishSearch';
import RestaurantCard from '@/components/card/RestaurantCard';
import RestaurantMap from '@/components/map/RestaurantMap';
import RestaurantDrawer from '@/components/drawer/RestaurantDrawer';
import FoodRunModal from '@/components/modals/FoodRunModal';
import AddPlaceModal from '@/components/modals/AddPlaceModal';
import StateCapitalSwitcher from '@/components/search/StateCapitalSwitcher';
import { NIGERIAN_STATE_CAPITALS } from '@/config/nigerianCapitals';
import { CompareTray, CompareModal } from '@/components/compare/CompareComponents';
import AreaFoodFingerprint from '@/components/search/AreaFoodFingerprint';
import {
  AlertTriangle,
  Info,
  Map,
  ChevronDown,
  CheckCircle2,
  Search,
  Building2,
  PlusCircle,
  ExternalLink,
  Lock,
  Zap,
  MapPin,
  UtensilsCrossed,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function DiscoverView() {
  const { data, loading, countryCityIndex, getCityCapabilities } = useRestaurants();
  const { location } = useLocationContext();
  const { t } = useLanguage();

  // Feature 9 & 10 Modal states
  const [isAddPlaceOpen, setIsAddPlaceOpen] = useState(false);
  const [isCapitalsOpen, setIsCapitalsOpen] = useState(false);
  const [showGapsOnly, setShowGapsOnly] = useState(false);


  // Selected filters
  const [country, setCountry] = useState<string>(() => {
    try {
      return localStorage.getItem('tm-saved-country') || DEFAULT_COUNTRY_NAME;
    } catch {
      return DEFAULT_COUNTRY_NAME;
    }
  });
  const [city, setCity] = useState<string>(() => {
    try {
      return localStorage.getItem('tm-saved-city') || '';
    } catch {
      return '';
    }
  });
  const [priceRange, setPriceRange] = useState<(1 | 2 | 3 | 4) | null>(null);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [needsTableBooking, setNeedsTableBooking] = useState(false);
  const [needsOnlineDelivery, setNeedsOnlineDelivery] = useState(false);
  const [activePreset, setActivePreset] = useState<MoodPreset | null>(null);
  const [selectedPlaceType, setSelectedPlaceType] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentFilterType | null>(null);
  const [dishQuery, setDishQuery] = useState('');

  // Feature 3: Naija Meal Clock states
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [openLateOnly, setOpenLateOnly] = useState(false);
  const [selectedMealSlot, setSelectedMealSlot] = useState<MealSlot | null>(null);

  // Feature 4: Near a Landmark states
  const [allLandmarks, setAllLandmarks] = useState<Landmark[]>([]);
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);
  const [selectedLandmarkRadiusKm, setSelectedLandmarkRadiusKm] = useState<number>(2.0);

  // Engine controls: Mode, Proximity Radius, Diversification
  const [mode, setMode] = useState<'strict' | 'flexible'>('flexible');
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [diversificationLambda, setDiversificationLambda] = useState(0.85);

  // Live priority sliders
  const [weights, setWeights] = useState<PriorityWeights>(DEFAULT_WEIGHTS);

  // Pagination / topN
  const [topN, setTopN] = useState(3);

  // Interactive sync states
  const [hoveredId, setHoveredId] = useState<string | number | null>(null);
  const [drawerRestaurant, setDrawerRestaurant] = useState<ScoredRestaurant | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isMobileMapOpen, setIsMobileMapOpen] = useState(false);
  const [foodRunRestaurant, setFoodRunRestaurant] = useState<ScoredRestaurant | null>(null);
  const [isFoodRunOpen, setIsFoodRunOpen] = useState(false);

  // Ensure default country & city match when index loads (first visit dynamically chooses largest city)
  useEffect(() => {
    if (Object.keys(countryCityIndex).length > 0) {
      if (!countryCityIndex[country]) {
        const firstC = Object.keys(countryCityIndex)[0];
        setCountry(firstC);
        const largest = computeLargestCity(data, firstC) || countryCityIndex[firstC]?.[0] || '';
        setCity(largest);
      } else if (!city) {
        const savedCity = typeof window !== 'undefined' ? localStorage.getItem('tm-saved-city') : null;
        if (savedCity && countryCityIndex[country].includes(savedCity)) {
          setCity(savedCity);
        } else {
          const largest = computeLargestCity(data, country) || countryCityIndex[country]?.[0] || '';
          setCity(largest);
        }
      } else {
        const isKnownCapital = country === 'Nigeria' && NIGERIAN_STATE_CAPITALS.some(sc => sc.capital.toLowerCase() === city.toLowerCase());
        if (!countryCityIndex[country].includes(city) && !isKnownCapital) {
          const largest = computeLargestCity(data, country) || countryCityIndex[country]?.[0] || '';
          setCity(largest);
        }
      }
    }
  }, [countryCityIndex, data, country, city]);

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
      userLocation: location
        ? { latitude: location.lat, longitude: location.lon, source: location.source }
        : undefined,
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
    location,
  ]);

  // Live re-ranking over qualifyingPool using priority sliders (amendment 1)
  const rankedRestaurants = useMemo(() => {
    if (!recommendation) return [];

    const pool = recommendation.qualifyingPool.map(r => ({
      ...r,
      _liveScore: liveScore(r, weights),
    }));

    const isRatedCity = recommendation.scoringMode === 'rated';

    pool.sort((a, b) => {
      const scoreDiff = isRatedCity ? b._liveScore - a._liveScore : b.score - a.score;
      if (Math.abs(scoreDiff) > 1e-6) return scoreDiff;
      if (isRatedCity) {
        const vDiff = (b.votes || 0) - (a.votes || 0);
        if (vDiff !== 0) return vDiff;
      }
      return String(a.uid ?? a.restaurant_id ?? '').localeCompare(String(b.uid ?? b.restaurant_id ?? ''));
    });

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

  // Load real OpenStreetMap landmarks on mount
  useEffect(() => {
    fetchLandmarks().then(lms => setAllLandmarks(lms));
  }, []);

  // Filter landmarks for current city
  const cityLandmarks = useMemo(() => {
    return getLandmarksForCity(allLandmarks, city);
  }, [allLandmarks, city]);

  const unlistedHoursCount = useMemo(() => {
    return cityRestaurants.filter(r => !r.opening_hours).length;
  }, [cityRestaurants]);

  // Feature 8: Count places missing core details (cuisine, hours, or phone)
  const gapsCount = useMemo(() => {
    return cityRestaurants.filter(
      r => r.data_source === 'OpenStreetMap' && (!r.cuisines || !r.opening_hours || !r.phone)
    ).length;
  }, [cityRestaurants]);

  // Filter ranked pool by dish/text search, payment, area, place type, amenities, meal clock & landmarks
  const filteredRankedRestaurants = useMemo(() => {
    let pool = rankedRestaurants;

    // Feature 8: Map Gaps filter
    if (showGapsOnly) {
      pool = pool.filter(
        r => r.data_source === 'OpenStreetMap' && (!r.cuisines || !r.opening_hours || !r.phone)
      );
    }

    // Feature 1: Dish-first search (Nigerian food dictionary + text match)
    if (dishQuery.trim()) {
      const matchedPool: typeof pool = [];
      for (const r of pool) {
        const match = matchDishOrKeyword(r, dishQuery);
        if (match) {
          matchedPool.push({
            ...r,
            matchReason: match.text,
          });
        }
      }
      pool = matchedPool;
    }


    // Feature 2: Pay-how filter from real payment:* tags only
    if (selectedPayment) {
      const payDef = PAYMENT_FILTERS.find(p => p.id === selectedPayment);
      if (payDef) {
        pool = pool.filter(r => payDef.check(r));
      }
    }

    if (selectedPlaceType) {
      pool = pool.filter(r => r.place_type === selectedPlaceType);
    }
    if (selectedArea) {
      pool = pool.filter(r => r.locality === selectedArea);
    }
    if (selectedAmenities.length > 0) {
      pool = pool.filter(r => {
        return selectedAmenities.every(aId => {
          const def = AMENITY_FILTERS.find(d => d.id === aId);
          return def ? def.check(r) : true;
        });
      });
    }

    // Feature 3: Naija Meal Clock filter in Africa/Lagos time (WAT)
    if (openNowOnly) {
      pool = pool.filter(r => r.opening_hours && isOpenNow(r.opening_hours) === true);
    }
    if (openLateOnly) {
      pool = pool.filter(r => r.opening_hours && isOpenLate(r.opening_hours) === true);
    }
    if (selectedMealSlot) {
      if (selectedMealSlot === 'morning') {
        pool = pool.filter(
          r => r.place_type === 'cafe' || r.place_type === 'bakery' || (r.opening_hours && isOpenAtMealSlot(r.opening_hours, 'morning') === true)
        );
      } else if (selectedMealSlot === 'late-night') {
        pool = pool.filter(
          r => r.place_type === 'bar' || r.place_type === 'pub' || r.place_type === 'fast_food' || (r.opening_hours && isOpenAtMealSlot(r.opening_hours, 'late-night') === true)
        );
      } else if (selectedMealSlot === 'afternoon') {
        pool = pool.filter(
          r => (r.opening_hours ? isOpenAtMealSlot(r.opening_hours, 'afternoon') === true : true)
        );
      } else if (selectedMealSlot === 'evening') {
        pool = pool.filter(
          r => (r.opening_hours ? isOpenAtMealSlot(r.opening_hours, 'evening') === true : true)
        );
      }
    }

    // Feature 4: Near a landmark
    if (selectedLandmark) {
      const landmarkFiltered = filterAndSortByLandmark(pool, selectedLandmark, selectedLandmarkRadiusKm);
      pool = landmarkFiltered.map(({ place, distanceKm }, idx) => ({
        ...place,
        rank: idx + 1,
        distanceFromLandmark: {
          landmarkName: selectedLandmark.name,
          distanceKm,
        },
      }));
    }

    return pool;
  }, [
    rankedRestaurants,
    dishQuery,
    selectedPayment,
    selectedPlaceType,
    selectedArea,
    selectedAmenities,
    openNowOnly,
    openLateOnly,
    selectedMealSlot,
    selectedLandmark,
    selectedLandmarkRadiusKm,
    showGapsOnly,
  ]);


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

        {/* Dish-First Search Box (Feature 1) */}
        <div style={{ marginTop: 24, maxWidth: 640 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '0 12px',
              gap: 8,
            }}
          >
            <Search size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            <input
              type="text"
              placeholder={t('search_placeholder')}
              value={dishQuery}
              onChange={e => setDishQuery(e.target.value)}

              style={{
                width: '100%',
                height: 42,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 14,
                color: 'var(--text)',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            />
            {dishQuery && (
              <button
                type="button"
                onClick={() => setDishQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: 12,
                  cursor: 'pointer',
                  padding: '4px 6px',
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Dish Suggestion Chips (Nigerian specialties) */}
          {country === 'Nigeria' && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Popular:
              </span>
              {['Jollof', 'Suya', 'Amala', 'Egusi', 'Shawarma', 'Pepper Soup', 'Asun', 'Small Chops', 'Buka'].map(dish => {
                const isActive = dishQuery.toLowerCase() === dish.toLowerCase();
                return (
                  <button
                    key={dish}
                    type="button"
                    onClick={() => setDishQuery(isActive ? '' : dish)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 999,
                      fontSize: 11,
                      border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: isActive ? 'var(--accent)' : 'var(--surface-2)',
                      color: isActive ? 'var(--accent-ink)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontWeight: isActive ? 600 : 500,
                    }}
                  >
                    {dish}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Feature 10 & 9: State Capitals Switcher & Add a Place toolbar */}
        {country === 'Nigeria' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              marginTop: 16,
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={() => setIsCapitalsOpen(true)}
              style={{
                height: 34,
                padding: '0 12px',
                borderRadius: 8,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 120ms ease',
              }}
            >
              <Building2 size={14} color="var(--accent)" />
              <span>{t('state_capitals_title')}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddPlaceOpen(true)}
              style={{
                height: 34,
                padding: '0 12px',
                borderRadius: 8,
                background: 'rgba(200, 240, 60, 0.12)',
                border: '1px solid var(--accent)',
                color: 'var(--accent-deep)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 120ms ease',
              }}
            >
              <PlusCircle size={14} />
              <span>+ {t('btn_add_place')}</span>
            </button>

          </div>
        )}

        {/* Search Bar */}
        <div style={{ marginTop: country === 'Nigeria' ? 12 : 20 }}>
          <SearchBar
            selectedCountry={country}
            onCountryChange={c => {
              setCountry(c);
              setCuisines([]);
              setSelectedPlaceType(null);
              setSelectedArea(null);
              setSelectedAmenities([]);
              setSelectedPayment(null);
              setDishQuery('');
              setSelectedLandmark(null);
              setOpenNowOnly(false);
              setOpenLateOnly(false);
              setSelectedMealSlot(null);
            }}
            selectedCity={city}
            onCityChange={c => {
              setCity(c);
              setCuisines([]);
              setSelectedPlaceType(null);
              setSelectedArea(null);
              setSelectedAmenities([]);
              setSelectedPayment(null);
              setDishQuery('');
              setSelectedLandmark(null);
              setOpenNowOnly(false);
              setOpenLateOnly(false);
              setSelectedMealSlot(null);
            }}
            selectedPrice={priceRange}
            onPriceChange={val => {
              setPriceRange(val);
              if (activePreset) {
                setActivePreset(null);
              }
            }}
            isPriceOverriddenByPreset={Boolean(activePreset?.priceRangeOverride)}
            selectedCuisines={cuisines}
            onCuisinesChange={setCuisines}
            onFind={() => {
              // Smooth scroll to results
              window.scrollTo({ top: 380, behavior: 'smooth' });
            }}
          />

          {/* Area, Place Type, Amenity, Payment, Meal Clock & Landmark Filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
            {(localityCounts.filter(l => l.count >= 5).length >= 3 || hasOsmData) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
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

            {selectedArea && (
              <AreaFoodFingerprint
                areaName={selectedArea}
                restaurants={cityRestaurants}
              />
            )}

            <AmenityChips
              cityRestaurants={cityRestaurants}
              selectedAmenities={selectedAmenities}
              onToggleAmenity={id => {
                setSelectedAmenities(prev =>
                  prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                );
              }}
            />

            {/* Feature 2: Pay-How Filter Chips from real payment:* tags only */}
            <PaymentChips
              cityRestaurants={cityRestaurants}
              selectedPayment={selectedPayment}
              onSelectPayment={setSelectedPayment}
            />

            {/* Feature 3: Naija Meal Clock Filter */}
            {hasOsmData && (
              <MealClockFilter
                openNowOnly={openNowOnly}
                onToggleOpenNow={setOpenNowOnly}
                openLateOnly={openLateOnly}
                onToggleOpenLate={setOpenLateOnly}
                selectedMealSlot={selectedMealSlot}
                onSelectMealSlot={setSelectedMealSlot}
                unlistedHoursCount={unlistedHoursCount}
              />
            )}

            {/* Feature 4: Near a Landmark */}
            {hasOsmData && cityLandmarks.length > 0 && (
              <LandmarkFilter
                cityName={city}
                landmarks={cityLandmarks}
                selectedLandmark={selectedLandmark}
                selectedRadiusKm={selectedLandmarkRadiusKm}
                onSelectLandmark={setSelectedLandmark}
                onSelectRadiusKm={setSelectedLandmarkRadiusKm}
              />
            )}
          </div>

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
                {t('unrated_notice').replace('this city', city)}
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
              {mode === 'strict' ? <Lock size={12} /> : <Zap size={12} />}
              <span>{mode === 'strict' ? 'Strict Mode' : 'Flexible Mode'}</span>
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
                <MapPin size={12} />
                <span>Within {radiusKm} km</span>
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

            {/* Feature 8: Map Gaps filter */}
            {hasOsmData && gapsCount > 0 && (
              <button
                type="button"
                onClick={() => setShowGapsOnly(prev => !prev)}
                title="Filter places missing cuisine, hours, or phone to contribute info"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 10px',
                  borderRadius: 999,
                  border: showGapsOnly ? '1px solid #ff6b4a' : '1px solid var(--border)',
                  background: showGapsOnly ? 'rgba(255, 107, 74, 0.15)' : 'var(--surface-2)',
                  color: showGapsOnly ? '#ff6b4a' : 'var(--text-muted)',
                  fontSize: 12,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                }}
              >
                <Search size={12} />
                <span>{showGapsOnly ? 'Data Gaps Only' : 'Data Gaps'} ({gapsCount})</span>
              </button>
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
          (recommendation?.cityRestaurantCount === 0 || !data.some(r => r.city.toLowerCase() === city.toLowerCase())) ? (
            /* Friendly Empty State for Unmapped State Capitals / Cities */
            <div
              style={{
                padding: '56px 24px',
                textAlign: 'center',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                maxWidth: 580,
                margin: '0 auto',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <Map size={48} strokeWidth={1.5} color="var(--accent-deep)" />
              </div>
              <h3
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 20,
                  fontWeight: 600,
                  color: 'var(--text)',
                  margin: '0 0 8px',
                }}
              >
                {city} has 0 places mapped yet on OpenStreetMap
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: 'var(--text-muted)',
                  fontFamily: 'Inter, sans-serif',
                  lineHeight: 1.5,
                  maxWidth: 440,
                  margin: '0 auto 24px',
                }}
              >
                No restaurants or food spots have been mapped for {city} in our OpenStreetMap extract yet.
                Be the first to add one locally, or contribute upstream to OpenStreetMap!
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setIsAddPlaceOpen(true)}
                  style={{
                    height: 40,
                    padding: '0 18px',
                    borderRadius: 8,
                    background: 'var(--accent)',
                    color: 'var(--accent-ink)',
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  <PlusCircle size={15} /> Be the first to add one
                </button>

                <a
                  href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(city + ', Nigeria')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    height: 40,
                    padding: '0 18px',
                    borderRadius: 8,
                    background: 'var(--surface-2)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    fontSize: 13,
                    fontWeight: 500,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>Map {city} on OpenStreetMap</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          ) : (
            /* Standard Filter Empty State */
            <div
              style={{
                padding: '64px 24px',
                textAlign: 'center',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <UtensilsCrossed size={44} strokeWidth={1.5} color="var(--text-muted)" />
              </div>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, color: 'var(--text)', margin: '16px 0 8px' }}>
                No matching restaurants found
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', maxWidth: 400, margin: '0 auto' }}>
                Try selecting "Any price", clearing cuisine filters, or relaxing table booking and delivery needs.
              </p>
            </div>
          )
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
                  key={r.uid}
                  r={r}
                  isHovered={hoveredId === r.uid || (r.restaurant_id !== undefined && hoveredId === r.restaurant_id)}
                  isActive={drawerRestaurant?.uid === r.uid}
                  onHover={() => setHoveredId(r.uid)}
                  onHoverEnd={() => setHoveredId(null)}
                  onOpen={() => setDrawerRestaurant(r)}
                  onSimilar={() => setDrawerRestaurant(r)}
                  onFoodRun={() => {
                    setFoodRunRestaurant(r);
                    setIsFoodRunOpen(true);
                  }}
                  delay={i * 40}
                  distanceFromLandmark={r.distanceFromLandmark}
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
        distanceFromLandmark={drawerRestaurant?.distanceFromLandmark}
        onFoodRun={r => {
          setFoodRunRestaurant(r);
          setIsFoodRunOpen(true);
        }}
        onOpenSimilar={s => {
          const scored = rankedRestaurants.find(r => r.uid === s.uid) || {
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

      {/* Food Run Modal (F6) */}
      <FoodRunModal
        restaurant={foodRunRestaurant}
        isOpen={isFoodRunOpen}
        onClose={() => {
          setIsFoodRunOpen(false);
          setFoodRunRestaurant(null);
        }}
      />

      {/* Feature 9: Add a Food Spot Modal */}
      <AddPlaceModal
        open={isAddPlaceOpen}
        onClose={() => setIsAddPlaceOpen(false)}
        defaultCity={city}
        onPlaceAdded={newPlace => {
          setCity(newPlace.city);
        }}
      />

      {/* Feature 10: State Capital Switcher Modal */}
      <StateCapitalSwitcher
        open={isCapitalsOpen}
        onClose={() => setIsCapitalsOpen(false)}
        selectedCity={city}
        onSelectCity={c => {
          setCity(c);
          setCuisines([]);
          setSelectedPlaceType(null);
          setSelectedArea(null);
          setSelectedAmenities([]);
          setSelectedPayment(null);
          setDishQuery('');
          setSelectedLandmark(null);
          setOpenNowOnly(false);
          setOpenLateOnly(false);
          setSelectedMealSlot(null);
        }}
      />
    </div>
  );
}
