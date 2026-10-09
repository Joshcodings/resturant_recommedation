#!/usr/bin/env python3
"""
scripts/import_nigeria_restaurants.py
======================================
Offline importer for Nigerian restaurant data from OpenStreetMap via Overpass API.

IMPORTANT:
  - The deployed app NEVER calls this script or the Overpass API.
  - This script is run locally to refresh data/processed/restaurants_ng.json.
  - Raw Overpass responses are cached in data/raw/ and committed if < 10 MB gzipped.
  - Running twice with --from-cache gives byte-identical output (idempotent).

Usage:
  python scripts/import_nigeria_restaurants.py --city Lagos
  python scripts/import_nigeria_restaurants.py --all
  python scripts/import_nigeria_restaurants.py --city Lagos --from-cache
  python scripts/import_nigeria_restaurants.py --all --out data/processed/restaurants_ng.json
"""

import argparse
import gzip
import hashlib
import json
import os
import re
import sys
import time
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).parent.parent

REGIONS_FILE  = REPO_ROOT / "data" / "regions_ng.json"
RAW_DIR       = REPO_ROOT / "data" / "raw"
PROCESSED_DIR = REPO_ROOT / "data" / "processed"
PUBLIC_DATA   = REPO_ROOT / "tastematch" / "public" / "data"

DEFAULT_OUT   = PROCESSED_DIR / "restaurants_ng.json"
RAW_MANIFEST  = RAW_DIR / "manifest.json"

# ID encoding: stay within JavaScript safe integer range.
# Zomato IDs are all < 20_000_000.
# Nigerian IDs: 10_000_000_000_000 + osm_id*10 + type_code
# type_code: node=1, way=2, relation=3
OSM_ID_BASE = 10_000_000_000_000
TYPE_CODE   = {"node": 1, "way": 2, "relation": 3}

OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://z.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

USER_AGENT = (
    "TasteMatch-DataIngestion/1.0 "
    "(https://github.com/Joshcodings/resturant_recommedation; "
    "restaurant-recommendation educational project)"
)

# Minimum seconds between Overpass requests (etiquette)
REQUEST_GAP_S = 12

# Cuisine normalisation table
# Keys: lowercase OSM tag values (after splitting on ";").
# Values: display name used in the app.
# Unmapped values go into cuisines_raw and are shown as "Other".
CUISINE_MAP: dict[str, str] = {
    "local":              "Nigerian",
    "nigerian":           "Nigerian",
    "african":            "African",
    "west_african":       "West African",
    "continental":        "Continental",
    "international":      "International",
    "chinese":            "Chinese",
    "indian":             "Indian",
    "lebanese":           "Lebanese",
    "italian":            "Italian",
    "american":           "American",
    "fast_food":          "Fast Food",
    "burger":             "Fast Food",
    "chicken":            "Fast Food",
    "shawarma":           "Shawarma",
    "pizza":              "Pizza",
    "grill":              "Grill",
    "bbq":                "BBQ",
    "barbecue":           "BBQ",
    "seafood":            "Seafood",
    "fish":               "Seafood",
    "soup":               "Nigerian",
    "suya":               "Nigerian",
    "rice":               "Nigerian",
    "jollof":             "Nigerian",
    "cafe":               "Cafe",
    "coffee":             "Cafe",
    "bakery":             "Bakery",
    "pastry":             "Bakery",
    "sandwich":           "Sandwiches",
    "turkish":            "Turkish",
    "chinese;continental": "Chinese, Continental",
    "dessert":            "Desserts",
    "ice_cream":          "Desserts",
    "juice":              "Beverages",
    "smoothie":           "Beverages",
    "vegetarian":         "Vegetarian",
    "vegan":              "Vegan",
    "asian":              "Asian",
    "japanese":           "Japanese",
    "sushi":              "Japanese",
    "korean":             "Korean",
    "mexican":            "Mexican",
    "mediterranean":      "Mediterranean",
    "greek":              "Mediterranean",
    "european":           "European",
    "thai":               "Thai",
    "french":             "French",
    "spanish":            "Spanish",
    "portuguese":         "Portuguese",
    "steak":              "Grill",
    "latin_american":     "Latin American",
    "middle_eastern":     "Middle Eastern",
    "arab":               "Middle Eastern",
    "persian":            "Middle Eastern",
    "ethiopian":          "African",
    "ghanaian":           "African",
    "west african":       "West African",
    "noodle":             "Asian",
    "noodles":            "Asian",
    "ramen":              "Japanese",
    "pasta":              "Italian",
    "regional":           "Nigerian",
    "brunch":             "Cafe",
    "steak_house":        "Grill",
    "coffee_shop":        "Cafe",
    "african_dishes":     "African",
    "donut":              "Bakery",
    "doughnut":           "Bakery",
}

