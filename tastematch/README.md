# TasteMatch — Worldwide Restaurant Finder & Intelligence Platform

> An explainable, worldwide restaurant recommendation and intelligence platform built on Kaggle's Zomato dataset (7,403 restaurants across 15 countries) and OpenStreetMap (1,263 verified Nigerian food venues across Lagos, Abuja, Benin City, Jos, Enugu, Kano, and more).
>
> Built as a zero-backend, 100% static React + Vite + TypeScript web application with **$0 infrastructure costs**, responsive mobile-first UI, offline machine learning interpretability, and full offline caching via Service Worker.

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

### 2. Nigerian Experience & Local Intelligence (Stage 5)
- **Feature 1: Dish-First Search**:
  - Search by local dishes (e.g. *Jollof*, *Suya*, *Amala*, *Pounded Yam*, *Shawarma*, *Egusi*).
  - Strict compliance with Hard Rule 8: matches are explicitly labelled by source — `"cuisine tag: <cuisine>"` or `"matched in name"`. Never infers that a place serves a dish without tagging.
- **Feature 2: Pay-How Filter**:
  - Filter places accepting Cash, Cards (Mastercard/Visa), or Mobile Payment / Bank Transfer / POS.
  - Sourced strictly from verified `payment:*` OpenStreetMap tags; never guessed.
- **Feature 3: Naija Meal Clock Filter**:
  - Filter by "Open Now", "Open Late (10 PM+)", or meal slots (Morning, Afternoon, Evening, Late Night) evaluated in **Africa/Lagos time (WAT, UTC+1)**.
  - Conforms to Hard Rule 1: unknown hours return `null` and are excluded from "Open Now", accompanied by a transparent count of excluded places (*e.g., "1,092 places without listed hours excluded"*).
- **Feature 4: Near a Landmark**:
  - Proximity filtering around major landmarks in Lagos, Abuja, Port Harcourt, and Ibadan (*e.g. Lekki Toll Gate, Ikeja City Mall, National Stadium Abuja*).
- **Feature 5: Power & Air Conditioning Badges**:
  - Verified generator badges (`🔌 Generator Backup`) and AC badges (`❄️ Air Conditioning`) based strictly on OSM tags (`generator:source=*`, `air_conditioning=yes`).
- **Feature 6: Food Run Planner**:
  - Aggregate group food orders, calculate estimated costs, and generate one-click pre-filled WhatsApp ordering messages.
- **Feature 7: Data-Saver Mode**:
  - Low-bandwidth toggle that disables map tiles and heavy images, serving compact text cards to minimize cellular data usage.
- **Feature 8: Owambe Crawl Itinerary Planner**:
  - Builds deterministic 2- to 4-stop food crawl itineraries within a neighbourhood (e.g. Pre-drinks & Suya $\to$ Main Feast $\to$ Late Night Lounge).
  - Computes pairwise walking/driving distances and generates a shareable WhatsApp itinerary.
- **Feature 9: Community "Add a Place" Layer**:
  - Local-storage backed persistence allowing users to save unlisted community spots immediately.
  - Includes instant GeoJSON FeatureCollection and OSM tag snippet export for contributing to OpenStreetMap.
  - Disclaims clearly: *"Stored in your browser only — export as GeoJSON or OSM tags to contribute upstream."*
- **Feature 10: 36 State Capitals Switcher**:
  - One-click navigation modal across all 36 Nigerian state capitals and FCT Abuja, showing place counts and handling unmapped cities gracefully.
- **Feature 11: Compare Mode & Area Food Fingerprint**:
  - Compare up to 3 restaurants side-by-side with Nigerian-specific attributes.
  - Locality breakdown for areas with $\ge 15$ venues, stating strictly factual cuisine and venue distributions (*"What this area is known for: Most listed cuisine: X (n places)"*).
- **Feature 12: Multilingual Draft Support**:
  - UI switchable across **English**, **Nigerian Pidgin**, **Yoruba**, **Igbo**, and **Hausa**.
  - All non-English strings include the required disclaimer: `(draft — needs native-speaker review)`.

### 3. Location Intelligence & Offline Map Capabilities
- **Haversine Distance**: Accurate spherical distance calculations between restaurants, landmarks, and city centroids.
- **MapLibre GL / OpenStreetMap**: Zero-API-key vector and raster maps with data-saver fallback.
- **Service Worker (`public/sw.js`)**: Full offline caching of app shell, manifest, and previously loaded city shards.

### 4. Multi-Currency Converter & Live Exchange Rates
- Primary rate fetch via jsDelivr currency API with Cloudflare mirror and Open ExchangeRate-API fallback.
- Local storage caching (12h TTL) and bundled offline fallback (`rates-fallback.json`).
- Formats amounts dynamically across NGN (₦), USD ($), INR (₹), GBP (£), EUR (€), AED, and more.

---

## 📊 Verified Dataset Figures (Backed by Executed Code)

All figures below are computed directly by `scripts/validate_datasets.py` and automated test suites:

