import { useState, useMemo, useEffect } from 'react';
import { useRestaurants } from '@/context/RestaurantContext';
import { groupRecommend } from '@/lib/groupRecommendation';
import { planOwambeCrawl } from '@/lib/owambeCrawlPlanner';
import { useDataSaver } from '@/context/DataSaverContext';
import RestaurantDrawer from '@/components/drawer/RestaurantDrawer';
import CuisineIcon from '@/components/common/CuisineIcon';
import type { ScoredRestaurant } from '@/types/recommendation';
import {
  Users,
  PartyPopper,
  Share2,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Moon,
  Salad,
  Leaf,
  Footprints,
  Banknote,
  Flame,
  UtensilsCrossed,
  Wine,
  Sparkles,
} from 'lucide-react';
import { DEFAULT_COUNTRY_NAME } from '@/config/defaults';
import { computeLargestCity } from '@/lib/dataLoader';
import { useLanguage } from '@/context/LanguageContext';

function renderStageIcon(stageName: string) {
  const s = stageName.toLowerCase();
  if (s.includes('suya') || s.includes('pre-drinks')) return <Flame size={20} color="var(--accent-deep)" />;
  if (s.includes('dinner') || s.includes('owambe') || s.includes('main')) return <UtensilsCrossed size={20} color="var(--accent-deep)" />;
  if (s.includes('lounge') || s.includes('bar')) return <Wine size={20} color="var(--accent-deep)" />;
  if (s.includes('chill') || s.includes('nightcap')) return <Moon size={20} color="var(--accent-deep)" />;
  return <Sparkles size={20} color="var(--accent-deep)" />;
}

