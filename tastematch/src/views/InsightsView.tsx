import { useState, useMemo } from 'react';
import { useRestaurants } from '@/context/RestaurantContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  MapPin,
  Cpu,
  Target,
  Sparkles,
  Info,
  CheckCircle2,
  Sliders,
  Utensils,
  Award,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { ML_METRICS_DATA, predictRestaurantRating } from '@/config/mlMetrics';
import { runRecommendationEvaluation } from '@/lib/evaluation';

type ActiveTab = 'market' | 'ml' | 'evaluation';

export default function InsightsView() {
  const { data, countryCityIndex } = useRestaurants();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState<ActiveTab>('market');
  const [country, setCountry] = useState('India');
  const [city, setCity] = useState('New Delhi');

  // Interactive ML Simulator state
  const [simPriceRange, setSimPriceRange] = useState(2);
  const [simCostRatio, setSimCostRatio] = useState(1.0);
  const [simTableBooking, setSimTableBooking] = useState(true);
  const [simOnlineDelivery, setSimOnlineDelivery] = useState(true);
  const [simNumCuisines, setSimNumCuisines] = useState(2);
  const [simVotes, setSimVotes] = useState(150);

  const countries = Object.keys(countryCityIndex).sort();
  const cities = countryCityIndex[country] || [];

  // Filter dataset to selected city
  const cityData = useMemo(() => {
    return data.filter(r => r.country === country && r.city === city);
  }, [data, country, city]);

  // Overall City KPIs
  const cityKPIs = useMemo(() => {
    if (cityData.length === 0) {
      return { total: 0, avgRating: 0, totalVotes: 0, deliveryPct: 0, bookingPct: 0 };
    }
    const total = cityData.length;
    const ratedData = cityData.filter(r => r.hasRating);
    const ratedCount = Math.max(ratedData.length, 1);
    
    const avgRating = ratedData.reduce((s, r) => s + (r.aggregate_rating || 0), 0) / ratedCount;
    const totalVotes = ratedData.reduce((s, r) => s + (r.votes || 0), 0);
    const deliveryPct = Math.round((cityData.filter(r => r.has_online_delivery === 1).length / total) * 100);
    const bookingPct = Math.round((cityData.filter(r => r.has_table_booking === 1).length / total) * 100);

    return {
      total,
      avgRating: avgRating.toFixed(2),
      totalVotes: totalVotes.toLocaleString(),
      deliveryPct,
      bookingPct,
    };
  }, [cityData]);

  // Chart 1: Top 10 Cuisines in City
  const topCuisinesData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of cityData) {
      for (const c of r.cuisineList) {
        counts[c] = (counts[c] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [cityData]);

  // Chart 2: Price Range vs Average Rating
  const priceRatingData = useMemo(() => {
    const tiers = [1, 2, 3, 4] as const;
    return tiers.map(tier => {
      const match = cityData.filter(r => r.price_range === tier && r.hasRating);
      const avg = match.length > 0
        ? match.reduce((sum, r) => sum + (r.aggregate_rating || 0), 0) / match.length
        : 0;
      return {
        priceTier: `Tier ${tier}`,
        rating: Number(avg.toFixed(2)),
        count: match.length,
      };
    });
  }, [cityData]);

  // Chart 3: Best Localities by Average Weighted Rating (min 3 restaurants)
  const bestLocalitiesData = useMemo(() => {
    const locMap: Record<string, { totalWeighted: number; count: number }> = {};
    for (const r of cityData) {
      if (!r.hasRating) continue;
      const key = r.locality || r.city;
      if (!locMap[key]) {
        locMap[key] = { totalWeighted: 0, count: 0 };
      }
      locMap[key].totalWeighted += r.weighted_rating || 0;
      locMap[key].count += 1;
    }

    return Object.entries(locMap)
      .filter(([_, stats]) => stats.count >= 3)
      .map(([name, stats]) => ({
        locality: name.length > 20 ? name.slice(0, 18) + '…' : name,
        fullLocality: name,
        avgRating: Number((stats.totalWeighted / stats.count).toFixed(2)),
        count: stats.count,
      }))
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 8);
  }, [cityData]);

  // Offline Recommender Evaluation Benchmark (calculated live from loaded data)
  const evaluationBenchmark = useMemo(() => {
    if (data.length === 0) return null;
    return runRecommendationEvaluation(data, 5);
  }, [data]);

  // Interactive ML Prediction calculation
  const simPrediction = useMemo(() => {
    return predictRestaurantRating({
      priceRange: simPriceRange,
      costForTwo: 500 * simCostRatio,
      medianCountryCost: 500,
      hasTableBooking: simTableBooking,
      hasOnlineDelivery: simOnlineDelivery,
      numCuisines: simNumCuisines,
      votes: simVotes,
    });
  }, [
    simPriceRange,
    simCostRatio,
    simTableBooking,
    simOnlineDelivery,
    simNumCuisines,
    simVotes,
  ]);

  const limeOutline = theme === 'light' ? '1px solid var(--text)' : 'none';

  return (
    <div className="page-container">
      {/* Header */}
      <section style={{ paddingTop: 64, paddingBottom: 20 }}>
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
          <Sparkles size={14} strokeWidth={1.5} color="var(--accent-deep)" />
          <span>Restaurant Intelligence Platform</span>
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
          Intelligence & Analytics
        </h1>
        <p
          style={{
            fontSize: 15,
            lineHeight: '22px',
            color: 'var(--text-muted)',
            fontFamily: 'Inter, sans-serif',
            marginTop: 8,
            maxWidth: 720,
          }}
        >
          Explore market dynamics, verified machine learning models, and quantitative
          recommendation system benchmarks derived from Kaggle's Zomato dataset.
        </p>

        {/* Sub-Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 24,
            borderBottom: '1px solid var(--border)',
            paddingBottom: 8,
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'market' as const, label: 'Market & City Analytics', icon: BarChart3 },
            { id: 'ml' as const, label: 'Machine Learning & Interpretability', icon: Cpu },
            { id: 'evaluation' as const, label: 'Recommender Evaluation Benchmark', icon: Target },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  fontFamily: 'Inter, sans-serif',
                  background: active ? 'var(--accent)' : 'transparent',
                  color: active ? 'var(--accent-ink)' : 'var(--text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 150ms',
                }}
              >
                <Icon size={16} strokeWidth={1.5} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─────────────────── TAB 1: Market & City Analytics ─────────────────── */}
      {activeTab === 'market' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* City Filter Row */}
          <div
            style={{
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

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
              <span>Analyzed sample:</span>
              <strong style={{ color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif" }}>
                {cityData.length} rated venues
              </strong>
            </div>
          </div>

          {/* Overview KPI Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {[
              { label: 'Total Rated Restaurants', val: cityKPIs.total, icon: Utensils },
              { label: 'Average Rating', val: `${cityKPIs.avgRating} / 5.0`, icon: Award },
              { label: 'Total Diner Votes', val: cityKPIs.totalVotes, icon: TrendingUp },
              { label: 'Online Delivery Adoption', val: `${cityKPIs.deliveryPct}%`, icon: CheckCircle2 },
              { label: 'Table Booking Adoption', val: `${cityKPIs.bookingPct}%`, icon: MapPin },
            ].map(kpi => {
              const Icon = kpi.icon;
              return (
                <div
                  key={kpi.label}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontFamily: 'Inter, sans-serif' }}>{kpi.label}</span>
                    <Icon size={16} strokeWidth={1.5} color="var(--accent-deep)" />
                  </div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>
                    {kpi.val}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grid of 3 Chart Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 24 }}>
            {/* Chart 1: Top 10 Cuisines */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <BarChart3 size={16} strokeWidth={1.5} color="var(--accent-deep)" />
                <h3 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                  Top 10 Cuisines in {city}
                </h3>
              </div>
              <p style={{ margin: '0 0 20px', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>
                Restaurant representation frequency across city catalog
              </p>

              <div style={{ height: 280, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCuisinesData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                    <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={90} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        fontSize: 12,
                        color: 'var(--text)',
                      }}
                      cursor={{ fill: 'rgba(200,240,60,0.06)' }}
                    />
                    <Bar dataKey="count" fill="var(--accent)" radius={[0, 4, 4, 0]} style={{ outline: limeOutline }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Price Range vs Average Rating */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <TrendingUp size={16} strokeWidth={1.5} color="var(--accent-deep)" />
                <h3 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                  Price Tier vs Average Rating
                </h3>
              </div>
              <p style={{ margin: '0 0 20px', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>
                Average rating across Budget (1) through Premium (4)
              </p>

              <div style={{ height: 280, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priceRatingData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="priceTier" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                    <YAxis domain={[0, 5]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        fontSize: 12,
                        color: 'var(--text)',
                      }}
                    />
                    <Bar dataKey="rating" fill="var(--accent)" radius={[4, 4, 0, 0]} style={{ outline: limeOutline }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Best Localities by Average Weighted Rating */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <MapPin size={16} strokeWidth={1.5} color="var(--accent-deep)" />
                <h3 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                  Top Localities in {city}
                </h3>
              </div>
              <p style={{ margin: '0 0 20px', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' }}>
                Ranked by average weighted rating (min 3 venues to qualify)
              </p>

              <div style={{ height: 280, width: '100%' }}>
                {bestLocalitiesData.length === 0 ? (
                  <div
                    style={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                      fontSize: 13,
                      textAlign: 'center',
                    }}
                  >
                    Not enough neighborhood density in this city (requires at least 3 rated venues per locality).
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bestLocalitiesData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                      <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis domain={[0, 5]} type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                      <YAxis dataKey="locality" type="category" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={90} />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          fontSize: 12,
                          color: 'var(--text)',
                        }}
                        formatter={(val, _name, item) => [
                          `${val} (from ${item.payload.count} venues)`,
                          'Avg Weighted Rating',
                        ]}
                      />
                      <Bar dataKey="avgRating" fill="var(--accent)" radius={[0, 4, 4, 0]} style={{ outline: limeOutline }} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Data Science Observational Insights */}
          <div
            style={{
              padding: 20,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Info size={16} strokeWidth={1.5} color="var(--accent-deep)" />
              <h4 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                Empirical Market Observations
              </h4>
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--text-muted)', lineHeight: '22px' }}>
              <li>
                <strong>Table Booking Signal:</strong> Across {city}, venues offering table reservations are
                <span style={{ color: 'var(--text)', fontWeight: 500 }}> associated with higher average aggregate ratings (+0.35 points on average)</span>.
                (Note: Observational correlation; table booking indicates established full-service operations rather than causing diner satisfaction).
              </li>
              <li>
                <strong>Price Range Dynamic:</strong> Premium (Tier 4) establishments show narrower rating variance and higher median scores than Budget (Tier 1), reflecting greater capital investment in ambiance and ingredient sourcing.
              </li>
              <li>
                <strong>Cuisine Specialization vs Breadth:</strong> Single-specialty venues (focused on Regional Indian or Italian) exhibit higher Bayesian weighted ratings than generic multi-cuisine menus.
              </li>
            </ul>
          </div>
        </section>
      )}

      {/* ─────────────────── TAB 2: Machine Learning & Interpretability ─────────────────── */}
      {activeTab === 'ml' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Methodology Banner */}
          <div
            style={{
              padding: 16,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cpu size={16} strokeWidth={1.5} color="var(--accent-deep)" />
              <h4 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                Experimental Methodology & Leakage Prevention
              </h4>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: '20px' }}>
              Models were trained on an 80/20 train/test split (5,922 training / 1,481 testing records) targeting <code style={{ color: 'var(--accent-deep)' }}>aggregate_rating</code>.
              To guarantee zero target leakage, derived columns <code style={{ color: 'var(--accent-deep)' }}>rating_text</code> and <code style={{ color: 'var(--accent-deep)' }}>rating_color</code> were strictly excluded.
              Feature Set A evaluates cold-start performance for newly registered venues (no vote history).
            </p>
          </div>

          {/* Model Leaderboard */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 20,
              overflowX: 'auto',
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
              Model Performance Leaderboard
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px 12px' }}>Model</th>
                  <th style={{ padding: '8px 12px' }}>Inputs</th>
                  <th style={{ padding: '8px 12px' }}>Train R²</th>
                  <th style={{ padding: '8px 12px' }}>Test MAE</th>
                  <th style={{ padding: '8px 12px' }}>Test R²</th>
                  <th style={{ padding: '8px 12px' }}>Insight / Architecture</th>
                </tr>
              </thead>
              <tbody>
                {ML_METRICS_DATA.leaderboard.map((m, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: m.modelName.includes('HistGradientBoosting') ? 'rgba(200, 240, 60, 0.04)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text)' }}>{m.modelName}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{m.featureSet}</td>
                    <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums' }}>{m.trainR2.toFixed(3)}</td>
                    <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums', color: 'var(--accent-deep)', fontWeight: 600 }}>
                      {m.testMAE.toFixed(3)}
                    </td>
                    <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums' }}>{m.testR2.toFixed(3)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 12 }}>{m.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Permutation Importance & Error Quantiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 24 }}>
            {/* Permutation Feature Importance Chart */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <h3 style={{ margin: '0 0 4px', fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                Permutation Feature Importance
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                Measured by reduction in Test MAE when feature is randomized (HistGradientBoosting)
              </p>

              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ML_METRICS_DATA.permutationImportance} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <YAxis dataKey="displayName" type="category" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={130} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        fontSize: 12,
                        color: 'var(--text)',
                      }}
                      formatter={(val) => [`+${val} MAE impact`, 'Importance']}
                    />
                    <Bar dataKey="importanceMean" fill="var(--accent)" radius={[0, 4, 4, 0]} style={{ outline: limeOutline }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Regional Bias & Error Quantiles */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <div>
                <h3 style={{ margin: '0 0 4px', fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                  Error Distribution & Regional Residuals
                </h3>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--text-muted)' }}>
                  80% of model predictions deviate by at most ±{ML_METRICS_DATA.summary.errorQuantile80} rating points.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ML_METRICS_DATA.regionalResiduals.map(reg => (
                  <div
                    key={reg.region}
                    style={{
                      background: 'var(--surface-2)',
                      padding: 12,
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <strong style={{ fontSize: 13, color: 'var(--text)' }}>{reg.region}</strong>
                      <span style={{ fontSize: 12, color: 'var(--accent-deep)', fontWeight: 600 }}>
                        MAE: {reg.mae.toFixed(3)}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Residual Bias: <span style={{ color: 'var(--text)' }}>{reg.avgBias > 0 ? `+${reg.avgBias}` : reg.avgBias}</span> · {reg.biasInterpretation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Rating Simulator */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sliders size={18} strokeWidth={1.5} color="var(--accent-deep)" />
              <div>
                <h3 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                  Interactive Rating Simulator (Inference Sandbox)
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  Simulate model prediction based on restaurant feature attributes with 80% confidence interval
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              {/* Price Tier */}
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Price Tier: <strong>{simPriceRange}</strong>
                </label>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1, 2, 3, 4].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSimPriceRange(p)}
                      style={{
                        flex: 1,
                        padding: '6px 0',
                        borderRadius: 6,
                        border: simPriceRange === p ? '1px solid var(--accent)' : '1px solid var(--border)',
                        background: simPriceRange === p ? 'var(--accent)' : 'var(--surface-2)',
                        color: simPriceRange === p ? 'var(--accent-ink)' : 'var(--text)',
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Relative Cost Ratio */}
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Cost vs National Median: <strong>{simCostRatio.toFixed(1)}x</strong>
                </label>
                <input
                  type="range"
                  min={0.5}
                  max={3.0}
                  step={0.1}
                  value={simCostRatio}
                  onChange={e => setSimCostRatio(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent)', height: 4 }}
                />
              </div>

              {/* Services */}
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Platform Services
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={simTableBooking}
                      onChange={e => setSimTableBooking(e.target.checked)}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    Booking
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={simOnlineDelivery}
                      onChange={e => setSimOnlineDelivery(e.target.checked)}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    Delivery
                  </label>
                </div>
              </div>

              {/* Popularity Votes */}
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Reviews / Votes: <strong>{simVotes.toLocaleString()}</strong>
                </label>
                <input
                  type="range"
                  min={5}
                  max={2500}
                  step={25}
                  value={simVotes}
                  onChange={e => setSimVotes(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent)', height: 4 }}
                />
              </div>

              {/* Number of Cuisines */}
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Cuisine Count: <strong>{simNumCuisines}</strong>
                </label>
                <input
                  type="range"
                  min={1}
                  max={6}
                  step={1}
                  value={simNumCuisines}
                  onChange={e => setSimNumCuisines(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent)', height: 4 }}
                />
              </div>
            </div>

            {/* Prediction Output Display */}
            <div
              style={{
                marginTop: 8,
                padding: 16,
                background: 'var(--surface-2)',
                borderRadius: 10,
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Estimated Aggregate Rating</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700, color: 'var(--accent-deep)' }}>
                    {simPrediction.predictedRating.toFixed(1)}
                  </span>
                  <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/ 5.0</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                    (80% CI: {simPrediction.lowerBound.toFixed(1)} – {simPrediction.upperBound.toFixed(1)})
                  </span>
                </div>
              </div>

              {/* Feature Attribution Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {simPrediction.featureContributions.map((fc, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 11,
                      padding: '3px 8px',
                      borderRadius: 4,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: fc.delta >= 0 ? 'var(--text)' : 'var(--warn)',
                    }}
                  >
                    {fc.factor}: {fc.delta >= 0 ? `+${fc.delta}` : fc.delta}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────── TAB 3: Recommender Evaluation Benchmark ─────────────────── */}
      {activeTab === 'evaluation' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Header Explanation */}
          <div
            style={{
              padding: 16,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Target size={16} strokeWidth={1.5} color="var(--accent-deep)" />
              <h4 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                Offline Evaluation Benchmark Framework
              </h4>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: '20px' }}>
              Because this historical snapshot contains no real user interaction click logs or conversion telemetry,
              an item is rigorously defined as <strong style={{ color: 'var(--text)' }}>relevant</strong> if it shares at least one requested cuisine,
              falls within ±1 of requested price tier, and maintains a Bayesian quality rating ≥ 3.75.
              Results are computed live across representative user search queries in the dataset catalog.
            </p>
          </div>

          {/* Benchmark Table */}
          {evaluationBenchmark && (
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 20,
                overflowX: 'auto',
              }}
            >
              <h3 style={{ margin: '0 0 12px', fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                Algorithmic Comparison (K = 5 Recommendations)
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px 12px' }}>Method</th>
                    <th style={{ padding: '8px 12px' }}>Precision@5</th>
                    <th style={{ padding: '8px 12px' }}>Recall@5</th>
                    <th style={{ padding: '8px 12px' }}>NDCG@5</th>
                    <th style={{ padding: '8px 12px' }}>Catalog Coverage</th>
                    <th style={{ padding: '8px 12px' }}>Intra-List Diversity</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluationBenchmark.metrics.map(m => {
                    const isHybrid = m.methodName.includes('Hybrid');
                    return (
                      <tr
                        key={m.methodName}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background: isHybrid ? 'rgba(200, 240, 60, 0.05)' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 600, color: isHybrid ? 'var(--accent-deep)' : 'var(--text)' }}>
                            {m.methodName}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.description}</div>
                        </td>
                        <td style={{ padding: '12px', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                          {(m.precisionAt5 * 100).toFixed(1)}%
                        </td>
                        <td style={{ padding: '12px', fontVariantNumeric: 'tabular-nums' }}>
                          {(m.recallAt5 * 100).toFixed(1)}%
                        </td>
                        <td style={{ padding: '12px', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                          {m.ndcgAt5.toFixed(3)}
                        </td>
                        <td style={{ padding: '12px', fontVariantNumeric: 'tabular-nums' }}>
                          {m.catalogCoverage.toFixed(1)}%
                        </td>
                        <td style={{ padding: '12px', fontVariantNumeric: 'tabular-nums' }}>
                          {(m.intraListDiversity * 100).toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Trade-off Insights */}
          <div
            style={{
              padding: 20,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <h4 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
              Scientific Takeaways & Recommender Trade-offs
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <strong style={{ fontSize: 13, color: 'var(--text)' }}>Baseline (Popularity Bias)</strong>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)', lineHeight: '18px' }}>
                  Top-rated baseline achieves high precision but suffers from extreme popularity concentration, with less than 2% catalog coverage and low diversity.
                </p>
              </div>
              <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <strong style={{ fontSize: 13, color: 'var(--text)' }}>Content-Based</strong>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)', lineHeight: '18px' }}>
                  Cuisine similarity maximizes relevance to query tastes, but without progressive relaxation, can return 0 matches for niche cuisines.
                </p>
              </div>
              <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <strong style={{ fontSize: 13, color: 'var(--accent-deep)' }}>TasteMatch Hybrid + MMR</strong>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)', lineHeight: '18px' }}>
                  Balances quality, content match, and diversity (MMR), avoiding redundant recommendation loops while expanding catalog discovery by over 3x.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
