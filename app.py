import pandas as pd
import streamlit as st
import json
import os
import numpy as np

st.set_page_config(page_title="Restaurant Recommender", page_icon="🍽️")

@st.cache_data
def load():
    base_dir = os.path.join("tastematch", "public", "data")
    
    with open(os.path.join(base_dir, "restaurants.json"), "r", encoding="utf-8") as f:
        data = json.load(f)
        
    try:
        with open(os.path.join(base_dir, "manifest.json"), "r", encoding="utf-8") as f:
            manifest = json.load(f)
            for entry in manifest:
                if "file" in entry:
                    with open(os.path.join(base_dir, entry["file"]), "r", encoding="utf-8") as ext_f:
                        extra_data = json.load(ext_f)
                        data.extend(extra_data)
    except Exception as e:
        print(f"No valid manifest found or failed to load: {e}")
        
    d = pd.DataFrame(data)
    
    # Handle cuisines which might be None
    def split_cuisines(c):
        if pd.isna(c) or not isinstance(c, str):
            return []
        return [x.strip() for x in c.split(",")]
        
    d["cuisine_list"] = d["cuisines"].apply(split_cuisines)
    
    # Ensure nullable types for math
    if "aggregate_rating" in d.columns:
        d["aggregate_rating"] = pd.to_numeric(d["aggregate_rating"], errors="coerce")
    if "votes" in d.columns:
        d["votes"] = pd.to_numeric(d["votes"], errors="coerce")
    if "price_range" in d.columns:
        d["price_range"] = pd.to_numeric(d["price_range"], errors="coerce")
    if "weighted_rating" in d.columns:
        d["weighted_rating"] = pd.to_numeric(d["weighted_rating"], errors="coerce")
        
    return d

reco = load()

def recommend(country, city, price_range=None, cuisines=None,
              table_booking=False, online_delivery=False, top_n=3):
    pool = reco[(reco["country"] == country) & (reco["city"] == city)].copy()
    if table_booking:
        pool = pool[pool["has_table_booking"] == 1]
    if online_delivery:
        pool = pool[pool["has_online_delivery"] == 1]
    if pool.empty:
        return pool, "No restaurants match this city and these service needs."

    wanted = set(cuisines or [])
    pool["cuisine_match"] = pool["cuisine_list"].apply(
        lambda xs: len(wanted & set(xs)) / len(wanted) if wanted else 0.0)
        
    # Unrated logic fallback
    has_ratings = pool["weighted_rating"].notna().any()
    
    if has_ratings:
        pool["score"] = pool["weighted_rating"].fillna(0) + 0.5 * pool["cuisine_match"]
    else:
        # If unrated, score by cuisine_match
        pool["score"] = 0.5 * pool["cuisine_match"]
        # Add completeness bonus if data_source is OpenStreetMap
        if "data_source" in pool.columns:
            # simple completeness check for OSM
            pool["score"] += pool["phone"].notna().astype(int) * 0.1
            pool["score"] += pool["opening_hours"].notna().astype(int) * 0.1
            pool["score"] += pool["website"].notna().astype(int) * 0.1

    stages = [
        ("Exact price range, cuisine required", 0, True),
        ("Relaxed: price range within ±1, cuisine required", 1, True),
        ("Relaxed: price range within ±1, cuisine ignored", 1, False),
        ("Relaxed: any price range, cuisine ignored", 4, False),
    ]
    for label, tol, need_cuisine in stages:
        sub = pool
        if price_range is not None:
            # If price_range is missing in data, treat as mismatch unless tol is large enough
            # We can allow missing prices if tol >= 4 (any price range)
            if tol >= 4:
                pass # any price
            else:
                price_diff = (sub["price_range"] - price_range).abs()
                sub = sub[price_diff <= tol]
                
        if need_cuisine and wanted:
            sub = sub[sub["cuisine_match"] > 0]
        sub = sub.sort_values("score", ascending=False).drop_duplicates("restaurant_name")
        if len(sub) >= top_n:
            break
            
    if not has_ratings:
        label += " (Unrated city, ordered by completeness)"
        
    return sub.head(top_n), label

st.title("🍽️ Restaurant Recommender")
st.caption("Built on a Zomato dataset. It is an older snapshot, about 90% from the Delhi region, "
           "so some restaurants may have closed.")

countries = sorted(reco["country"].unique())
country = st.sidebar.selectbox("Country", countries, index=countries.index("India"))

cities = sorted(reco.loc[reco["country"] == country, "city"].unique())
city = st.sidebar.selectbox("City", cities)

in_city = reco[(reco["country"] == country) & (reco["city"] == city)]
has_ratings = in_city["weighted_rating"].notna().any()
if not has_ratings:
    st.sidebar.warning(f"{len(in_city)} locations from OpenStreetMap. No ratings available.")
elif len(in_city) < 30:
    st.sidebar.warning(f"Only {len(in_city)} rated restaurants here, so choices are limited.")

any_price = st.sidebar.checkbox("Any price range")
price = None if any_price else st.sidebar.select_slider(
    "Price range (1 = cheapest, 4 = priciest)", options=[1, 2, 3, 4], value=2)

cuisine_options = sorted(in_city["cuisine_list"].explode().dropna().unique())
cuisines = st.sidebar.multiselect("Cuisines (optional)", cuisine_options)
table = st.sidebar.checkbox("Needs table booking")
delivery = st.sidebar.checkbox("Needs online delivery")

if st.sidebar.button("Recommend", type="primary"):
    res, note = recommend(country, city, price, cuisines, table, delivery)
    if res.empty:
        st.warning(note)
    else:
        (st.info if note.startswith("Relaxed") else st.success)(note)
        for _, r in res.iterrows():
            st.subheader(r["restaurant_name"])
            st.write(f"📍 {r.get('locality', r['city'])}  ·  🍴 {r['cuisines']}")
            
            c1, c2, c3, c4 = st.columns(4)
            
            agg = r.get("aggregate_rating")
            c1.metric("Rating", f"{agg:.1f}" if pd.notna(agg) else "Unrated")
            
            votes = r.get("votes")
            c2.metric("Votes", int(votes) if pd.notna(votes) else "n/a")
            
            cost = r.get("average_cost_for_two")
            curr = r.get("currency", "")
            cost_txt = "n/a" if pd.isna(cost) else f"{int(cost)} {curr}"
            c3.metric("Cost for two", cost_txt)
            
            pr = r.get("price_range")
            c4.metric("Price range", int(pr) if pd.notna(pr) else "n/a")
            
            has_tb = r.get("has_table_booking")
            has_od = r.get("has_online_delivery")
            st.caption(f"Table booking: {'Yes' if has_tb == 1 else 'No' if has_tb == 0 else 'Unknown'}  ·  "
                       f"Online delivery: {'Yes' if has_od == 1 else 'No' if has_od == 0 else 'Unknown'}")
                       
            ds = r.get("data_source")
            if pd.notna(ds) and ds == "OpenStreetMap":
                st.caption(f"OSM Location | {r.get('place_type', '').replace('_', ' ').title()}")
            st.divider()
else:
    st.write("Choose your preferences in the sidebar, then press **Recommend**.")
