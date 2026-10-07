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
