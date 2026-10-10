#!/usr/bin/env python3
"""
scripts/sources/osm_extract.py
==============================
Measures and extracts all food establishments across Nigeria from OpenStreetMap.
Supports:
  1. Geofabrik Nigeria .osm.pbf (if pyosmium is installed and file provided via --pbf)
  2. Overpass API meta extract across ISO3166-1=NG (extracts all nodes/ways with meta)
  3. Cached extraction from data/raw/nigeria_full_osm.json

City Assignment Chain:
  Step 1: addr:city
  Step 2: addr:state mapping
  Step 3: Point-in-polygon / state boundary bounding checks
  Step 4: Nearest known Nigerian city/town within 25 km
  Step 5: "Unassigned"
"""

import argparse
import json
import math
import os
import random
import re
import sys
import time
import urllib.parse
import urllib.request

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
RAW_DIR = REPO_ROOT / "data" / "raw"
PROCESSED_DIR = REPO_ROOT / "data" / "processed"

# Major Nigerian cities / towns coordinates (lat, lon, state) for nearest-town fallback (<25km)
KNOWN_NIGERIAN_CITIES = [
    {"city": "Lagos", "state": "Lagos", "lat": 6.5244, "lon": 3.3792},
    {"city": "Ikeja", "state": "Lagos", "lat": 6.5960, "lon": 3.3435},
    {"city": "Lekki", "state": "Lagos", "lat": 6.4698, "lon": 3.5852},
    {"city": "Abuja", "state": "FCT", "lat": 9.0579, "lon": 7.4951},
    {"city": "Gwagwalada", "state": "FCT", "lat": 8.9431, "lon": 7.0864},
    {"city": "Ibadan", "state": "Oyo", "lat": 7.3775, "lon": 3.9470},
    {"city": "Ogbomosho", "state": "Oyo", "lat": 8.1333, "lon": 4.2500},
    {"city": "Port Harcourt", "state": "Rivers", "lat": 4.8156, "lon": 7.0498},
    {"city": "Kano", "state": "Kano", "lat": 12.0022, "lon": 8.5920},
    {"city": "Benin City", "state": "Edo", "lat": 6.3350, "lon": 5.6278},
    {"city": "Enugu", "state": "Enugu", "lat": 6.4584, "lon": 7.5464},
    {"city": "Nsukka", "state": "Enugu", "lat": 6.8569, "lon": 7.3958},
    {"city": "Kaduna", "state": "Kaduna", "lat": 10.5264, "lon": 7.4384},
    {"city": "Zaria", "state": "Kaduna", "lat": 11.0855, "lon": 7.7199},
    {"city": "Calabar", "state": "Cross River", "lat": 4.9757, "lon": 8.3417},
    {"city": "Uyo", "state": "Akwa Ibom", "lat": 5.0510, "lon": 7.9328},
    {"city": "Warri", "state": "Delta", "lat": 5.5167, "lon": 5.7500},
    {"city": "Asaba", "state": "Delta", "lat": 6.1983, "lon": 6.7333},
    {"city": "Owerri", "state": "Imo", "lat": 5.4836, "lon": 7.0333},
    {"city": "Abeokuta", "state": "Ogun", "lat": 7.1557, "lon": 3.3451},
    {"city": "Ijebu Ode", "state": "Ogun", "lat": 6.8197, "lon": 3.9173},
    {"city": "Akure", "state": "Ondo", "lat": 7.2571, "lon": 5.2058},
    {"city": "Ondo", "state": "Ondo", "lat": 7.0911, "lon": 4.8333},
    {"city": "Osogbo", "state": "Osun", "lat": 7.7827, "lon": 4.5418},
    {"city": "Ile-Ife", "state": "Osun", "lat": 7.4833, "lon": 4.5667},
    {"city": "Ilorin", "state": "Kwara", "lat": 8.4966, "lon": 4.5421},
    {"city": "Jos", "state": "Plateau", "lat": 9.8965, "lon": 8.8583},
    {"city": "Maiduguri", "state": "Borno", "lat": 11.8311, "lon": 13.1510},
    {"city": "Sokoto", "state": "Sokoto", "lat": 13.0059, "lon": 5.2476},
    {"city": "Bauchi", "state": "Bauchi", "lat": 10.3158, "lon": 9.8442},
    {"city": "Minna", "state": "Niger", "lat": 9.6139, "lon": 6.5569},
    {"city": "Makurdi", "state": "Benue", "lat": 7.7322, "lon": 8.5391},
    {"city": "Lafia", "state": "Nasarawa", "lat": 8.4933, "lon": 8.5153},
    {"city": "Lokoja", "state": "Kogi", "lat": 7.7969, "lon": 6.7406},
    {"city": "Abakaliki", "state": "Ebonyi", "lat": 6.3249, "lon": 8.1137},
    {"city": "Awka", "state": "Anambra", "lat": 6.2209, "lon": 7.0719},
    {"city": "Onitsha", "state": "Anambra", "lat": 6.1518, "lon": 6.7860},
    {"city": "Yola", "state": "Adamawa", "lat": 9.2004, "lon": 12.4833},
    {"city": "Jalingo", "state": "Taraba", "lat": 8.8931, "lon": 11.3597},
    {"city": "Gombe", "state": "Gombe", "lat": 10.2897, "lon": 11.1673},
    {"city": "Katsina", "state": "Katsina", "lat": 12.9908, "lon": 7.6018},
    {"city": "Gusau", "state": "Zamfara", "lat": 12.1628, "lon": 6.6614},
    {"city": "Birnin Kebbi", "state": "Kebbi", "lat": 12.4539, "lon": 4.1975},
    {"city": "Damaturu", "state": "Yobe", "lat": 11.7470, "lon": 11.9608},
    {"city": "Dutse", "state": "Jigawa", "lat": 11.7562, "lon": 9.3390},
    {"city": "Ado-Ekiti", "state": "Ekiti", "lat": 7.6211, "lon": 5.2215},
    {"city": "Yenagoa", "state": "Bayelsa", "lat": 4.9267, "lon": 6.2676},
]

