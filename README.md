---
title: TasteMatch Restaurant Recommender
emoji: 🍽️
colorFrom: yellow
colorTo: green
sdk: streamlit
sdk_version: "1.35.0"
app_file: app.py
pinned: false
---

# TasteMatch — Worldwide Restaurant Recommendation & Intelligence Platform

🌐 **Live Production Web App**: [https://tastematch.pages.dev](https://tastematch.pages.dev)  
🔬 **Data Science Exploration Demo**: [Streamlit on Hugging Face Spaces](https://huggingface.co/spaces/JoshuaAdeyemi/resturant_recommedation)

> An explainable, worldwide restaurant recommendation and intelligence platform built on Kaggle's public Zomato dataset (7,403 rated restaurants across 15 countries) and OpenStreetMap (1,263 verified Nigerian food venues across Lagos, Abuja, Benin City, Jos, Enugu, Kano, and beyond).

---

## 🌟 Overview & Architectures

This repository contains two distinct implementations:
1. **TasteMatch Production Web App (`tastematch/`)**: Full-featured React + TypeScript + Tailwind static web platform with offline ML interpretability, OpenStreetMap maps, multi-currency conversion, local Nigerian features (dish search, payment tags, meal clock, generator/AC badges, food run planner, Owambe crawl planner, community additions, state capital switcher, compare mode, multilingual Pidgin/Yoruba/Igbo/Hausa drafts), and mobile-first responsiveness. Live at [https://tastematch.pages.dev](https://tastematch.pages.dev).
2. **Data Science Demo (`app.py`)**: Python Streamlit exploration dashboard hosted on Hugging Face Spaces for exploratory data analysis, feature experimentation, and baseline inspection. Clearly separate from the production client web platform.

---

## 📊 Dataset & Verification Status

All numbers below are verified dynamically via `scripts/validate_datasets.py` and automated test suites:
- **Total Places**: **11,310**
  - **Zomato Kaggle (15 Countries)**: 7,403 places (~90% Delhi NCR)
  - **Nigeria (OpenStreetMap + Overture Places Deduplicated)**: 3,907 verified places across 46 canonical cities (31 full cities with $\ge 5$ places, 15 cities marked *Limited coverage* with $< 5$ places)
- **Nigeria Structured Field Coverage**:
  - Locality: **81.4%** (3,180 places verified)
  - Cuisine: **74.6%** (2,915 places)
  - Phone: **57.6%** (2,251 places)
  - Opening Hours: **4.4%** (171 places)
- **Shards**: **187 static JSON shards** (all files $\le 8$ MB cap).
- **UID Uniqueness**: 11,310 universal UIDs with 0 collisions.
- **Automated Test Pass Rate**: **24 test suites, 193 tests passed, 0 failures** (100% passing rate including Acceptance Tests T1–T22, Phase 1 SEO/prerendering, Phase 2 Owner Toolkit, Phase 3 Overture Deduplication, and Phase 4 A13 Privacy Analytics).
- **Prerendering & SEO**: **4,086 static HTML pages**, `sitemap.xml` (882.7 KB), and `robots.txt` generated at build time.
- **Production Build**: Clean exit code 0 (`tsc -b && vite build`).

---

## ⚠️ Known Issues

The following items are open review observations preserved for backwards compatibility and research transparency:
1. **`mlMetrics.ts` Offline Snapshot**: Metric values represent a static offline evaluation snapshot from the initial model training run and are not dynamically recomputed on the browser client.
2. **Rating Simulator**: The Rating Simulator is an exploratory data science demonstration tool. In production ranking, unrated OpenStreetMap listings use verified feature and proximity scoring rather than synthesized ratings.
3. **Circular Benchmark**: Model evaluations assess retrieval consistency against the training distribution snapshot rather than an external live ground-truth panel.

---

## 🚀 Running the TasteMatch Web App

```bash
cd tastematch
npm install
npm run dev
# Open http://localhost:5173/

# Run tests
npm test -- --run

# Build for production
npm run build
```

See [tastematch/README.md](tastematch/README.md) for detailed documentation, feature breakdowns, and contribution instructions.

---

## 🎈 Running the Streamlit App

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run dataset validator
python scripts/validate_datasets.py

# Run Streamlit dashboard
streamlit run app.py
```

---

## ⚖️ License & Attribution

- **OpenStreetMap Data**: Licensed under the **[Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/)**. © OpenStreetMap contributors.
- **Zomato Dataset**: Kaggle public dataset used under CC-BY-NC-SA 4.0 guidelines.
- **Community Layer**: Released under **CC0 1.0 Universal**.
- **Transparency Statement**: *"Open data is incomplete and may include closed places."*