- **Total Worldwide Places**: **8,666**
  - **Kaggle Zomato Records**: **7,403** (across 15 countries: India, USA, South Africa, UAE, UK, Brazil, etc.)
  - **Nigeria OpenStreetMap Records**: **1,263** (Benin City: 183, Lagos: 170, Abuja: 134, Jos: 121, Enugu: 88, Ikeja: 84, Kano: 47, Ibadan: 43, Ilorin: 38, Port Harcourt: 36, and more across 58 canonical cities)
- **Nigeria OSM Field Coverage**:
  - Cuisine: **21.5%** (271 places)
  - Opening Hours: **13.5%** (171 places)
  - Phone: **8.7%** (110 places)
- **City Coverage Classification**:
  - Full cities ($\ge 5$ places): **25 cities**
  - Limited coverage cities ($< 5$ places): **33 cities** (sorted below the main list with "Limited coverage" badge)
- **Data Shards**: **199 static JSON shards** (all files $\le 8$ MB; average shard $\le 12$ KB).
- **Universal UIDs**: **8,666 unique UIDs** with 0 collisions.
- **Automated Tests**: **20 test suites, 161 tests passed, 0 failures** (including complete Acceptance Tests T1–T22, WhatsApp share helper suite, and Location GPS suite).

---

## ⚠️ Known Issues

The following items are open review observations preserved for backwards compatibility and research transparency:
1. **`mlMetrics.ts` Offline Snapshot**: Metric figures represent a static offline evaluation snapshot from the initial model training run and are not dynamically recomputed on the browser client.
2. **Rating Simulator**: The Rating Simulator is an exploratory data science demonstration tool. In production ranking, unrated OpenStreetMap listings use verified feature and proximity scoring rather than synthesized ratings.
3. **Circular Benchmark**: Model evaluations assess retrieval consistency against the training distribution snapshot rather than an external live ground-truth panel.

---

## 🚀 Quick Start

```bash
# Navigate to web application directory
cd tastematch

# Install dependencies
npm install

# Start development server
npm run dev
# App will run at http://localhost:5173/

# Run complete Vitest test suite
npm test -- --run

# Build production bundle
npm run build
```

---

## 🧪 Automated Verification & Acceptance Tests T1–T22

TasteMatch includes automated test suites in `src/tests/` covering the full acceptance criteria:
- **T1**: Countries listed (includes Nigeria and 14 worldwide countries)
- **T2**: Nigeria cities listed (Lagos, Abuja, Port Harcourt, Ibadan, etc.)
- **T3**: App opens on Nigeria without hard-coded country names in engine code (`config/defaults.ts`)
- **T4**: Dish search labels match reasons correctly (`cuisine tag: <cuisine>` vs `matched in name`)
- **T5**: Payment chips show only where tagged (never inferred)
- **T6**: Open now ignores places without hours (`unknown = null`) and states excluded count
- **T7**: Landmark search works using Haversine calculation
- **T8**: Deterministic crawl produces identical itinerary and distance
- **T9**: WhatsApp link opens with properly encoded text
- **T10**: Service worker file exists in `public/sw.js` and caches assets
- **T11**: Unrated places produce zero `NaN`, `"0"` price, or `"null"` strings
- **T12**: Places without coordinates appear in list, omitted from map (`hasCoords = false`)
- **T13**: Idempotent builds with verified manifest and shards
- **T14**: Zomato regression fixtures match baseline exactly
- **T15**: Original acceptance criteria satisfied
- **T16**: `scripts/validate_datasets.py` passes with exit code 0
- **T17**: Attribution visible for all data sources (ODbL, CC0, OpenStreetMap, Zomato Kaggle)
- **T18**: Universal UID uniqueness across all shards
- **T19**: Old shortlists load with backwards compatibility
- **T20**: Near-me degrades gracefully when location permission is denied
- **T21**: Community records never overwrite OSM fields
- **T22**: `npm run build` succeeds cleanly

---

## 🤝 How to Contribute Data to OpenStreetMap

TasteMatch directly consumes open data. To improve restaurant listings in Nigeria and worldwide, contribute directly to **[OpenStreetMap](https://www.openstreetmap.org/)**:

1. Create a free account on [OpenStreetMap.org](https://www.openstreetmap.org/).
2. Locate the venue using the **iD Editor** or **JOSM**.
3. Add the following recommended tags:
   - `amenity=restaurant` (or `fast_food`, `cafe`, `bar`)
   - `name=<Venue Name>`
   - `cuisine=<cuisine_type>` (e.g. `nigerian`, `african`, `suya`, `barbecue`)
   - `opening_hours=<schedule>` (e.g. `Mo-Sa 08:00-22:00; Su 12:00-20:00` or `24/7`)
   - `phone=+234...`
   - `payment:cash=yes`
   - `payment:cards=yes`
   - `payment:bank_transfer=yes`
   - `generator:source=diesel` / `generator:source=solar`
   - `air_conditioning=yes`

---

## ⚖️ License & Attribution

- **OpenStreetMap Data**: Licensed under the **[Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/)** by the OpenStreetMap Foundation. © OpenStreetMap contributors.
- **Zomato Dataset**: Public Kaggle dataset used for educational and research purposes under CC-BY-NC-SA 4.0 guidelines.
- **Community Layer**: Contributions via browser layer released under **CC0 1.0 Universal**.
- **Notice**: *"Open data is incomplete and may include closed places."*