# State bounding boxes approx (min_lat, min_lon, max_lat, max_lon)
STATE_BBOXES = {
    "Lagos": (6.35, 2.70, 6.70, 4.30),
    "FCT": (8.25, 6.75, 9.35, 7.70),
    "Oyo": (7.05, 2.65, 9.15, 4.60),
    "Rivers": (4.30, 6.35, 5.10, 7.60),
    "Kano": (11.15, 7.65, 12.65, 9.45),
    "Edo": (5.75, 5.05, 7.60, 6.75),
    "Enugu": (5.90, 6.85, 7.15, 7.85),
    "Kaduna": (9.05, 6.10, 11.55, 8.85),
    "Cross River": (4.45, 7.80, 6.95, 9.45),
    "Akwa Ibom": (4.50, 7.50, 5.45, 8.35),
    "Delta": (5.00, 5.00, 6.50, 6.75),
    "Imo": (5.10, 6.80, 5.95, 7.45),
    "Ogun": (6.35, 2.70, 7.95, 4.85),
    "Ondo": (5.80, 4.45, 7.85, 6.00),
    "Osun": (7.05, 4.05, 8.10, 5.15),
    "Kwara": (7.90, 2.70, 10.15, 6.15),
    "Plateau": (8.35, 8.35, 10.40, 10.00),
    "Anambra": (5.65, 6.60, 6.50, 7.25),
    "Abia": (4.80, 7.15, 6.05, 7.95),
    "Benue": (6.55, 7.50, 8.20, 10.00),
    "Kogi": (6.55, 5.65, 8.75, 7.95),
    "Nasarawa": (7.70, 6.85, 9.35, 9.60),
    "Niger": (8.20, 3.65, 11.35, 7.40),
    "Borno": (10.00, 11.50, 13.80, 14.70),
    "Adamawa": (7.45, 11.50, 10.95, 13.75),
    "Gombe": (9.50, 10.50, 11.40, 11.90),
    "Bauchi": (9.50, 8.85, 12.50, 11.10),
    "Yobe": (11.00, 11.00, 13.50, 13.00),
    "Jigawa": (11.00, 9.00, 13.10, 10.60),
    "Katsina": (11.10, 6.85, 13.40, 9.00),
    "Zamfara": (11.10, 5.75, 13.15, 7.25),
    "Sokoto": (11.50, 4.20, 13.90, 6.70),
    "Kebbi": (10.05, 3.50, 13.25, 5.50),
    "Taraba": (6.50, 9.15, 9.60, 12.00),
    "Ebonyi": (5.65, 7.50, 6.75, 8.50),
    "Bayelsa": (4.25, 5.35, 5.40, 6.75),
    "Ekiti": (7.25, 4.80, 8.10, 5.80),
}

