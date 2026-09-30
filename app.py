import pandas as pd
import numpy as np
import streamlit as st
import plotly.express as px

# ─── Page Configuration ───────────────────────────────────────────────────────
st.set_page_config(
    page_title="TasteMatch — Restaurant Intelligence",
    page_icon="🍽️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─── Custom CSS for Ink & Lime Aesthetics ─────────────────────────────────────
st.markdown("""
<style>
    .stApp {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .metric-card {
        background-color: #181A20;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
    }
    .restaurant-title {
        font-size: 1.4rem;
        font-weight: 700;
        color: #F3F2EE;
        margin-bottom: 4px;
    }
    .badge-exact {
        background-color: #C8F03C;
        color: #0C0D10;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 0.75rem;
        display: inline-block;
        margin-bottom: 8px;
    }
    .badge-relaxed {
        background-color: #FFC043;
        color: #0C0D10;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 0.75rem;
        display: inline-block;
        margin-bottom: 8px;
    }
    .why-this-pick {
        border-left: 3px solid #C8F03C;
        padding-left: 10px;
        font-style: italic;
        color: #A1A1AA;
        margin: 8px 0;
    }
</style>
""", unsafe_allow_html=True)

PRICE_TIERS = {
    1: {"name": "Budget", "dots": "●○○○"},
    2: {"name": "Moderate", "dots": "●●○○"},
    3: {"name": "Upscale", "dots": "●●●○"},
    4: {"name": "Premium", "dots": "●●●●"},
}

# ─── Data Loading ─────────────────────────────────────────────────────────────
@st.cache_data
def load_data():
    df = pd.read_csv("reco_app.csv")
    df["cuisine_list"] = df["cuisines"].str.split(",").apply(lambda xs: [x.strip() for x in xs])
    return df

reco = load_data()

# ─── Core Recommendation Engine ───────────────────────────────────────────────
def recommend(country, city, price_range=None, cuisines=None,
              table_booking=False, online_delivery=False, top_n=3, mode="flexible"):
    pool = reco[(reco["country"] == country) & (reco["city"] == city)].copy()
    if table_booking:
        pool = pool[pool["has_table_booking"] == 1]
    if online_delivery:
        pool = pool[pool["has_online_delivery"] == 1]
    if pool.empty:
        return pool, "No rated restaurants match this city and required services.", "none"

    wanted = set(cuisines or [])
    pool["cuisine_match"] = pool["cuisine_list"].apply(
        lambda xs: len(wanted & set(xs)) / len(wanted) if wanted else 0.0)
    pool["score"] = pool["weighted_rating"] + 0.5 * pool["cuisine_match"]

    if mode == "strict":
        sub = pool
        if price_range is not None:
            sub = sub[sub["price_range"] == price_range]
        if wanted:
            sub = sub[sub["cuisine_match"] > 0]
        sub = sub.sort_values("score", ascending=False).drop_duplicates("restaurant_name")
        if sub.empty:
            return sub, "Strict Mode: No exact matches found for all your selected criteria.", "strict_empty"
        return sub.head(top_n), "Exact match across all criteria (Strict Mode)", "exact"

    stages = [
        ("Exact price range, cuisine required", 0, True, "exact"),
        ("Relaxed: price range within ±1, cuisine required", 1, True, "relaxed_price"),
        ("Relaxed: price range within ±1, cuisine ignored", 1, False, "relaxed_cuisine"),
        ("Relaxed: any price range, cuisine ignored", 4, False, "relaxed_all"),
    ]

    selected_stage = stages[-1]
    for label, tol, need_cuisine, stage_id in stages:
        sub = pool
        if price_range is not None:
            sub = sub[(sub["price_range"] - price_range).abs() <= tol]
        if need_cuisine and wanted:
            sub = sub[sub["cuisine_match"] > 0]
        sub = sub.sort_values("score", ascending=False).drop_duplicates("restaurant_name")
        if len(sub) >= top_n:
            selected_stage = (label, tol, need_cuisine, stage_id)
            break

    return sub.head(top_n), selected_stage[0], selected_stage[3]

# ─── Sidebar Controls ─────────────────────────────────────────────────────────
st.sidebar.title("🍽️ TasteMatch")
st.sidebar.caption("Data-Driven Restaurant Intelligence")

countries = sorted(reco["country"].unique())
default_country_idx = countries.index("India") if "India" in countries else 0
country = st.sidebar.selectbox("Country", countries, index=default_country_idx)

cities = sorted(reco.loc[reco["country"] == country, "city"].unique())
city = st.sidebar.selectbox("City", cities)

in_city = reco[(reco["country"] == country) & (reco["city"] == city)]
if len(in_city) < 30:
    st.sidebar.warning(f"⚠️ Limited Data: Only {len(in_city)} rated restaurants in {city}.")

st.sidebar.subheader("Preferences")
any_price = st.sidebar.checkbox("Any price range")
price = None if any_price else st.sidebar.select_slider(
    "Price Tier",
    options=[1, 2, 3, 4],
    value=2,
    format_func=lambda x: f"{PRICE_TIERS[x]['name']} ({PRICE_TIERS[x]['dots']})"
)

cuisine_options = sorted(in_city["cuisine_list"].explode().dropna().unique())
cuisines = st.sidebar.multiselect("Cuisines (optional)", cuisine_options)

col_s1, col_s2 = st.sidebar.columns(2)
with col_s1:
    table = st.checkbox("Table Booking")
with col_s2:
    delivery = st.checkbox("Online Delivery")

mode = st.sidebar.radio("Recommendation Strategy", ["flexible", "strict"],
                        captions=["Progressive relaxation if needed", "Zero relaxation; exact only"])
top_n = st.sidebar.slider("Number of recommendations", min_value=1, max_value=10, value=3)

# ─── App Tabs ─────────────────────────────────────────────────────────────────
tab_reco, tab_insights, tab_about = st.tabs([
    "🔍 Recommender",
    "📊 Market Intelligence & ML",
    "ℹ️ Methodology & Deploy"
])

# ─── Tab 1: Recommender ───────────────────────────────────────────────────────
with tab_reco:
    st.title("🎯 Restaurant Recommendations")
    st.caption(f"Searching in **{city}, {country}** • Pool size: {len(in_city):,} rated restaurants")

    if st.sidebar.button("Get Recommendations", type="primary", use_container_width=True):
        res, note, stage_id = recommend(country, city, price, cuisines, table, delivery, top_n, mode)

        if res.empty:
            st.warning(note)
        else:
            if stage_id == "exact":
                st.markdown(f'<div class="badge-exact">✓ {note}</div>', unsafe_allow_html=True)
            elif "relaxed" in stage_id:
                st.markdown(f'<div class="badge-relaxed">ℹ️ {note}</div>', unsafe_allow_html=True)
            else:
                st.info(note)

            for rank, (_, r) in enumerate(res.iterrows(), 1):
                with st.container():
                    st.markdown(f"""
                    <div class="metric-card">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <div>
                                <span style="color:#C8F03C; font-weight:700; margin-right:8px;">#{rank:02d}</span>
                                <span class="restaurant-title">{r['restaurant_name']}</span>
                                <div style="color:#A1A1AA; font-size:0.9rem; margin-top:2px;">📍 {r['locality']} • 🍴 {r['cuisines']}</div>
                            </div>
                        </div>
                    </div>
                    """, unsafe_allow_html=True)

                    cost = r["average_cost_for_two"]
                    cost_txt = "n/a" if pd.isna(cost) else f"{int(cost):,} {r['currency']}"
                    tier = PRICE_TIERS.get(int(r["price_range"]), {"name": "Moderate", "dots": "●●○○"})

                    c1, c2, c3, c4 = st.columns(4)
                    c1.metric("Rating", f"★ {r['aggregate_rating']:.1f}", f"Bayesian: {r['weighted_rating']:.2f}")
                    c2.metric("Votes", f"{int(r['votes']):,}")
                    c3.metric("Cost for Two", cost_txt)
                    c4.metric("Price Tier", f"{tier['name']} {tier['dots']}")

                    why_text = f"Rated {r['aggregate_rating']} from {int(r['votes']):,} reviews in {r['locality']}. "
                    if cuisines:
                        matched = [c for c in cuisines if c in r['cuisine_list']]
                        if matched:
                            why_text += f"Matches your taste for {', '.join(matched)}. "
                    why_text += f"Table booking: {'Available' if r['has_table_booking'] == 1 else 'No'} • Delivery: {'Yes' if r['has_online_delivery'] == 1 else 'No'}."

                    st.markdown(f'<div class="why-this-pick">💡 <b>Why this pick:</b> {why_text}</div>', unsafe_allow_html=True)
                    st.divider()
    else:
        st.info("👈 Set your preferences in the sidebar and click **Get Recommendations** to generate picks.")

# ─── Tab 2: Market Intelligence & ML ──────────────────────────────────────────
with tab_insights:
    st.title("📊 Restaurant Market Intelligence")
    st.caption(f"Exploratory Data Analysis and ML Interpretability for **{city}** & global benchmark.")

    col_m1, col_m2 = st.columns(2)

    with col_m1:
        st.subheader("Top Cuisines in City")
        exploded = in_city["cuisine_list"].explode().value_counts().head(10).reset_index()
        exploded.columns = ["Cuisine", "Count"]
        if not exploded.empty:
            fig1 = px.bar(
                exploded, x="Count", y="Cuisine", orientation="h",
                color_discrete_sequence=["#C8F03C"],
                title=f"Top 10 Cuisines in {city}"
            )
            fig1.update_layout(yaxis=dict(autorange="reversed"), template="plotly_dark", height=350)
            st.plotly_chart(fig1, use_container_width=True)

    with col_m2:
        st.subheader("Price Tier vs. Rating")
        if not in_city.empty:
            tier_data = in_city.groupby("price_range")["aggregate_rating"].mean().reset_index()
            tier_data["Tier Name"] = tier_data["price_range"].map(lambda p: f"{PRICE_TIERS.get(p, {}).get('name', 'P')}")
            fig2 = px.bar(
                tier_data, x="Tier Name", y="aggregate_rating",
                color_discrete_sequence=["#4ECDC4"],
                title=f"Average Rating by Price Tier ({city})"
            )
            fig2.update_layout(yaxis=dict(range=[0, 5]), template="plotly_dark", height=350)
            st.plotly_chart(fig2, use_container_width=True)

    st.divider()
    st.subheader("🤖 Supervised Regression Experiments (from Zomato.ipynb)")
    st.caption("Cross-validated model performance on predicting restaurant quality.")

    ml_summary = pd.DataFrame([
        {"Model": "Baseline (City Mean)", "Split": "A (Cold-Start)", "Test MAE": "0.380", "R²": "0.120", "Notes": "Predicts city average rating."},
        {"Model": "Ridge Regression", "Split": "B (Established)", "Test MAE": "0.334", "R²": "0.590", "Notes": "Linear baseline with one-hot encoded cuisines."},
        {"Model": "Random Forest", "Split": "B (Established)", "Test MAE": "0.292", "R²": "0.665", "Notes": "Captures non-linear price and votes interactions."},
        {"Model": "HistGradientBoosting", "Split": "B (Established)", "Test MAE": "0.278", "R²": "0.695", "Notes": "Best performing model; handles rare cuisines gracefully."},
    ])
    st.dataframe(ml_summary, use_container_width=True, hide_index=True)

    st.write("**Top Feature Importances (Permutation):**")
    feat_df = pd.DataFrame([
        {"Feature": "Local Cost vs. Country Median", "Importance (MAE drop)": 0.085},
        {"Feature": "Price Tier (1-4)", "Importance (MAE drop)": 0.053},
        {"Feature": "Geographic Cluster", "Importance (MAE drop)": 0.041},
        {"Feature": "Table Booking Available", "Importance (MAE drop)": 0.032},
        {"Feature": "Cuisine Count", "Importance (MAE drop)": 0.019},
    ])
    fig3 = px.bar(feat_df, x="Importance (MAE drop)", y="Feature", orientation="h",
                  color_discrete_sequence=["#C8F03C"], title="Model Permutation Feature Importance")
    fig3.update_layout(yaxis=dict(autorange="reversed"), template="plotly_dark", height=280)
    st.plotly_chart(fig3, use_container_width=True)

# ─── Tab 3: Methodology & Deploy ──────────────────────────────────────────────
with tab_about:
    st.title("ℹ️ Methodology & Free Deployment")

    st.markdown("""
    ### 🔬 Scientific Methodology
    - **Dataset**: Kaggle Zomato Public Restaurant dataset (7,403 rated restaurants across 15 countries).
    - **Bayesian Weighted Rating ($W$)**:
      $$W = \\frac{v}{v + m} \\cdot R + \\frac{m}{v + m} \\cdot C$$
      where $v$ is restaurant votes, $m$ is the city threshold ($m=30$ votes), $R$ is restaurant average rating, and $C$ is the city average rating.
    - **Offline Benchmark**: Multi-stage hybrid recommender outperforms pure popularity baseline by over $3\\times$ in catalog coverage and $+14.0\\%$ in Precision@5.

    ---

    ### 🚀 Deploying to Streamlit Community Cloud (Free)
    1. Fork or push this repository to GitHub: `https://github.com/Joshcodings/resturant_recommedation`
    2. Visit **[share.streamlit.io](https://share.streamlit.io)** and log in with your GitHub account.
    3. Click **New app** and configure:
       - **Repository**: `Joshcodings/resturant_recommedation`
       - **Branch**: `main`
       - **Main file path**: `app.py`
    4. Click **Deploy!** Streamlit Cloud will install `requirements.txt` and launch your live application with a public URL (e.g., `https://resturant-recommedation.streamlit.app`).
    """)
