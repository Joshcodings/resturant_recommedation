# TasteMatch — Explainable Restaurant Recommendation & Intelligence Platform

> An explainable restaurant recommendation and restaurant intelligence platform built on Kaggle's public Zomato dataset (7,403 rated restaurants across 15 countries).
> Built as a static React + Vite + TypeScript web application with **$0 infrastructure costs**, responsive mobile-first UI, and offline machine learning interpretability.

---

## 🌟 Key Features & Architecture

### 1. Hybrid Recommendation Pipeline with Explainable AI (XAI)
- **Candidate Generation & Multi-Stage Relaxation**:
  - **Strict Mode**: Zero relaxation; requires exact price tier and cuisine matches. Displays explicit notice if no exact match is found.
  - **Flexible Mode**: Progressive fallback across 4 transparent stages (exact $\to$ price $\pm 1$ with cuisine $\to$ price $\pm 1$ cuisine relaxed $\to$ any price). Itemized `relaxedCriteria` tags are attached to every pick.
- **Maximal Marginal Relevance (MMR) Diversification**:
  - Balances relevance against redundancy using pairwise cuisine Jaccard similarity and locality proximity.
  - Interactive diversity slider allows users to tune between pure relevance ($\lambda = 1.0$) and high exploratory variety ($\lambda = 0.3$).
- **Structured Attribution Breakdown**:
  - Every card and detail drawer reveals explicit decision factors: cuisine affinity, Bayesian weighted rating vs. raw votes, price tier match, social proof review volume, and centroid distance.

### 2. Location Intelligence & Proximity Filtering
- **Haversine Distance**: Accurate spherical distance calculations between restaurants and city centroids or user locations.
- **Proximity Filtering**: Filter candidates within 3km, 5km, or 10km radius with distance badges (`📍 2.5km`).
- **Interactive OpenStreetMap + Leaflet**: Clean dark/light styled tiles with zero API keys required.

### 3. Machine Learning & Model Interpretability
- **Supervised Regression Benchmark**:
  - Directly exposes research experiments from `Zomato.ipynb` comparing Baseline, Ridge/Linear Regression, Random Forest, and HistGradientBoosting.
  - Quantifies performance across Test MAE (0.278) and $R^2$ (0.695) under leakage-controlled splits (excluding votes from non-established baseline).
- **Permutation Feature Importance**:
  - Interactive bar charts revealing relative feature influence: Local Cost vs. Country Median ($+0.085$), Price Tier ($+0.053$), Geographic Cluster ($+0.041$), Table Booking ($+0.032$), Cuisine Diversity ($+0.019$).
- **Error Distribution & Regional Residuals**:
  - 80% error quantile ($\pm 0.44$ rating points).
  - Explicit residual bias audit: Delhi NCR ($-0.012$ bias, MAE $0.328$) vs. International (14 countries, $+0.041$ bias, MAE $0.375$).
- **Interactive Rating Simulator (Inference Sandbox)**:
  - Real-time client-side rating predictor with an 80% confidence interval, allowing users to test how price tiers, relative cost, booking availability, delivery, and review counts affect predicted customer reception.

### 4. Offline Recommender Evaluation Framework
Quantitative evaluation comparing 4 recommendation paradigms over an offline evaluation sample:
- **Baseline (Top-Rated / Popularity)**: High raw ratings, but suffers from popularity bias (NDCG@5: 0.111, Coverage: 0.3%).
- **Content-Based**: Maximizes cuisine match (Precision@5: 46.7%, NDCG@5: 0.486).
- **Preference-Based**: Strict attribute alignment (Precision@5: 18.7%, NDCG@5: 0.172).
- **TasteMatch Hybrid + MMR**: Achieves superior ranking and discovery balance (Precision@5: 60.7%, NDCG@5: 0.664, Catalog Coverage: 2.0%, Intra-List Diversity: 74.0%).

### 5. Multi-Currency Converter & Live Exchange Rates
- Primary rate fetch via jsDelivr currency API with Cloudflare mirror and Open ExchangeRate-API fallback.
- Local storage caching (12h TTL) and bundled offline fallback (`rates-fallback.json`).
- Formats amounts dynamically with `Intl.NumberFormat` across 15+ currencies (USD, INR, NGN, GBP, EUR, AED, etc.).

### 6. Responsive Mobile-First Design & WCAG AA Contrast
- **Ink & Lime Design System**: Contrast ratios computed live in code adhering strictly to WCAG AA ($\ge 4.5:1$).
- **Responsive Layout**:
  - Mobile ($\le 390\text{px}$): Bottom navigation bar (`Discover`, `Group`, `Insights`, `About`), stacked search bar, elevated compare tray, touch-friendly drawers.
  - Tablet ($820\text{px}$) & Desktop ($1440\text{px}$): Dynamic grid layouts, fluid charts, multi-column detail drawers.