export default function GroupView() {
  const { data, countryCityIndex, getCuisines } = useRestaurants();
  const { isDataSaver, dataSavedKB } = useDataSaver();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'consensus' | 'owambe'>('consensus');

  const [country, setCountry] = useState<string>(DEFAULT_COUNTRY_NAME);
  const [city, setCity] = useState('');
  const [priceRange, setPriceRange] = useState<(1 | 2 | 3 | 4) | null>(null);

  // Dynamically synchronize country and city when index loads
  useEffect(() => {
    if (Object.keys(countryCityIndex).length === 0) return;
    const available = countryCityIndex[country] || [];
    if (!available.includes(city) && available.length > 0) {
      const largest = computeLargestCity(data, country) || available[0];
      setCity(largest);
    }
  }, [countryCityIndex, country, city, data]);

  // Consensus mode states
  const [cuisinesA, setCuisinesA] = useState<string[]>(['Nigerian', 'Fast Food']);
  const [cuisinesB, setCuisinesB] = useState<string[]>(['African', 'Grill']);

  // Owambe Crawl mode states (Feature 8)
  const [crawlStopsCount, setCrawlStopsCount] = useState<2 | 3 | 4>(3);
  const [selectedCrawlLocality, setSelectedCrawlLocality] = useState<string | null>(null);
  const [crawlDiets, setCrawlDiets] = useState<{
    halal: boolean;
    vegetarian: boolean;
    vegan: boolean;
  }>({
    halal: false,
    vegetarian: false,
    vegan: false,
  });
  const [copiedCrawl, setCopiedCrawl] = useState(false);

  const [drawerRestaurant, setDrawerRestaurant] = useState<ScoredRestaurant | null>(null);

  const countries = Object.keys(countryCityIndex).sort();
  const cities = countryCityIndex[country] || [];
  const cityCuisines = getCuisines(city);

  const cityRestaurants = useMemo(() => {
    return data.filter((r) => r.country === country && r.city === city);
  }, [data, country, city]);

  // Localities with >= 2 places in this city
  const crawlLocalities = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of cityRestaurants) {
      if (r.locality) {
        counts[r.locality] = (counts[r.locality] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([loc]) => loc);
  }, [cityRestaurants]);

  // Consensus recommendation results
  const consensusResults = useMemo(() => {
    if (data.length === 0 || !country || !city) return [];
    return groupRecommend(data, country, city, cuisinesA, cuisinesB, priceRange, 8);
  }, [data, country, city, cuisinesA, cuisinesB, priceRange]);

  // Owambe Crawl Plan results
  const crawlPlan = useMemo(() => {
    if (cityRestaurants.length === 0) return null;
    return planOwambeCrawl(cityRestaurants, city, {
      stopsCount: crawlStopsCount,
      locality: selectedCrawlLocality,
      maxPrice: priceRange,
      diets: crawlDiets,
    });
  }, [cityRestaurants, city, crawlStopsCount, selectedCrawlLocality, priceRange, crawlDiets]);

  const toggleCuisine = (person: 'A' | 'B', c: string) => {
    if (person === 'A') {
      setCuisinesA((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
    } else {
      setCuisinesB((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
    }
  };

  const handleCopyCrawl = async () => {
    if (!crawlPlan) return;
    try {
      await navigator.clipboard.writeText(crawlPlan.waMessage);
      setCopiedCrawl(true);
      setTimeout(() => setCopiedCrawl(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <section style={{ paddingTop: 48, paddingBottom: 20 }}>
        {/* Mode Selector Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setActiveTab('consensus')}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              border: activeTab === 'consensus' ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: activeTab === 'consensus' ? 'var(--accent)' : 'var(--surface-2)',
              color: activeTab === 'consensus' ? 'var(--accent-ink)' : 'var(--text)',
              transition: 'all 150ms ease',
            }}
          >
            <Users size={15} />
            <span>Consensus Matcher</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('owambe')}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              border: activeTab === 'owambe' ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: activeTab === 'owambe' ? 'var(--accent)' : 'var(--surface-2)',
              color: activeTab === 'owambe' ? 'var(--accent-ink)' : 'var(--text)',
              transition: 'all 150ms ease',
            }}
          >
            <PartyPopper size={15} />
            <span>Owambe / Food Crawl</span>
          </button>

          {isDataSaver && (
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                color: '#10b981',
                fontWeight: 600,
              }}
            >
              <ShieldCheck size={14} />
              Data Saver Active (~{dataSavedKB} KB saved)
            </span>
          )}
        </div>

        <h1
          style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontWeight: 600,
            fontSize: 'clamp(30px, 4.5vw, 48px)',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            color: 'var(--text)',
            margin: 0,
          }}
        >
          {activeTab === 'consensus' ? t('group_hero_title') : 'Owambe & Food Crawl Planner'}
        </h1>

        <p
          style={{
            fontSize: 15,
            lineHeight: '22px',
            color: 'var(--text-muted)',
            fontFamily: 'Inter, sans-serif',
            marginTop: 8,
            maxWidth: 680,
          }}
        >
          {activeTab === 'consensus'
            ? "Can't agree on what to eat? Each person selects their preferred cuisines. We rank restaurants to maximize happiness for both parties."
            : 'Planning an evening out with friends or colleagues? Build a multi-stop crawl in one neighbourhood (Pre-drinks/Suya spot ➔ Main Dinner ➔ Late-night bar/dessert) with route order and WhatsApp sharing!'}
        </p>

        {/* Shared Controls Row */}
        <div
          style={{
            marginTop: 20,
            padding: 16,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {/* Country */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Country
            </span>
            <select
              value={country}
              onChange={(e) => {
                const newC = e.target.value;
                setCountry(newC);
                const firstCity = countryCityIndex[newC]?.[0] || '';
                setCity(firstCity);
              }}
              style={{
                height: 38,
                padding: '0 10px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
                fontSize: 13,
              }}
            >
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* City */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              City
            </span>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              style={{
                height: 38,
                padding: '0 10px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
                fontSize: 13,
              }}
            >
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Shared Price */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Budget / Price Limit
            </span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[
                { label: 'Any', value: null },
                { label: 'Budget ●', value: 1 },
                { label: 'Moderate ●●', value: 2 },
                { label: 'Upscale ●●●', value: 3 },
                { label: 'Premium ●●●●', value: 4 },
              ].map((opt) => {
                const isActive = priceRange === opt.value;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setPriceRange(opt.value as (1 | 2 | 3 | 4) | null)}
                    style={{
                      height: 38,
                      padding: '0 10px',
                      borderRadius: 8,
                      border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: isActive ? 'var(--accent)' : 'var(--surface-2)',
                      color: isActive ? 'var(--accent-ink)' : 'var(--text)',
                      fontSize: 12,
                      fontWeight: isActive ? 600 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── TAB 1: Consensus Mode UI ─── */}
        {activeTab === 'consensus' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 20,
              marginTop: 20,
            }}
          >
            {/* Person A */}
            <div
              style={{
                padding: 20,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>
                  Person A Preferences
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {cuisinesA.length} selected
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                {cityCuisines.map((c) => {
                  const isSelected = cuisinesA.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCuisine('A', c)}
                      style={{
                        height: 30,
                        padding: '0 10px',
                        borderRadius: 999,
                        border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                        background: isSelected ? 'var(--accent)' : 'var(--surface-2)',
                        color: isSelected ? 'var(--accent-ink)' : 'var(--text)',
                        fontSize: 12,
                        fontWeight: isSelected ? 600 : 400,
                        cursor: 'pointer',
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Person B */}
            <div
              style={{
                padding: 20,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>
                  Person B Preferences
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {cuisinesB.length} selected
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                {cityCuisines.map((c) => {
                  const isSelected = cuisinesB.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCuisine('B', c)}
                      style={{
                        height: 30,
                        padding: '0 10px',
                        borderRadius: 999,
                        border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                        background: isSelected ? 'var(--accent)' : 'var(--surface-2)',
                        color: isSelected ? 'var(--accent-ink)' : 'var(--text)',
                        fontSize: 12,
                        fontWeight: isSelected ? 600 : 400,
                        cursor: 'pointer',
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: Owambe Crawl Mode Setup UI (Feature 8) ─── */}
        {activeTab === 'owambe' && (
          <div
            style={{
              marginTop: 20,
              padding: 20,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
              {/* Stops Count */}
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                  Number of Stops
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { count: 2 as const, label: '2 Stops (Quick Run)' },
                    { count: 3 as const, label: '3 Stops (Standard Crawl)' },
                    { count: 4 as const, label: '4 Stops (Full Night Out)' },
                  ].map((s) => {
                    const isSelected = crawlStopsCount === s.count;
                    return (
                      <button
                        key={s.count}
                        type="button"
                        onClick={() => setCrawlStopsCount(s.count)}
                        style={{
                          height: 34,
                          padding: '0 12px',
                          borderRadius: 8,
                          border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                          background: isSelected ? 'var(--accent)' : 'var(--surface-2)',
                          color: isSelected ? 'var(--accent-ink)' : 'var(--text)',
                          fontSize: 12,
                          fontWeight: isSelected ? 600 : 500,
                          cursor: 'pointer',
                        }}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Neighbourhood / Locality */}
              {crawlLocalities.length > 0 && (
                <div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                    Neighbourhood
                  </span>
                  <select
                    value={selectedCrawlLocality || ''}
                    onChange={(e) => setSelectedCrawlLocality(e.target.value || null)}
                    style={{
                      height: 34,
                      padding: '0 10px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      color: 'var(--text)',
                      fontSize: 13,
                    }}
                  >
                    <option value="">Any neighbourhood in {city}</option>
                    {crawlLocalities.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Dietary Restrictions */}
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                Dietary Requirements
              </span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { key: 'halal' as const, label: 'Halal Friendly', icon: Moon },
                  { key: 'vegetarian' as const, label: 'Vegetarian', icon: Salad },
                  { key: 'vegan' as const, label: 'Vegan', icon: Leaf },
                ].map((d) => {
                  const Icon = d.icon;
                  const isChecked = crawlDiets[d.key];
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() =>
                        setCrawlDiets((prev) => ({ ...prev, [d.key]: !prev[d.key] }))
                      }
                      style={{
                        height: 32,
                        padding: '0 12px',
                        borderRadius: 999,
                        border: isChecked ? '1px solid var(--accent)' : '1px solid var(--border)',
                        background: isChecked ? 'var(--accent)' : 'var(--surface-2)',
                        color: isChecked ? 'var(--accent-ink)' : 'var(--text)',
                        fontSize: 12,
                        fontWeight: isChecked ? 600 : 500,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 150ms ease',
                      }}
                    >
                      <Icon size={13} />
                      <span>{d.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ─── TAB 1 RESULTS: Consensus Dining Matches ─── */}
      {activeTab === 'consensus' && (
        <section style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
              Consensus Matches in {city} ({consensusResults.length})
            </h2>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Ranked by min(Match A, Match B), then weighted rating
            </span>
          </div>

          {consensusResults.length === 0 ? (
            <div
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                color: 'var(--text-muted)',
              }}
            >
              No restaurants found matching both criteria in this city. Try relaxing your cuisine or price filters.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 16,
              }}
            >
              {consensusResults.map((r, i) => {
                const rankStr = String(r.rank || i + 1).padStart(2, '0');

                return (
                  <article
                    key={r.uid}
                    onClick={() => {
                      const scored: ScoredRestaurant = {
                        ...r,
                        cuisineMatch: (r.matchA + r.matchB) / 2,
                        score: r.hasRating ? r.weighted_rating || 0 : 0,
                        rank: r.rank,
                        whyThisPick: `Matches ${Math.round(r.matchA * 100)}% of Person A and ${Math.round(r.matchB * 100)}% of Person B preferences.`,
                      };
                      setDrawerRestaurant(scored);
                    }}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 20,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      cursor: 'pointer',
                      transition: 'transform 150ms cubic-bezier(0.2,0.8,0.2,1), border-color 150ms',
                    }}
                    className="card-hover"
                  >
                    {/* Top row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: 'var(--surface-2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <CuisineIcon cuisines={r.cuisineList} size={20} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3
                          style={{
                            margin: 0,
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontSize: 16,
                            fontWeight: 600,
                            color: 'var(--text)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {r.restaurant_name}
                        </h3>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                          {r.locality}
                        </p>
                      </div>
                      <span
                        style={{
                          fontFamily: "'Space Grotesk', sans-serif",
                          fontSize: 14,
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                        }}
                      >
                        {rankStr}
                      </span>
                    </div>

                    {/* Twin Match Meters (A & B) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 8 }}>
                      {/* Person A Meter */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', width: 60 }}>
                          Person A
                        </span>
                        <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.round(r.matchA * 100)}%`,
                              background: 'var(--accent)',
                              borderRadius: 3,
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', color: 'var(--text)', width: 34, textAlign: 'right' }}>
                          {Math.round(r.matchA * 100)}%
                        </span>
                      </div>

                      {/* Person B Meter */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', width: 60 }}>
                          Person B
                        </span>
                        <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.round(r.matchB * 100)}%`,
                              background: 'var(--accent)',
                              borderRadius: 3,
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', color: 'var(--text)', width: 34, textAlign: 'right' }}>
                          {Math.round(r.matchB * 100)}%
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ─── TAB 2 RESULTS: Owambe / Food Crawl Itinerary (Feature 8) ─── */}
      {activeTab === 'owambe' && (
        <section style={{ marginTop: 24 }}>
          {!crawlPlan || crawlPlan.stops.length < crawlStopsCount ? (
            <div
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                color: 'var(--text-muted)',
              }}
            >
              Not enough restaurants in {city} matching these neighbourhood / dietary filters for a {crawlStopsCount}-stop crawl. Try selecting &ldquo;Any neighbourhood&rdquo; or a 2-stop run.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Itinerary Summary Header Card */}
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 20,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(200, 240, 60, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-deep)' }}>
                      <PartyPopper size={18} />
                    </div>
                    <h2
                      style={{
                        margin: 0,
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: 20,
                        fontWeight: 600,
                        color: 'var(--text)',
                      }}
                    >
                      {city} ({crawlPlan.neighbourhood}) Food Crawl
                    </h2>
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      fontSize: 13,
                      color: 'var(--text-muted)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Footprints size={14} /> <strong>Route:</strong> ~{crawlPlan.totalDistanceKm} km (~{crawlPlan.totalWalkingMinutes} mins)
                    </span>
                    <span>·</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Banknote size={14} /> <strong>Estimated Cost:</strong> {crawlPlan.estimatedCostText}
                    </span>
                  </div>
                </div>

                {/* WhatsApp & Copy Share Actions */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={handleCopyCrawl}
                    style={{
                      height: 38,
                      padding: '0 14px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: 'var(--surface-2)',
                      color: 'var(--text)',
                      fontSize: 13,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                    }}
                  >
                    {copiedCrawl ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
                    <span>{copiedCrawl ? 'Copied!' : 'Copy'}</span>
                  </button>

                  <a
                    href={crawlPlan.waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      height: 38,
                      padding: '0 16px',
                      borderRadius: 8,
                      background: '#10b981',
                      color: '#ffffff',
                      fontSize: 13,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      textDecoration: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Share2 size={15} />
                    <span>Share via WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Crawl Stops Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {crawlPlan.stops.map((stop, index) => {
                  const r = stop.restaurant;
                  const isLast = index === crawlPlan.stops.length - 1;

                  return (
                    <div key={r.uid} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {/* Stop Card */}
                      <div
                        onClick={() => {
                          const scored: ScoredRestaurant = {
                            ...r,
                            cuisineMatch: 1,
                            score: r.hasRating ? r.weighted_rating || 0 : 0,
                            rank: stop.stageNumber,
                            whyThisPick: `Stop ${stop.stageNumber} on your Owambe food crawl: ${stop.stageName}`,
                          };
                          setDrawerRestaurant(scored);
                        }}
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 12,
                          padding: 18,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 16,
                          cursor: 'pointer',
                          transition: 'all 150ms ease',
                        }}
                        className="card-hover"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 12,
                              background: 'var(--surface-2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {renderStageIcon(stop.stageName)}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                  color: 'var(--accent-deep)',
                                }}
                              >
                                Stop {stop.stageNumber}: {stop.stageName}
                              </span>
                            </div>
                            <h3
                              style={{
                                margin: '2px 0 0',
                                fontFamily: "'Space Grotesk', sans-serif",
                                fontSize: 17,
                                fontWeight: 600,
                                color: 'var(--text)',
                              }}
                            >
                              {r.restaurant_name}
                            </h3>
                            <div
                              style={{
                                fontSize: 12,
                                color: 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                marginTop: 2,
                              }}
                            >
                              <MapPin size={12} />
                              <span>{r.locality || r.city}</span>
                              <span>·</span>
                              <span>{r.cuisineList.slice(0, 2).join(', ')}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span
                            style={{
                              fontSize: 12,
                              color: 'var(--text-muted)',
                              fontWeight: 500,
                            }}
                          >
                            {r.average_cost_for_two
                              ? `~₦${r.average_cost_for_two.toLocaleString()}`
                              : 'Cost unlisted'}
                          </span>
                        </div>
                      </div>

                      {/* Route Connector Arrow */}
                      {!isLast && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            paddingLeft: 36,
                            color: 'var(--text-muted)',
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          <ArrowRight size={14} color="var(--accent-deep)" />
                          <span>
                            ➔ ~{crawlPlan.stops[index + 1]?.distanceFromPreviousKm?.toFixed(1)} km (approx {crawlPlan.stops[index + 1]?.walkingMinutesFromPrevious} mins walk/drive)
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Drawer */}
      <RestaurantDrawer
        restaurant={drawerRestaurant}
        onClose={() => setDrawerRestaurant(null)}
        onOpenSimilar={(s) => {
          const scored: ScoredRestaurant = {
            ...s,
            cuisineMatch: 0,
            score: s.hasRating ? s.weighted_rating || 0 : 0,
            rank: 0,
            whyThisPick: '',
          };
          setDrawerRestaurant(scored);
        }}
      />
    </div>
  );
}