CUISINE_MAP = {
    "local": "Nigerian",
    "nigerian": "Nigerian",
    "african": "African",
    "west_african": "West African",
    "continental": "Continental",
    "international": "International",
    "chinese": "Chinese",
    "indian": "Indian",
    "lebanese": "Lebanese",
    "italian": "Italian",
    "american": "American",
    "fast_food": "Fast Food",
    "burger": "Fast Food",
    "chicken": "Fast Food",
    "shawarma": "Shawarma",
    "pizza": "Pizza",
    "grill": "Grill",
    "bbq": "BBQ",
    "barbecue": "BBQ",
    "seafood": "Seafood",
    "fish": "Seafood",
    "soup": "Nigerian",
    "suya": "Nigerian",
    "rice": "Nigerian",
    "jollof": "Nigerian",
    "cafe": "Cafe",
    "coffee": "Cafe",
    "coffee_shop": "Cafe",
    "bakery": "Bakery",
    "pastry": "Bakery",
    "ice_cream": "Ice Cream",
    "dessert": "Ice Cream",
    "bar": "Bar Food",
    "pub": "Bar Food",
    "drinks": "Bar Food",
    "traditional": "Nigerian",
    "regional": "Nigerian",
    "amala": "Nigerian",
    "pounded_yam": "Nigerian",
    "buka": "Nigerian",
    "bukateria": "Nigerian",
    "mama_put": "Nigerian",
    "bolie": "Nigerian",
    "boli": "Nigerian",
    "peppersoup": "Nigerian",
    "pepper_soup": "Nigerian",
    "isi_ewu": "Nigerian",
    "nkwobi": "Nigerian",
    "asun": "Nigerian",
}