---

## 🚀 Quick Start

```bash
cd tastematch
npm install
npm run dev
# App will run at http://localhost:5173/
```

Access hidden developer route at `http://localhost:5173/#/styleguide` to view design tokens, typography, and live contrast calculations.

---

## 🧪 Testing & Verification

Comprehensive unit, integration, and acceptance tests built with **Vitest**:

```bash
npm test
```

### Test Suites (53/53 Passing)
- `src/tests/recommendation.test.ts` (22 tests): Relaxation stages, deduplication, group consensus, mood presets.
- `src/tests/currency.test.ts` (14 tests): Live rates normalization, cross-rate conversions, null handling, formatting rules.
- `src/tests/recommendation_extensions.test.ts` (6 tests): Strict vs Flexible mode, MMR diversification, pairwise similarity, XAI attribution.
- `src/tests/location.test.ts` (6 tests): Haversine distance, centroid math, proximity radius filter.
- `src/tests/acceptance.test.ts` (3 tests): End-to-end user query acceptance test cases.
- `src/tests/evaluation.test.ts` (2 tests): Offline benchmark computing Precision, Recall, NDCG, Coverage, Diversity.

---

## 📁 Project Structure

```
tastematch/
├── public/
│   ├── data/
│   │   ├── restaurants.json          # 7,403 cleaned records across 15 countries
│   │   └── rates-fallback.json       # Bundled emergency currency fallback
│   ├── favicon.svg
│   └── _redirects
├── src/
│   ├── components/
│   │   ├── card/RestaurantCard.tsx    # Restaurant card with XAI attribution & distance
│   │   ├── compare/                   # Multi-restaurant comparison tray & modal
│   │   ├── drawer/RestaurantDrawer.tsx# Detail drawer with Explainable AI attribution
│   │   ├── map/RestaurantMap.tsx      # OpenStreetMap + Leaflet map
│   │   └── search/                    # Search bar, location picker, mood presets, MMR slider
│   ├── config/
│   │   ├── emojis.ts                  # Cuisine emoji mappings
│   │   ├── mlMetrics.ts               # ML leaderboard, permutation importances & simulator
│   │   └── presets.ts                 # Mood presets (Date Night, Cheap Eats, etc.)
│   ├── context/
│   │   ├── CurrencyContext.tsx        # Multi-currency state & provider
│   │   └── ThemeContext.tsx           # Ink & Lime dark/light theme state
│   ├── lib/
│   │   ├── currency.ts                # Rate fetcher, conversion & normalization
│   │   ├── dataLoader.ts              # Dataset loader & validator
│   │   ├── evaluation.ts              # Recommender benchmark metrics calculator
│   │   ├── formatters.ts              # Formatters & WCAG contrast calculation
│   │   ├── location.ts                # Haversine distance & centroid calculations
│   │   └── recommendation.ts          # Hybrid recommender engine & MMR diversification
│   ├── types/
│   │   ├── recommendation.ts          # Query, XAI explanation, MMR types
│   │   └── restaurant.ts              # Data schema definitions
│   ├── views/
│   │   ├── AboutModal.tsx             # Methodology, data notes, rate attribution
│   │   ├── DiscoverView.tsx           # Main recommendation discovery interface
│   │   ├── GroupView.tsx              # Two-person consensus dining view
│   │   ├── InsightsView.tsx           # Market Analytics, ML Interpretability & Evaluation tabs
│   │   └── StyleguideView.tsx         # Design tokens & live WCAG contrast checker
│   ├── App.tsx                        # Responsive shell with mobile bottom nav
│   ├── index.css                      # Tailwind v4 theme & responsive utility classes
│   └── main.tsx
├── scripts/
│   └── capture_platform_responsive.cjs# Automated Puppeteer screenshot validation
├── package.json
└── vite.config.ts
```

---

## 🌐 Free Deployment Guide

### Vercel (Recommended)
1. Push your repository to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import your repository.
3. Set the Root Directory to `tastematch`.
4. Framework Preset will be automatically detected as **Vite**.
5. Click **Deploy**.

### Netlify
1. Run `npm run build`.
2. Drag and drop the `tastematch/dist/` folder into [netlify.com/drop](https://netlify.com/drop).
3. The included `public/_redirects` file ensures client-side HashRouter routes resolve smoothly.

### GitHub Pages
Set the base path in `vite.config.ts` or run:
```bash
VITE_BASE=/resturant_recommedation/ npm run build
```
Deploy the contents of `dist/` to your repository's `gh-pages` branch.

---

## 📜 Dataset & Attribution
- **Dataset**: Kaggle Zomato Public Restaurant dataset (~90% Delhi NCR, older snapshot).
- **Exchange Rates**: Live rates provided by Fawaz Ahmed Currency API and [ExchangeRate-API](https://www.exchangerate-api.com).
