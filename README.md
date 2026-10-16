# TasteMatch — Worldwide Restaurant Recommendation & Intelligence Platform

> An explainable, worldwide restaurant recommendation and intelligence platform built on Kaggle's public Zomato dataset (7,403 rated restaurants across 15 countries) and OpenStreetMap (1,263 verified Nigerian food venues across Lagos, Abuja, Benin City, Jos, Enugu, Kano, and beyond).

---

## 🌟 Overview & Architectures

This repository contains two complete implementations:
1. **TasteMatch Web Application (`tastematch/`)**: Full-featured React + TypeScript + Tailwind static web platform with offline ML interpretability, OpenStreetMap maps, multi-currency conversion, local Nigerian features (dish search, payment tags, meal clock, generator/AC badges, food run planner, Owambe crawl planner, community additions, state capital switcher, compare mode, multilingual Pidgin/Yoruba/Igbo/Hausa drafts), and mobile-first responsiveness.
2. **Python Streamlit Application (`app.py`)**: Data science exploration dashboard deployable to **Streamlit Community Cloud**.

---

## 📊 Dataset & Verification Status

All numbers below are verified dynamically via `scripts/validate_datasets.py` and automated test suites:
- **Total Places**: **8,666**
  - **Zomato Kaggle (15 Countries)**: 7,403 places (~90% Delhi NCR)
  - **OpenStreetMap Nigeria**: 1,263 places across 58 canonical cities (25 full cities with $\ge 5$ places, 33 cities marked *Limited coverage* with $< 5$ places)
- **Nigeria OSM Field Coverage**:
  - Cuisine: **21.5%** (271 places)
  - Opening Hours: **13.5%** (171 places)
  - Phone: **8.7%** (110 places)
- **Shards**: **199 static JSON shards** (all files $\le 8$ MB cap).
- **UID Uniqueness**: 8,666 universal UIDs with 0 collisions.
- **Automated Test Pass Rate**: **20 test suites, 161 tests passed, 0 failures** (100% passing rate including Acceptance Tests T1–T22, WhatsApp share, and Location GPS suites).
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
