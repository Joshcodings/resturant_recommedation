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
import { BarChart3, TrendingUp, MapPin } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export default function InsightsView() {
  const { data, countryCityIndex } = useRestaurants();
  const { theme } = useTheme();

  const [country, setCountry] = useState('India');
  const [city, setCity] = useState('New Delhi');

  const countries = Object.keys(countryCityIndex).sort();
  const cities = countryCityIndex[country] || [];

  // Filter dataset to selected city
  const cityData = useMemo(() => {
    return data.filter(r => r.country === country && r.city === city);
  }, [data, country, city]);

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
      const match = cityData.filter(r => r.price_range === tier);
      const avg = match.length > 0
        ? match.reduce((sum, r) => sum + r.aggregate_rating, 0) / match.length
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
      if (!locMap[r.locality]) {
        locMap[r.locality] = { totalWeighted: 0, count: 0 };
      }
      locMap[r.locality].totalWeighted += r.weighted_rating;
      locMap[r.locality].count += 1;
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

  const limeOutline = theme === 'light' ? '1px solid var(--text)' : 'none';

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
          <BarChart3 size={14} strokeWidth={1.5} color="var(--accent-deep)" />
          <span>Data Visualizations</span>
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
          City Analytics & Insights
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
          Explore cuisine distribution, rating correlations with price, and top neighborhoods
          derived from {cityData.length} rated restaurants in {city}.
        </p>

        {/* City Filter Row */}
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
            <span>Total restaurants analyzed:</span>
            <strong style={{ color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif" }}>
              {cityData.length}
            </strong>
          </div>
        </div>
      </section>

      {/* Grid of 3 Chart Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
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
            Count of restaurants serving each cuisine
          </p>

          <div style={{ height: 280, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topCuisinesData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 30, bottom: 5 }}
              >
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
                <Bar
                  dataKey="count"
                  fill="var(--accent)"
                  radius={[0, 4, 4, 0]}
                  style={{ outline: limeOutline }}
                />
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
            Average aggregate rating across price tiers 1 through 4
          </p>

          <div style={{ height: 280, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={priceRatingData}
                margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
              >
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
                <Bar
                  dataKey="rating"
                  fill="var(--accent)"
                  radius={[4, 4, 0, 0]}
                  style={{ outline: limeOutline }}
                />
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
            Ranked by average weighted rating (min 3 restaurants to qualify)
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
                Not enough locality density in this city (requires at least 3 rated restaurants per neighborhood).
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={bestLocalitiesData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 30, bottom: 5 }}
                >
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
                      `${val} (from ${item.payload.count} restaurants)`,
                      'Avg Weighted Rating',
                    ]}
                  />
                  <Bar
                    dataKey="avgRating"
                    fill="var(--accent)"
                    radius={[0, 4, 4, 0]}
                    style={{ outline: limeOutline }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
