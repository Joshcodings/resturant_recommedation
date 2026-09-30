import { useState, useMemo } from 'react';
import { useRestaurants } from '@/context/RestaurantContext';
import { groupRecommend } from '@/lib/groupRecommendation';
import { getCuisineEmoji } from '@/config/emojis';
import { formatVotes } from '@/lib/formatters';
import { useCurrency } from '@/context/CurrencyContext';
import { PRICE_TIERS } from '@/lib/currency';
import RestaurantDrawer from '@/components/drawer/RestaurantDrawer';
import type { ScoredRestaurant } from '@/types/recommendation';
import { Users } from 'lucide-react';

export default function GroupView() {
  const { data, countryCityIndex, getCuisines } = useRestaurants();
  const { formatDual } = useCurrency();

  const [country, setCountry] = useState('India');
  const [city, setCity] = useState('New Delhi');
  const [priceRange, setPriceRange] = useState<(1 | 2 | 3 | 4) | null>(null);

  const [cuisinesA, setCuisinesA] = useState<string[]>(['North Indian', 'Chinese']);
  const [cuisinesB, setCuisinesB] = useState<string[]>(['Italian', 'Continental']);

  const [drawerRestaurant, setDrawerRestaurant] = useState<ScoredRestaurant | null>(null);

  const countries = Object.keys(countryCityIndex).sort();
  const cities = countryCityIndex[country] || [];
  const cityCuisines = getCuisines(city);

  // Group recommendation
  const results = useMemo(() => {
    if (data.length === 0 || !country || !city) return [];
    return groupRecommend(data, country, city, cuisinesA, cuisinesB, priceRange, 8);
  }, [data, country, city, cuisinesA, cuisinesB, priceRange]);

  const toggleCuisine = (person: 'A' | 'B', c: string) => {
    if (person === 'A') {
      setCuisinesA(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
    } else {
      setCuisinesB(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px' }}>
      {/* Header */}
      <section style={{ paddingTop: 64, paddingBottom: 24 }}>
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
          <Users size={14} strokeWidth={1.5} color="var(--accent-deep)" />
          <span>Consensus Dining</span>
        </div>
        <h1
          style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontWeight: 600,
            fontSize: 'clamp(32px, 5vw, 56px)',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            color: 'var(--text)',
            margin: 0,
          }}
        >
          Group Consensus Matcher
        </h1>
        <p
          style={{
            fontSize: 15,
            lineHeight: '22px',
            color: 'var(--text-muted)',
            fontFamily: 'Inter, sans-serif',
            marginTop: 8,
            maxWidth: 640,
          }}
        >
          Can't agree on what to eat? Each person selects their preferred cuisines.
          We rank restaurants to maximize happiness for both parties.
        </p>

        {/* Shared Controls Row */}
        <div
          style={{
            marginTop: 24,
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
              onChange={e => {
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
              {countries.map(c => (
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
              onChange={e => setCity(e.target.value)}
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
              {cities.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Shared Price */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Price Range
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { label: 'Any', value: null },
                { label: 'Budget ●', value: 1 },
                { label: 'Moderate ●●', value: 2 },
                { label: 'Upscale ●●●', value: 3 },
                { label: 'Premium ●●●●', value: 4 },
              ].map(opt => {
                const isActive = priceRange === opt.value;
                return (
                  <button
                    key={opt.label}
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

        {/* Twin Persona Columns: Person A & Person B */}
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
              {cityCuisines.map(c => {
                const isSelected = cuisinesA.includes(c);
                return (
                  <button
                    key={c}
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
              {cityCuisines.map(c => {
                const isSelected = cuisinesB.includes(c);
                return (
                  <button
                    key={c}
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
      </section>

      {/* Results Header */}
      <section style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
            Consensus Matches in {city} ({results.length})
          </h2>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Ranked by min(Match A, Match B), then weighted rating
          </span>
        </div>

        {results.length === 0 ? (
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
            {results.map((r, i) => {
              const emoji = getCuisineEmoji(r.cuisineList);
              const rankStr = String(r.rank || i + 1).padStart(2, '0');

              return (
                <article
                  key={r.restaurant_id}
                  onClick={() => {
                    const scored: ScoredRestaurant = {
                      ...r,
                      cuisineMatch: (r.matchA + r.matchB) / 2,
                      score: r.weighted_rating,
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
                        fontSize: 20,
                      }}
                    >
                      {emoji}
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

                  {/* Cuisines */}
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.cuisines}
                  </div>

                  {/* Stats */}
                  {(() => {
                    const costInfo = formatDual(r.average_cost_for_two, r.currency);
                    const tier = PRICE_TIERS[(r.price_range as 1 | 2 | 3 | 4) || 2];
                    return (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                            ⭐ {r.aggregate_rating.toFixed(1)}
                            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>
                              ({formatVotes(r.votes)})
                            </span>
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            · {tier.name} {tier.dots}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                            {costInfo.display}
                          </div>
                          {costInfo.listed && (
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              {costInfo.listed}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Drawer */}
      <RestaurantDrawer
        restaurant={drawerRestaurant}
        onClose={() => setDrawerRestaurant(null)}
        onOpenSimilar={s => {
          const scored: ScoredRestaurant = {
            ...s,
            cuisineMatch: 0,
            score: s.weighted_rating,
            rank: 0,
            whyThisPick: '',
          };
          setDrawerRestaurant(scored);
        }}
      />
    </div>
  );
}