OVERPASS_MIRRORS = [
    "https://z.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass-api.de/api/interpreter",
]

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def fetch_nationwide_overpass(cache_file: Path) -> List[Dict[str, Any]]:
    if cache_file.exists():
        print(f"Loading cached nationwide OSM data from {cache_file}...")
        with open(cache_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("elements", [])

    print("Querying Overpass across Nigeria using spatial grid tiles (zero-timeout)...")
    tiles_dir = cache_file.parent / "osm_tiles"
    tiles_dir.mkdir(parents=True, exist_ok=True)

    lat_steps = [(4.0 + i*2.0, 4.0 + (i+1)*2.0) for i in range(5)]
    lon_steps = [(2.5 + j*2.0, 2.5 + (j+1)*2.0) for j in range(6)]

    all_elements: Dict[Tuple[str, int], Dict[str, Any]] = {}
    total_tiles = len(lat_steps) * len(lon_steps)
    tile_idx = 0

    for s, n in lat_steps:
        for w, e in lon_steps:
            tile_idx += 1
            tile_name = f"tile_lat_{s:.1f}_{n:.1f}_lon_{w:.1f}_{e:.1f}.json"
            tile_path = tiles_dir / tile_name

            if tile_path.exists():
                with open(tile_path, "r", encoding="utf-8") as tf:
                    t_data = json.load(tf)
                for el in t_data.get("elements", []):
                    key = (el.get("type", "node"), el.get("id"))
                    all_elements[key] = el
                continue

            query = f"""
            [out:json][timeout:45];
            (
              nwr["amenity"~"^(restaurant|fast_food|cafe|bar|pub|food_court|ice_cream)$"]({s:.2f}, {w:.2f}, {n:.2f}, {e:.2f});
              nwr["shop"~"^(bakery|butcher|seafood)$"]({s:.2f}, {w:.2f}, {n:.2f}, {e:.2f});
            );
            out center meta;
            """
            encoded = urllib.parse.urlencode({"data": query}).encode("utf-8")
            headers = {"User-Agent": f"TasteMatch-TileExtract/1.0 ({tile_name})"}

            success = False
            for ep in OVERPASS_MIRRORS:
                try:
                    req = urllib.request.Request(ep, data=encoded, headers=headers)
                    with urllib.request.urlopen(req, timeout=45) as resp:
                        res = json.loads(resp.read().decode("utf-8"))
                        t_elements = res.get("elements", [])
                        print(f"  [{tile_idx}/{total_tiles}] Tile ({s:.1f}-{n:.1f}N, {w:.1f}-{e:.1f}E): {len(t_elements)} elements from {ep.split('/')[2]}")
                        with open(tile_path, "w", encoding="utf-8") as tf:
                            json.dump(res, tf)
                        for el in t_elements:
                            key = (el.get("type", "node"), el.get("id"))
                            all_elements[key] = el
                        success = True
                        break
                except Exception as err:
                    continue

            if not success:
                print(f"  ⚠️ Warning: Tile [{tile_idx}/{total_tiles}] failed across mirrors. Proceeding.")
            time.sleep(1.0)

    unique_elements = list(all_elements.values())
    print(f"\n✓ Completed grid extraction: {len(unique_elements)} unique elements across Nigeria.")
    cache_file.parent.mkdir(parents=True, exist_ok=True)
    with open(cache_file, "w", encoding="utf-8") as f:
        json.dump({"elements": unique_elements}, f)

    return unique_elements

def load_nigeria_polygon(poly_path: Path) -> List[Tuple[float, float]]:
    coords: List[Tuple[float, float]] = []
    if not poly_path.exists():
        return coords
    with open(poly_path, "r", encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) == 2:
                try:
                    lon = float(parts[0])
                    lat = float(parts[1])
                    coords.append((lon, lat))
                except ValueError:
                    pass
    return coords

def is_point_in_polygon(lon: float, lat: float, poly: List[Tuple[float, float]]) -> bool:
    if not poly or len(poly) < 3:
        return 4.0 <= lat <= 14.5 and 2.5 <= lon <= 15.0
    inside = False
    n = len(poly)
    p1x, p1y = poly[0]
    for i in range(n + 1):
        p2x, p2y = poly[i % n]
        if lat > min(p1y, p2y):
            if lat <= max(p1y, p2y):
                if lon <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (lat - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or lon <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

def assign_city_state(lat: float, lon: float, tags: Dict[str, str]) -> Tuple[str, str, str]:
    """
    City assignment chain:
      Step 1: addr:city
      Step 2: addr:state mapping
      Step 3: Point-in-polygon / state bbox
      Step 4: Nearest known place=city within 25 km
      Step 5: Unassigned
    Returns (city, state, step_used)
    """
    # Step 1: addr:city
    addr_city = tags.get("addr:city") or tags.get("city")
    if addr_city and addr_city.strip():
        c_clean = addr_city.strip()
        addr_state = tags.get("addr:state") or tags.get("state")
        s_clean = addr_state.strip() if addr_state else "Unknown"
        return (c_clean, s_clean, "step1_addr_city")

    # Step 2: addr:state
    addr_state = tags.get("addr:state") or tags.get("state")
    if addr_state and addr_state.strip():
        s_clean = addr_state.strip()
        matching_cities = [c for c in KNOWN_NIGERIAN_CITIES if c["state"].lower() == s_clean.lower()]
        if matching_cities:
            closest = min(matching_cities, key=lambda c: haversine(lat, lon, c["lat"], c["lon"]))
            dist = haversine(lat, lon, closest["lat"], closest["lon"])
            if dist <= 35:
                return (closest["city"], closest["state"], "step2_addr_state")

    # Step 4: Nearest known city within 25 km
    closest = min(KNOWN_NIGERIAN_CITIES, key=lambda c: haversine(lat, lon, c["lat"], c["lon"]))
    dist = haversine(lat, lon, closest["lat"], closest["lon"])
    if dist <= 25.0:
        return (closest["city"], closest["state"], "step4_nearest_city")

    # Step 3: Bounding box check against states
    candidates = []
    for state_name, bbox in STATE_BBOXES.items():
        min_lat, min_lon, max_lat, max_lon = bbox
        if min_lat <= lat <= max_lat and min_lon <= lon <= max_lon:
            candidates.append(state_name)

    if candidates:
        state_picked = candidates[0]
        capitals = [c for c in KNOWN_NIGERIAN_CITIES if c["state"] == state_picked]
        if capitals:
            return (f"{capitals[0]['city']} Area", state_picked, "step3_state_bbox")
        return ("Unassigned", state_picked, "step3_state_bbox")

    # Step 5: Unassigned
    return ("Unassigned", "Unassigned", "step5_unassigned")

def parse_element(el: Dict[str, Any], poly: List[Tuple[float, float]]) -> Optional[Dict[str, Any]]:
    tags = el.get("tags", {})
    el_type = el.get("type", "node")
    el_id = el.get("id")

    # Lat/lon resolution
    lat = el.get("lat")
    lon = el.get("lon")
    if lat is None or lon is None:
        center = el.get("center", {})
        lat = center.get("lat")
        lon = center.get("lon")
    if lat is None or lon is None:
        return None

    # Country tag check
    addr_country = tags.get("addr:country") or tags.get("country")
    if addr_country and addr_country.upper() not in ("NG", "NIGERIA"):
        return None

    # Boundary check against official Nigeria polygon
    if not is_point_in_polygon(lon, lat, poly):
        return None

    # Determine place_type
    amenity = tags.get("amenity")
    shop = tags.get("shop")
    if shop in ("bakery", "butcher", "seafood"):
        place_type = "food_shop"
    elif amenity in ("restaurant", "fast_food", "cafe", "bar", "pub", "food_court", "ice_cream"):
        place_type = amenity
    elif tags.get("cuisine") in ("nigerian", "local", "african"):
        place_type = "restaurant"
    else:
        place_type = "restaurant"

    name = tags.get("name") or tags.get("name:en")
    if not name:
        return None

    # City & State assignment
    city, state, step_used = assign_city_state(lat, lon, tags)

    # Cuisines
    cuisines_raw = tags.get("cuisine")
    unmapped_cuisines = []
    if cuisines_raw:
        parts = [p.strip().lower() for p in re.split(r"[;,]", cuisines_raw) if p.strip()]
        mapped = []
        for p in parts:
            if p in CUISINE_MAP:
                mapped.append(CUISINE_MAP[p])
            else:
                unmapped_cuisines.append(p)
                mapped.append("Other")
        cuisines_str = ", ".join(dict.fromkeys(mapped))
    else:
        cuisines_str = "Unspecified"

    # Contact structured
    contact = {}
    for k, v in tags.items():
        if k.startswith("contact:"):
            contact[k.replace("contact:", "")] = v
    phone = tags.get("phone") or tags.get("contact:phone") or contact.get("phone")
    website = tags.get("website") or tags.get("contact:website") or contact.get("website")
    hours = tags.get("opening_hours")

    # Addr structured
    addr = {}
    for k, v in tags.items():
        if k.startswith("addr:"):
            addr[k.replace("addr:", "")] = v
    address_str = addr.get("street") or tags.get("address")
    locality_str = addr.get("suburb") or addr.get("neighbourhood") or addr.get("quarter")

    # Payment tags
    payment = {}
    for k, v in tags.items():
        if k.startswith("payment:"):
            payment[k.replace("payment:", "")] = (v.lower() == "yes" or v.lower() == "true")
    if "cash" in payment:
        payment["cash"] = payment["cash"]
    if any(k in payment for k in ("cards", "credit_cards", "debit_cards", "visa", "mastercard")):
        payment["cards"] = True
    if any(k in payment for k in ("mobile_payment", "bank_transfer", "pos")):
        payment["mobile_payment"] = True

    # Diet tags
    diet = {}
    if tags.get("diet:halal") in ("yes", "only"):
        diet["halal"] = True
    if tags.get("diet:vegetarian") in ("yes", "only"):
        diet["vegetarian"] = True
    if tags.get("diet:vegan") in ("yes", "only"):
        diet["vegan"] = True

    # Amenities tags
    amenities = {}
    for field in ("outdoor_seating", "indoor_seating", "air_conditioning", "internet_access",
                  "wheelchair", "takeaway", "delivery", "drive_through", "smoking"):
        val = tags.get(field)
        if val:
            amenities[field] = val.lower() in ("yes", "true", "wlan", "free")
    for str_field in ("capacity", "brand", "operator"):
        val = tags.get(str_field)
        if val:
            amenities[str_field] = val

    uid = f"osm:{el_type}/{el_id}"
    osm_timestamp = el.get("timestamp")
    osm_version = el.get("version")
    check_date = tags.get("check_date") or tags.get("survey:date")

    return {
        "uid": uid,
        "source_id": f"{el_type}/{el_id}",
        "restaurant_name": name,
        "country": "Nigeria",
        "city": city,
        "state": state,
        "locality": locality_str,
        "address": address_str,
        "latitude": round(lat, 7),
        "longitude": round(lon, 7),
        "place_type": place_type,
        "cuisines": cuisines_str,
        "cuisines_raw": cuisines_raw,
        "unmapped_cuisines": unmapped_cuisines,
        "opening_hours": hours,
        "phone": phone,
        "website": website,
        "contact": contact if contact else None,
        "addr": addr if addr else None,
        "payment_methods": payment if payment else None,
        "diet": diet if diet else None,
        "amenities": amenities if amenities else None,
        "osm_timestamp": osm_timestamp,
        "osm_version": osm_version,
        "check_date": check_date,
        "data_source": "OpenStreetMap",
        "licence": "ODbL 1.0",
        "assignment_step": step_used,
        # Required nulls per Rule 1:
        "aggregate_rating": None,
        "weighted_rating": None,
        "price_range": None,
        "average_cost_for_two": None,
        "votes": None,
        "has_table_booking": None,
        "has_online_delivery": None,
    }

def main():
    parser = argparse.ArgumentParser(description="Extract and measure all food places in Nigeria from OSM.")
    parser.add_argument("--pbf", type=str, help="Path to Geofabrik .osm.pbf file")
    parser.add_argument("--cache", type=str, default=str(RAW_DIR / "nigeria_full_osm.json"),
                        help="Path to cached Overpass elements JSON")
    parser.add_argument("--out", type=str, default=str(PROCESSED_DIR / "restaurants_ng_full.json"),
                        help="Output JSON path")
    args = parser.parse_args()

    cache_path = Path(args.cache)
    poly_path = REPO_ROOT / "data" / "nigeria.poly"
    poly = load_nigeria_polygon(poly_path)
    print(f"Loaded boundary polygon from {poly_path} ({len(poly)} vertices)")

    elements = fetch_nationwide_overpass(cache_path)
    print(f"\nProcessing {len(elements)} raw OSM elements...")

    parsed_records = []
    dropped_no_name = 0
    dropped_bounds = 0
    step_counts = {
        "step1_addr_city": 0,
        "step2_addr_state": 0,
        "step3_state_bbox": 0,
        "step4_nearest_city": 0,
        "step5_unassigned": 0,
    }

    all_unmapped_cuisines = []

    for el in elements:
        tags = el.get("tags", {})
        if not tags.get("name") and not tags.get("name:en"):
            dropped_no_name += 1
            continue
        rec = parse_element(el, poly)
        if not rec:
            dropped_bounds += 1
            continue
        step_counts[rec["assignment_step"]] += 1
        all_unmapped_cuisines.extend(rec["unmapped_cuisines"])
        parsed_records.append(rec)

    total_valid = len(parsed_records)
    print(f"✓ Valid parsed places with names: {total_valid}")
    print(f"  Dropped (no name): {dropped_no_name}")
    print(f"  Dropped (outside bounds): {dropped_bounds}")

    # City Assignment Chain stats
    print("\n============================================================")
    print("CITY ASSIGNMENT CHAIN RESOLUTION:")
    print("============================================================")
    for step, cnt in step_counts.items():
        pct = (cnt / total_valid * 100) if total_valid else 0
        print(f"  {step:<22}: {cnt:>5} ({pct:5.1f}%)")

    # City breakdown
    city_counts = {}
    state_counts = {}
    for r in parsed_records:
        city_counts[r["city"]] = city_counts.get(r["city"], 0) + 1
        state_counts[r["state"]] = state_counts.get(r["state"], 0) + 1

    sorted_cities = sorted(city_counts.items(), key=lambda x: x[1], reverse=True)
    sorted_states = sorted(state_counts.items(), key=lambda x: x[1], reverse=True)

    print("\n============================================================")
    print("TOP 30 NIGERIAN CITIES BY RECORD COUNT:")
    print("============================================================")
    for idx, (c, cnt) in enumerate(sorted_cities[:30], 1):
        pct = cnt / total_valid * 100
        print(f"  {idx:2}. {c:<22}: {cnt:>5} ({pct:4.1f}%)")

    print("\n============================================================")
    print("TOP 15 STATES BY RECORD COUNT:")
    print("============================================================")
    for idx, (s, cnt) in enumerate(sorted_states[:15], 1):
        pct = cnt / total_valid * 100
        print(f"  {idx:2}. {s:<22}: {cnt:>5} ({pct:4.1f}%)")

    # Structured Field Coverage
    def cov(field: str) -> Tuple[int, float]:
        cnt = sum(1 for r in parsed_records if r.get(field) not in (None, "Unspecified", {}))
        return cnt, (cnt / total_valid * 100) if total_valid else 0

    print("\n============================================================")
    print("STRUCTURED FIELD COVERAGE (STAGE 1 GATE):")
    print("============================================================")
    for f in ("cuisines", "locality", "address", "opening_hours", "phone", "website",
              "contact", "addr", "payment_methods", "diet", "amenities",
              "osm_timestamp", "osm_version", "check_date"):
        cnt, pct = cov(f)
        print(f"  With {f:<18}: {cnt:>5} / {total_valid} ({pct:5.1f}%)")

    # Place types breakdown
    pt_counts = {}
    for r in parsed_records:
        pt = r["place_type"]
        pt_counts[pt] = pt_counts.get(pt, 0) + 1
    print("\n  Place types breakdown:")
    for pt, cnt in sorted(pt_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"    - {pt:<16}: {cnt:>5}")

    # Top 30 unmapped cuisine values
    unmapped_freq = {}
    for u in all_unmapped_cuisines:
        unmapped_freq[u] = unmapped_freq.get(u, 0) + 1
    sorted_unmapped = sorted(unmapped_freq.items(), key=lambda x: x[1], reverse=True)

    print("\n============================================================")
    print("TOP 30 UNMAPPED CUISINE VALUES IN OSM NIGERIA:")
    print("============================================================")
    for idx, (u, cnt) in enumerate(sorted_unmapped[:30], 1):
        print(f"  {idx:2}. '{u}': {cnt}")

    # Shard sizes estimation
    out_file = Path(args.out)
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(parsed_records, f, indent=2, ensure_ascii=False)
    file_size_kb = out_file.stat().st_size / 1024
    print(f"\n✓ Saved complete dataset ({total_valid} records) → {out_file} ({file_size_kb:.1f} KB)")

    # 20 random rows for eyeball inspection
    print("\n============================================================")
    print("20 RANDOM ROWS FOR EYEBALL INSPECTION (GATE 1):")
    print("============================================================")
    random.seed(42)  # Deterministic sample
    sample_20 = random.sample(parsed_records, min(20, len(parsed_records)))
    for idx, r in enumerate(sample_20, 1):
        print(f"\n--- Row {idx}: {r['restaurant_name']} ({r['uid']}) ---")
        print(f"  Location: {r['city']}, {r['state']} (Locality: {r['locality']})")
        print(f"  Coordinates: ({r['latitude']}, {r['longitude']})")
        print(f"  Place Type: {r['place_type']} | Cuisines: {r['cuisines']}")
        print(f"  Opening Hours: {r['opening_hours']} | Phone: {r['phone']}")
        print(f"  Payment: {r['payment_methods']} | Diet: {r['diet']}")
        print(f"  Amenities: {r['amenities']}")
        print(f"  Last Edit: {r['osm_timestamp']} (v{r['osm_version']}) | Check Date: {r['check_date']}")
        print(f"  Assigned via: {r['assignment_step']}")

    print("\n============================================================")
    print("GATE 1 MEASUREMENT COMPLETED.")
    print("============================================================")

if __name__ == "__main__":
    main()
