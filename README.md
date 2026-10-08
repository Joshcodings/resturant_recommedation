# Restaurant Recommendation and  Intelligence Platform

> An explainable restaurant recommendation and restaurant intelligence platform built on Kaggle's public Zomato dataset (7,403 rated restaurants across 15 countries).

This repository contains two complete implementations:
1. **Python Streamlit Application (`app.py`)**: Designed for quick data science exploration and 1-click deployment on **Streamlit Community Cloud**.
2. **TasteMatch Web Application (`tastematch/`)**: Full-featured React + TypeScript + Tailwind static web platform with offline ML interpretability, Leaflet maps, multi-currency conversion, and mobile-first responsiveness.

---

## 1-Click Deployment to Streamlit Community Cloud

The Streamlit app is fully configured and ready to deploy for free on [Streamlit Community Cloud](https://share.streamlit.io).

### Step-by-Step Instructions:

1. **Sign in to Streamlit**:
   - Go to **[share.streamlit.io](https://share.streamlit.io)** and log in with your GitHub account.

2. **Create New App**:
   - Click the **"New app"** button (top right).

3. **Configure Settings**:
   - **Repository**: `Joshcodings/resturant_recommedation`
   - **Branch**: `main`
   - **Main file path**: `app.py`
   - **App URL (optional)**: Custom subdomain if desired (e.g. `tastematch-recommender.streamlit.app`)

4. **Deploy**:
   - Click **"Deploy!"**.
   - Streamlit Cloud will automatically detect `requirements.txt`, install dependencies (`streamlit`, `pandas`, `numpy`, `plotly`), and spin up your live web app in ~1-2 minutes.

---

## Running the Streamlit App Locally

```bash
# Clone the repository
git clone https://github.com/Joshcodings/resturant_recommedation.git
cd resturant_recommedation

# Install dependencies
pip install -r requirements.txt

# Run the Streamlit app
streamlit run app.py
```

The app will automatically open in your default browser at `http://localhost:8501`.

---

## Running the TasteMatch React Web App

For the static React + Vite web platform:

```bash
cd tastematch
npm install
npm run dev
# Open http://localhost:5173/
```

See [tastematch/README.md](tastematch/README.md) for full documentation on the hybrid recommendation pipeline, evaluation benchmark, and Vercel/Netlify deployment.

---

## 🗺️ New Markets & OpenStreetMap (Beta)

We are actively expanding into new markets starting with Nigeria (**Lagos**, **Abuja**, and **Port Harcourt**). Because the original Zomato dataset did not cover these regions, we fetch live place data from **OpenStreetMap (OSM) via Overpass API**.

### Verified Dataset Coverage (from `scripts/validate_datasets.py`):
- **Total OSM Records**: 408 places
  - **Lagos**: 242 (59.3%)
  - **Abuja**: 123 (30.1%)
  - **Port Harcourt**: 43 (10.5%)
- **Attribute Coverage**:
  - Cuisines: 120 / 408 (29.4%)
  - Localities: 246 / 408 (60.3%)
  - Addresses: 125 / 408 (30.6%)
  - Opening Hours: 64 / 408 (15.7%)
  - Phone: 56 / 408 (13.7%)
  - Website: 56 / 408 (13.7%)
- **Place Types**:
  - Restaurants: 223
  - Fast Food: 78
  - Bars: 75
  - Cafes: 32

### Capabilities & Engine Behavior:
- **Unrated/Unpriced Mode**: OSM data lacks standard Zomato ratings and average cost fields. The recommendation engine dynamically switches to an unrated heuristic mode — ranking places strictly by cuisine match, proximity, and listing completeness.
- **Graceful UI Degradation**: The UI dynamically hides sliders and options that require missing data fields, providing transparent context.
- **Data Attribution**: The data extracted for these regions is licensed under [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/1-0/). See [NOTICE-OSM.md](NOTICE-OSM.md) for details.