# Generic words stripped when normalising restaurant names for dedup
STRIP_WORDS = {
    "restaurant", "restaurants", "cafe", "cafes", "bar", "bars",
    "fast", "food", "kitchen", "grill", "grills", "eatery", "eateries",
    "lounge", "lounges", "hotel", "hotels", "suites", "bistro", "bistros",
    "joint", "place", "spot", "house", "hub", "ng", "ltd", "limited",
    "and", "&", "the",
}


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def log(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def normalise_name(name: str) -> str:
    """Lowercase, strip accents, strip punctuation, strip generic words."""
    name = unicodedata.normalize("NFKD", name)
    name = "".join(c for c in name if not unicodedata.combining(c))
    name = name.lower()
    name = re.sub(r"[^\w\s]", " ", name)
    tokens = [t for t in name.split() if t not in STRIP_WORDS and len(t) > 1]
    return " ".join(tokens)


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in metres."""
    import math
    R = 6_371_000
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def make_restaurant_id(osm_type: str, osm_id: int) -> int:
    """
    Deterministic, stable integer ID.
    Formula: 10_000_000_000_000 + osm_id * 10 + type_code
    Max safe JS integer = 9_007_199_254_740_991.
    Largest plausible OSM id as of 2025 is ~14 billion → 140_000_000_000 + base = well within range.
    """
    return OSM_ID_BASE + osm_id * 10 + TYPE_CODE.get(osm_type, 0)


def is_valid_nigeria_coord(lat: float, lon: float) -> bool:
    """Rough bounding box for Nigeria: lat 4.2–14.0, lon 2.7–14.7"""
    return 4.2 <= lat <= 14.0 and 2.7 <= lon <= 14.7


def normalise_cuisines(raw_tag: str | None) -> tuple[str, str | None]:
    """
    Returns (cuisines_display, cuisines_raw).
    cuisines_display: normalised comma-separated string or "Unspecified".
    cuisines_raw: the original OSM tag value, or None.
    """
    if not raw_tag or not raw_tag.strip():
        return "Unspecified", None

    raw_clean = raw_tag.strip()
    parts = [p.strip().lower() for p in re.split(r"[;,]", raw_clean) if p.strip()]
    mapped, unmapped = [], []
    for part in parts:
        if part in CUISINE_MAP:
            m = CUISINE_MAP[part]
            if m not in mapped:
                mapped.append(m)
        else:
            unmapped.append(part)

    if not mapped and unmapped:
        return "Other", raw_clean
    if mapped:
        return ", ".join(mapped), raw_clean if raw_clean else None
    return "Unspecified", None


def place_type_from_amenity(amenity: str) -> str:
    mapping = {"restaurant": "restaurant", "fast_food": "fast_food",
               "cafe": "cafe", "bar": "bar"}
    return mapping.get(amenity, "restaurant")


# ---------------------------------------------------------------------------
# Overpass querying
# ---------------------------------------------------------------------------

def check_overpass_status(endpoint: str) -> bool:
    """Return True if endpoint reports available slots."""
    import urllib.request
    status_url = endpoint.replace("/interpreter", "/status")
    try:
        req = urllib.request.Request(status_url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode()
            # If body contains "Slot available" or similar, it's ready
            return "available" in body.lower() or "slots" in body.lower() or resp.status == 200
    except Exception as e:
        log(f"  Status check failed for {endpoint}: {e}")
        return False


def overpass_query(query: str, cache_path: Path, from_cache: bool) -> dict[str, Any]:
    """
    Execute an Overpass query or load from cache.
    Saves raw response to cache_path.
    Returns parsed JSON dict.
    """
    if from_cache and cache_path.exists():
        log(f"  ✓ Loading from cache: {cache_path.name}")
        with open(cache_path, encoding="utf-8") as f:
            return json.load(f)

    import urllib.request, urllib.parse, urllib.error

    last_error = None
    for attempt, endpoint in enumerate(OVERPASS_ENDPOINTS * 3):  # up to 6 attempts
        try:
            log(f"  → Trying {endpoint} (attempt {attempt + 1})")
            if not check_overpass_status(endpoint):
                log(f"    Status check failed, trying next...")
                time.sleep(REQUEST_GAP_S)
                continue

            data = urllib.parse.urlencode({"data": query}).encode()
            req = urllib.request.Request(
                endpoint,
                data=data,
                headers={"User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=180) as resp:
                body = resp.read()
                result = json.loads(body)
                # Cache raw response
                cache_path.parent.mkdir(parents=True, exist_ok=True)
                with open(cache_path, "wb") as f:
                    f.write(body)
                log(f"    ✓ {len(result.get('elements', []))} elements received, cached to {cache_path.name}")
                time.sleep(REQUEST_GAP_S)
                return result

        except urllib.error.HTTPError as e:
            if e.code in (429, 504):
                wait = REQUEST_GAP_S * (2 ** attempt)
                log(f"    Rate limited ({e.code}), waiting {wait}s...")
                time.sleep(wait)
                last_error = e
            else:
                raise
        except Exception as e:
            log(f"    Error: {e}")
            last_error = e
            time.sleep(REQUEST_GAP_S)

    raise RuntimeError(f"All Overpass attempts failed. Last error: {last_error}")


def build_admin_area_query(region: dict) -> tuple[str, str]:
    """
    Build Overpass QL query using admin_area name lookup.
    Returns (query_string, query_label).
    """
    name = region["osm_admin_name"]
    level = region["osm_admin_level"]
    label = f"{region['city']}_admin"

    query = f"""[out:json][timeout:180][maxsize:536870912];
area["name"="{name}"]["admin_level"="{level}"]["boundary"="administrative"]->.a;
(
  node["amenity"~"^(restaurant|fast_food|cafe|bar)$"]["name"](area.a);
  way["amenity"~"^(restaurant|fast_food|cafe|bar)$"]["name"](area.a);
  relation["amenity"~"^(restaurant|fast_food|cafe|bar)$"]["name"](area.a);
);
out center tags;"""
    return query, label


def build_around_query(region: dict) -> tuple[str, str]:
    """
    Fallback: query within radius around a centre point.
    """
    lat = region["fallback_centre_lat"]
    lon = region["fallback_centre_lon"]
    radius = region["fallback_radius_m"]
    label = f"{region['city']}_around"

    query = f"""[out:json][timeout:180][maxsize:536870912];
(
  node["amenity"~"^(restaurant|fast_food|cafe|bar)$"]["name"](around:{radius},{lat},{lon});
  way["amenity"~"^(restaurant|fast_food|cafe|bar)$"]["name"](around:{radius},{lat},{lon});
  relation["amenity"~"^(restaurant|fast_food|cafe|bar)$"]["name"](around:{radius},{lat},{lon});
);
out center tags;"""
    return query, label


def verify_boundary(region: dict, from_cache: bool) -> tuple[dict, str, bool]:
    """
    Verify the OSM boundary matches and print what we found.
    Returns (raw_result, query_label, used_fallback).
    """
    import urllib.request, urllib.parse

    # First do a boundary verification query (separate lightweight request)
    name = region["osm_admin_name"]
    level = region["osm_admin_level"]

    log(f"\n  Verifying OSM boundary for: {region['city']}")
    log(f"    Looking up: name='{name}', admin_level={level}")

    verify_query = f"""[out:json][timeout:30];
area["name"="{name}"]["admin_level"="{level}"]["boundary"="administrative"];
out tags;"""

    verify_cache = RAW_DIR / f"verify_{region['city'].lower().replace(' ','_')}.json"
    if from_cache and not verify_cache.exists():
        log(f"    (from-cache: no verify cache, using fallback query)")
        return {}, "admin_fallback", True

    try:
        result = overpass_query(verify_query, verify_cache, from_cache)
        elements = result.get("elements", [])
        if elements:
            for el in elements[:3]:
                tags = el.get("tags", {})
                log(f"    ✓ Found: id={el.get('id')} name='{tags.get('name')}' "
                    f"admin_level={tags.get('admin_level')} "
                    f"boundary={tags.get('boundary')}")
            return result, "admin", False
        else:
            log(f"    ✗ No matching boundary found. Will use fallback (around).")
            return result, "admin_empty", True
    except Exception as e:
        log(f"    ✗ Boundary verify failed: {e}. Will use fallback.")
        return {}, "admin_error", True


# ---------------------------------------------------------------------------
# Locality enrichment
# ---------------------------------------------------------------------------

LOCALITY_CACHE: dict[str, list[dict]] = {}

def get_all_localities_for_city(region: dict, from_cache: bool) -> list[dict]:
    """Fetch all suburbs/neighbourhoods/quarters for the city once."""
    city = region["city"]
    if city in LOCALITY_CACHE:
        return LOCALITY_CACHE[city]

    method = region.get("method", "admin_area")
    if method == "admin_area":
        name = region["osm_admin_name"]
        level = region["osm_admin_level"]
        query = f"""[out:json][timeout:180];
area["name"="{name}"]["admin_level"="{level}"]["boundary"="administrative"]->.a;
node["place"~"^(suburb|neighbourhood|quarter)$"](area.a);
out center tags;"""
        qlabel = "admin"
    else:
        lat = region["fallback_centre_lat"]
        lon = region["fallback_centre_lon"]
        radius = region["fallback_radius_m"]
        query = f"""[out:json][timeout:180];
node["place"~"^(suburb|neighbourhood|quarter)$"](around:{radius},{lat},{lon});
out center tags;"""
        qlabel = "around"

    cache_path = RAW_DIR / f"localities_{city.lower().replace(' ', '_')}_{qlabel}.json"
    try:
        result = overpass_query(query, cache_path, from_cache)
        elements = result.get("elements", [])
        LOCALITY_CACHE[city] = elements
        return elements
    except Exception as e:
        log(f"  ✗ Failed to fetch localities for {city}: {e}")
        return []

def fetch_locality_for_coord(lat: float, lon: float, region: dict, from_cache: bool) -> str | None:
    """Find the nearest place=suburb|neighbourhood|quarter within 2 km locally."""
    elements = get_all_localities_for_city(region, from_cache)
    if not elements:
        return None

    # Pick nearest within 2000m
    best_dist = 2001.0
    best_name = None
    for el in elements:
        elat = el.get("lat")
        elon = el.get("lon")
        if elat is None or elon is None:
            continue
        d = haversine(lat, lon, float(elat), float(elon))
        if d < best_dist:
            best_dist = d
            tags = el.get("tags", {})
            best_name = tags.get("name") or tags.get("name:en")
    
    return best_name


# ---------------------------------------------------------------------------
# Element parsing
# ---------------------------------------------------------------------------

def parse_element(el: dict, region: dict, retrieved_at: str,
                  from_cache: bool) -> dict | None:
    """
    Convert an Overpass element to a canonical restaurant record.
    Returns None if the element should be dropped.
    """
    city = region["city"]
    state = region["state"]
    
    tags = el.get("tags", {})
    osm_type = el.get("type", "node")
    osm_id   = el.get("id", 0)

    # ── Coordinates ────────────────────────────────────────────────────────
    # 'out center' gives way/relation a centre point in el["center"]
    lat = el.get("lat") or (el.get("center") or {}).get("lat")
    lon = el.get("lon") or (el.get("center") or {}).get("lon")

    if lat is None or lon is None:
        return None  # drop: no coordinates
    lat, lon = float(lat), float(lon)
    if not is_valid_nigeria_coord(lat, lon):
        return None  # drop: outside Nigeria

    # ── Name ───────────────────────────────────────────────────────────────
    name = (tags.get("name") or tags.get("name:en") or "").strip()
    if not name:
        return None  # drop: no name (per spec)

    # ── Amenity / place_type ───────────────────────────────────────────────
    amenity = tags.get("amenity", "restaurant")
    place_type = place_type_from_amenity(amenity)

    # ── Address ────────────────────────────────────────────────────────────
    addr_parts = []
    for key in ("addr:housenumber", "addr:street"):
        v = tags.get(key)
        if v:
            addr_parts.append(v)
    address = " ".join(addr_parts) if addr_parts else None

    # ── Locality (chain: addr:suburb -> addr:neighbourhood -> OSM reverse) ─
    locality = (
        tags.get("addr:suburb")
        or tags.get("addr:neighbourhood")
        or None
    )
    # Reverse geocode nearest place only if locality still missing
    if not locality:
        locality = fetch_locality_for_coord(lat, lon, region, from_cache)

    # ── Cuisines ───────────────────────────────────────────────────────────
    cuisines_display, cuisines_raw = normalise_cuisines(tags.get("cuisine"))

    # ── Booking (from OSM `reservation` tag, NOT `delivery`) ───────────────
    reservation = tags.get("reservation", "").lower().strip()
    if reservation == "yes":
        has_table_booking: int | None = 1
    elif reservation == "no":
        has_table_booking = 0
    else:
        has_table_booking = None

    # ── Optional contact / hours ───────────────────────────────────────────
    opening_hours = tags.get("opening_hours") or None
    phone         = tags.get("phone") or tags.get("contact:phone") or None
    website       = tags.get("website") or tags.get("contact:website") or None

    # ── ID ─────────────────────────────────────────────────────────────────
    restaurant_id = make_restaurant_id(osm_type, osm_id)

    source_url = f"https://www.openstreetmap.org/{osm_type}/{osm_id}"

    return {
        "restaurant_id":        restaurant_id,
        "restaurant_name":      name,
        "country":              "Nigeria",
        "state":                state,
        "city":                 city,
        "locality":             locality,
        "address":              address,
        "cuisines":             cuisines_display,
        "cuisines_raw":         cuisines_raw,
        "place_type":           place_type,
        "latitude":             round(lat, 7),
        "longitude":            round(lon, 7),
        "currency":             "NGN",
        "price_range":          None,
        "average_cost_for_two": None,
        "aggregate_rating":     None,
        "votes":                None,
        "weighted_rating":      None,
        "has_table_booking":    has_table_booking,
        "has_online_delivery":  None,
        "opening_hours":        opening_hours,
        "phone":                phone,
        "website":              website,
        "data_source":          "OpenStreetMap",
        "source_id":            f"{osm_type}/{osm_id}",
        "source_url":           source_url,
        "retrieved_at":         retrieved_at,
    }


# ---------------------------------------------------------------------------
# Deduplication
# ---------------------------------------------------------------------------

def dedup_records(records: list[dict]) -> tuple[list[dict], list[dict]]:
    """
    Merge records with same normalised name within 50 m.
    Different branches (same name, far apart) stay separate.
    Returns (deduped_records, merge_log).
    """
    merge_log = []
    clusters: list[list[dict]] = []

    for rec in records:
        norm = normalise_name(rec["restaurant_name"])
        placed = False
        for cluster in clusters:
            rep = cluster[0]
            rep_norm = normalise_name(rep["restaurant_name"])
            if norm == rep_norm:
                dist = haversine(rec["latitude"], rec["longitude"],
                                 rep["latitude"], rep["longitude"])
                if dist <= 50:
                    cluster.append(rec)
                    placed = True
                    break
        if not placed:
            clusters.append([rec])

    deduped = []
    for cluster in clusters:
        if len(cluster) == 1:
            deduped.append(cluster[0])
        else:
            # Keep record with most non-null fields
            def non_null_count(r: dict) -> int:
                return sum(1 for v in r.values() if v is not None)

            winner = max(cluster, key=non_null_count)
            deduped.append(winner)
            merge_log.append({
                "kept_id":    winner["restaurant_id"],
                "kept_name":  winner["restaurant_name"],
                "dropped":    [
                    {"id": r["restaurant_id"], "name": r["restaurant_name"], "source_id": r["source_id"]}
                    for r in cluster if r["restaurant_id"] != winner["restaurant_id"]
                ],
                "distance_m": round(haversine(
                    cluster[0]["latitude"], cluster[0]["longitude"],
                    cluster[1]["latitude"], cluster[1]["longitude"]
                )) if len(cluster) > 1 else 0,
            })

    return deduped, merge_log


# ---------------------------------------------------------------------------
# Coverage report
# ---------------------------------------------------------------------------

def print_coverage_report(records: list[dict], city: str) -> None:
    n = len(records)
    if n == 0:
        log(f"\n{'='*60}")
        log(f"COVERAGE REPORT: {city}")
        log(f"  Records: 0")
        log(f"{'='*60}")
        return

    def pct(count: int) -> str:
        return f"{count:4d} / {n} ({100*count/n:.1f}%)"

    has_cuisine    = sum(1 for r in records if r["cuisines"] not in ("Unspecified", "Other"))
    has_locality   = sum(1 for r in records if r["locality"])
    has_hours      = sum(1 for r in records if r["opening_hours"])
    has_phone      = sum(1 for r in records if r["phone"])
    has_website    = sum(1 for r in records if r["website"])
    has_booking    = sum(1 for r in records if r["has_table_booking"] is not None)
    has_address    = sum(1 for r in records if r["address"])

    place_types: dict[str, int] = {}
    for r in records:
        place_types[r["place_type"]] = place_types.get(r["place_type"], 0) + 1

    log(f"\n{'='*60}")
    log(f"COVERAGE REPORT: {city}")
    log(f"  Total records:      {n}")
    log(f"  With cuisine:       {pct(has_cuisine)}")
    log(f"  With locality:      {pct(has_locality)}")
    log(f"  With opening_hours: {pct(has_hours)}")
    log(f"  With phone:         {pct(has_phone)}")
    log(f"  With website:       {pct(has_website)}")
    log(f"  With booking info:  {pct(has_booking)}")
    log(f"  With address:       {pct(has_address)}")
    log(f"  By place_type:")
    for pt, cnt in sorted(place_types.items(), key=lambda x: -x[1]):
        log(f"    {pt:<15} {cnt}")
    log(f"{'='*60}")

    # 30 most-common unmapped raw cuisine values
    unmapped: dict[str, int] = {}
    for r in records:
        if r["cuisines"] in ("Other", "Unspecified") and r["cuisines_raw"]:
            parts = [p.strip().lower() for p in re.split(r"[;,]", r["cuisines_raw"])]
            for part in parts:
                if part and part not in CUISINE_MAP:
                    unmapped[part] = unmapped.get(part, 0) + 1
    if unmapped:
        log("\n  30 most-common UNMAPPED cuisine tags (extend CUISINE_MAP if needed):")
        for tag, cnt in sorted(unmapped.items(), key=lambda x: -x[1])[:30]:
            log(f"    {cnt:4d}  {tag!r}")
    else:
        log("\n  No unmapped cuisine tags.")
    log("")


# ---------------------------------------------------------------------------
# Raw manifest management
# ---------------------------------------------------------------------------

def load_raw_manifest() -> list[dict]:
    if RAW_MANIFEST.exists():
        with open(RAW_MANIFEST, encoding="utf-8") as f:
            return json.load(f)
    return []


def save_raw_manifest(entries: list[dict]) -> None:
    RAW_MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    with open(RAW_MANIFEST, "w", encoding="utf-8") as f:
        json.dump(entries, f, indent=2, ensure_ascii=False, sort_keys=True)
        f.write("\n")


def record_raw_entry(cache_path: Path, query: str, element_count: int) -> None:
    entries = load_raw_manifest()
    sha = sha256_file(cache_path) if cache_path.exists() else "n/a"
    entry = {
        "file": cache_path.name,
        "query_preview": query[:200],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "element_count": element_count,
        "sha256": sha,
    }
    # Replace existing entry for same file
    entries = [e for e in entries if e.get("file") != cache_path.name]
    entries.append(entry)
    save_raw_manifest(sorted(entries, key=lambda e: e["file"]))


# ---------------------------------------------------------------------------
# Main import function
# ---------------------------------------------------------------------------

def import_city(region: dict, from_cache: bool) -> list[dict]:
    city     = region["city"]
    state    = region["state"]
    method   = region.get("method", "admin_area")
    retrieved_at = datetime.now(timezone.utc).isoformat()

    log(f"\n{'─'*60}")
    log(f"Importing: {city}, {state}, Nigeria")

    used_fallback = False

    if method == "admin_area":
        # Step 1: verify boundary
        _, verify_label, used_fallback = verify_boundary(region, from_cache)

    if used_fallback or method == "around":
        query, qlabel = build_around_query(region)
        log(f"  Using fallback around query (radius {region['fallback_radius_m']} m)")
    else:
        query, qlabel = build_admin_area_query(region)

    cache_path = RAW_DIR / f"ng_{city.lower().replace(' ', '_')}_{qlabel}.json"
    elements = []
    try:
        raw = overpass_query(query, cache_path, from_cache)
        elements = raw.get("elements", [])
        record_raw_entry(cache_path, query, len(elements))
        log(f"  Elements returned: {len(elements)}")
    except Exception as e:
        if method == "admin_area" and not used_fallback:
            log(f"  Admin-area query failed ({e}). Retrying with fallback around query...")
            query, qlabel = build_around_query(region)
            cache_path = RAW_DIR / f"ng_{city.lower().replace(' ', '_')}_{qlabel}.json"
            raw = overpass_query(query, cache_path, from_cache)
            elements = raw.get("elements", [])
            record_raw_entry(cache_path, query, len(elements))
            log(f"  Fallback elements returned: {len(elements)}")
            used_fallback = True
        else:
            raise

    # If admin_area returned 0, retry with fallback
    if len(elements) == 0 and method == "admin_area" and not used_fallback:
        log(f"  Admin-area query returned 0 elements. Retrying with fallback around query...")
        query, qlabel = build_around_query(region)
        cache_path = RAW_DIR / f"ng_{city.lower().replace(' ', '_')}_{qlabel}.json"
        raw = overpass_query(query, cache_path, from_cache)
        elements = raw.get("elements", [])
        record_raw_entry(cache_path, query, len(elements))
        log(f"  Fallback elements returned: {len(elements)}")

    # Parse elements
    records: list[dict] = []
    skipped_no_name = 0
    skipped_no_coord = 0
    skipped_outside_ng = 0

    for el in elements:
        tags = el.get("tags", {})
        name = tags.get("name") or tags.get("name:en")
        lat = el.get("lat") or (el.get("center") or {}).get("lat")
        lon = el.get("lon") or (el.get("center") or {}).get("lon")

        if not name:
            skipped_no_name += 1
            continue
        if lat is None or lon is None:
            skipped_no_coord += 1
            continue
        if not is_valid_nigeria_coord(float(lat), float(lon)):
            skipped_outside_ng += 1
            continue

        rec = parse_element(el, region, retrieved_at, from_cache)
        if rec:
            records.append(rec)

    log(f"  Parsed: {len(records)} records")
    log(f"  Dropped — no name: {skipped_no_name}, no coord: {skipped_no_coord}, outside NG: {skipped_outside_ng}")

    # Dedup
    deduped, merge_log = dedup_records(records)
    log(f"  After dedup: {len(deduped)} records ({len(merge_log)} merges)")

    # Save dedup log (append)
    dedup_log_path = PROCESSED_DIR / "dedup_log.json"
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    existing_log = []
    if dedup_log_path.exists():
        with open(dedup_log_path, encoding="utf-8") as f:
            existing_log = json.load(f)
    # Replace entries for this city
    existing_log = [e for e in existing_log if e.get("city") != city]
    if merge_log:
        existing_log.extend([{"city": city, **e} for e in merge_log])
    with open(dedup_log_path, "w", encoding="utf-8") as f:
        json.dump(sorted(existing_log, key=lambda e: (e.get("city",""), e.get("kept_id",0))),
                  f, indent=2, ensure_ascii=False)

    # Coverage report (always printed)
    print_coverage_report(deduped, city)

    return deduped


def check_gate(records: list[dict], city: str) -> None:
    """GATE check: Stage 1 requires 200 for Lagos; Stage 5 requires >= 30 places for other cities."""
    n = len(records)
    min_required = 200 if city.lower() == "lagos" else 30
    cuisine_pct = sum(1 for r in records if r["cuisines"] not in ("Unspecified", "Other")) / max(n, 1)
    if n < min_required or cuisine_pct < 0.15:
        log(f"\n⚠️  GATE TRIGGERED for {city}:")
        log(f"   Records: {n} (minimum {min_required} required)")
        log(f"   Cuisine coverage: {cuisine_pct:.1%} (minimum 15% required)")
        log(f"\n   Options:")
        log(f"   1. Extend CUISINE_MAP to improve cuisine coverage.")
        log(f"   2. Check regions_ng.json boundary definition for {city}.")
        log(f"   3. Try fallback around query (--city {city} without --from-cache).")
        log(f"   4. Report to maintainer — OSM coverage for {city} may be low.")
        log(f"\n   Stopping. Do not continue until gate is resolved.")
        sys.exit(2)
    log(f"\n✓ Gate check passed: {n} records, {cuisine_pct:.1%} with cuisine")


# ---------------------------------------------------------------------------
# Output writing (deterministic / idempotent)
# ---------------------------------------------------------------------------

def write_output(all_records: list[dict], out_path: Path) -> None:
    """
    Write sorted, deterministic JSON.
    Sort by restaurant_id ascending, keys sorted, fixed indent.
    Idempotent: identical input → identical bytes.
    """
    out_path.parent.mkdir(parents=True, exist_ok=True)
    sorted_records = sorted(all_records, key=lambda r: r["restaurant_id"])

    with open(out_path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(sorted_records, f, indent=2, ensure_ascii=False, sort_keys=True)
        f.write("\n")

    sha = sha256_file(out_path)
    log(f"\n✓ Written {len(sorted_records)} records → {out_path}")
    log(f"  SHA-256: {sha}")

    # Sync copy to tastematch/public/data/
    public_copy = PUBLIC_DATA / out_path.name
    public_copy.parent.mkdir(parents=True, exist_ok=True)
    import shutil
    shutil.copy2(out_path, public_copy)
    sha2 = sha256_file(public_copy)
    assert sha == sha2, f"SYNC FAILED: {out_path} vs {public_copy}"
    log(f"  Synced byte-identical copy → {public_copy}")

    # Update manifest.json record count and sync
    manifest_path = REPO_ROOT / "data" / "manifest.json"
    if manifest_path.exists():
        with open(manifest_path, "r", encoding="utf-8") as mf:
            m_data = json.load(mf)
        for item in m_data:
            if item.get("file") == out_path.name:
                item["recordCount"] = len(sorted_records)
        with open(manifest_path, "w", encoding="utf-8", newline="\n") as mf:
            json.dump(m_data, mf, indent=2)
            mf.write("\n")
        manifest_public = PUBLIC_DATA / "manifest.json"
        shutil.copy2(manifest_path, manifest_public)
        log(f"  Synced manifest ({len(sorted_records)} records) → {manifest_public}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Import Nigerian restaurants from OpenStreetMap.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--city", metavar="NAME", help="Import a single city by name")
    group.add_argument("--all",  action="store_true", help="Import all cities in regions_ng.json")
    parser.add_argument("--from-cache", action="store_true",
                        help="Use cached Overpass responses (no network calls)")
    parser.add_argument("--out", default=str(DEFAULT_OUT), metavar="PATH",
                        help="Output path for restaurants_ng.json")
    args = parser.parse_args()

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    with open(REGIONS_FILE, encoding="utf-8") as f:
        regions: list[dict] = json.load(f)

    if args.city:
        target = args.city.strip().lower()
        matching = [r for r in regions if r["city"].lower() == target]
        if not matching:
            log(f"Error: city '{args.city}' not found in {REGIONS_FILE}")
            log(f"Available: {[r['city'] for r in regions]}")
            sys.exit(1)
        to_import = matching
    else:
        to_import = regions

    # Load existing output to merge (idempotent re-run)
    out_path = Path(args.out)
    existing: list[dict] = []
    if out_path.exists():
        with open(out_path, encoding="utf-8") as f:
            existing = json.load(f)
        # Remove records for the cities we're about to re-import
        cities_being_imported = {r["city"] for r in to_import}
        existing = [r for r in existing if r.get("city") not in cities_being_imported]
        log(f"Loaded {len(existing)} existing records from {out_path} (excluded cities being re-imported)")

    all_new: list[dict] = []
    for region in to_import:
        city_records = import_city(region, args.from_cache)
        all_new.extend(city_records)

        # GATE check: only for first city when --city is used
        if args.city:
            check_gate(city_records, region["city"])

    combined = existing + all_new
    write_output(combined, out_path)

    # Check for gzip size of raw cache
    raw_json_files = list(RAW_DIR.glob("ng_*.json"))
    total_raw = sum(f.stat().st_size for f in raw_json_files)
    log(f"\nRaw cache: {len(raw_json_files)} files, {total_raw/1024:.0f} KB uncompressed")

    # Estimate gzip size
    sample = raw_json_files[0] if raw_json_files else None
    if sample:
        with open(sample, "rb") as f:
            raw_bytes = f.read()
        compressed = gzip.compress(raw_bytes)
        ratio = len(compressed) / len(raw_bytes)
        estimated_gz = total_raw * ratio
        log(f"  Estimated gzipped total: {estimated_gz/1024/1024:.1f} MB")
        if estimated_gz > 10 * 1024 * 1024:
            log("  ⚠️  Total > 10 MB gzipped. Add data/raw/ng_*.json to .gitignore and commit only manifest.")
        else:
            log("  ✓ Total < 10 MB gzipped. Safe to commit raw files.")

    log("\nDone.")


if __name__ == "__main__":
    main()
