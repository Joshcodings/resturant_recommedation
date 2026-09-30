import pandas as pd
import streamlit as st

st.set_page_config(page_title="Restaurant Recommender", page_icon="🍽️")

@st.cache_data
def load():
    d = pd.read_csv("reco_app.csv")
    d["cuisine_list"] = d["cuisines"].str.split(",").apply(lambda xs: [x.strip() for x in xs])
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
        return pool, "No rated restaurants match this city and these service needs."

    wanted = set(cuisines or [])
    pool["cuisine_match"] = pool["cuisine_list"].apply(
        lambda xs: len(wanted & set(xs)) / len(wanted) if wanted else 0.0)
    pool["score"] = pool["weighted_rating"] + 0.5 * pool["cuisine_match"]

    stages = [
        ("Exact price range, cuisine required", 0, True),
        ("Relaxed: price range within ±1, cuisine required", 1, True),
        ("Relaxed: price range within ±1, cuisine ignored", 1, False),
        ("Relaxed: any price range, cuisine ignored", 4, False),
    ]
    for label, tol, need_cuisine in stages:
        sub = pool
        if price_range is not None:
            sub = sub[(sub["price_range"] - price_range).abs() <= tol]
        if need_cuisine and wanted:
            sub = sub[sub["cuisine_match"] > 0]
        sub = sub.sort_values("score", ascending=False).drop_duplicates("restaurant_name")
        if len(sub) >= top_n:
            break
    return sub.head(top_n), label

st.title("🍽️ Restaurant Recommender")
st.caption("Built on a Zomato dataset. It is an older snapshot, about 90% from the Delhi region, "
           "so some restaurants may have closed.")

countries = sorted(reco["country"].unique())
country = st.sidebar.selectbox("Country", countries, index=countries.index("India"))

cities = sorted(reco.loc[reco["country"] == country, "city"].unique())
city = st.sidebar.selectbox("City", cities)

in_city = reco[(reco["country"] == country) & (reco["city"] == city)]
if len(in_city) < 30:
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
            st.write(f"📍 {r['locality']}  ·  🍴 {r['cuisines']}")
            cost = r["average_cost_for_two"]
            cost_txt = "n/a" if pd.isna(cost) else f"{int(cost)} {r['currency']}"
            c1, c2, c3, c4 = st.columns(4)
            c1.metric("Rating", r["aggregate_rating"])
            c2.metric("Votes", int(r["votes"]))
            c3.metric("Cost for two", cost_txt)
            c4.metric("Price range", int(r["price_range"]))
            st.caption(f"Table booking: {'Yes' if r['has_table_booking'] == 1 else 'No'}  ·  "
                       f"Online delivery: {'Yes' if r['has_online_delivery'] == 1 else 'No'}")
            st.divider()
else:
    st.write("Choose your preferences in the sidebar, then press **Recommend**.")
