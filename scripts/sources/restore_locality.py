#!/usr/bin/env python3
"""
scripts/sources/restore_locality.py
====================================
Restores the missing `locality` field in Nigerian OpenStreetMap places.
1. Matches exact `source_id` against the pre-rebuild dataset (data/processed/restaurants_ng.json).
2. For remaining places, checks addr subfields (suburb, neighbourhood, quarter, district).
3. For remaining places in cities with OSM locality nodes (data/raw/localities_*.json),
   assigns the nearest verified locality within 4,000 meters.
4. Leaves unknown localities as None (strictly adheres to: Real data only, Unknown = null).
"""

import json
import math
import sys
from pathlib import Path
from collections import Counter

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
NG_FULL_PATH = REPO_ROOT / "data" / "processed" / "restaurants_ng_full.json"
PREV_NG_PATH = REPO_ROOT / "data" / "processed" / "restaurants_ng.json"
RAW_DIR = REPO_ROOT / "data" / "raw"
PUBLIC_NG_PATH = REPO_ROOT / "tastematch" / "public" / "data" / "restaurants_ng.json"


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0  # meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = (math.sin(dphi / 2) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2)
    return 2.0 * R * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


def main() -> None:
    print("=" * 60)
    print("RESTORING NIGERIA OSM LOCALITIES")
    print("=" * 60)

    if not NG_FULL_PATH.exists():
        print(f"ERROR: {NG_FULL_PATH} not found", file=sys.stderr)
        sys.exit(1)

    with open(NG_FULL_PATH, "r", encoding="utf-8") as f:
        ng_full = json.load(f)
    print(f"Loaded {len(ng_full)} places from {NG_FULL_PATH.name}")

    # 1. Exact match from pre-rebuild dataset
    prev_localities: dict[str, str] = {}
    if PREV_NG_PATH.exists():
        with open(PREV_NG_PATH, "r", encoding="utf-8") as f:
            prev_records = json.load(f)
        for r in prev_records:
            sid = r.get("source_id")
            loc = r.get("locality")
            if sid and loc:
                prev_localities[sid] = loc
        print(f"Loaded {len(prev_localities)} verified localities from pre-rebuild dataset")

    # 2. Load OSM locality nodes from raw cache
    localities_by_city: dict[str, list[dict]] = {}
    for p in RAW_DIR.glob("localities_*.json"):
        # e.g. localities_lagos_admin.json -> 'lagos'
        city_slug = p.stem.replace("localities_", "").replace("_admin", "").replace("_around", "")
        with open(p, "r", encoding="utf-8") as f:
            data = json.load(f)
        elements = data.get("elements", [])
        locs = []
        for el in elements:
            lat = el.get("lat") or (el.get("center") or {}).get("lat")
            lon = el.get("lon") or (el.get("center") or {}).get("lon")
            tags = el.get("tags") or {}
            name = tags.get("name") or tags.get("name:en")
            if lat is not None and lon is not None and name:
                locs.append({"name": name, "lat": float(lat), "lon": float(lon)})
        if locs:
            localities_by_city[city_slug] = locs
            print(f"  Loaded {len(locs):>3} locality nodes for '{city_slug}' from {p.name}")

    # Aliases to map city to locality file keys
    CITY_TO_LOCALITY_KEY = {
        "lagos": "lagos",
        "lagos area": "lagos",
        "lagos island": "lagos",
        "ikeja": "lagos",
        "lekki": "lagos",
        "victoria island": "lagos",
        "ilupeju, lagos": "lagos",
        "abuja": "abuja",
        "abuja area": "abuja",
        "kano": "kano",
        "enugu": "enugu",
        "kaduna": "kaduna",
        "warri": "warri",
        "owerri": "owerri",
    }

    restored_count = 0
    from_prev = 0
    from_addr = 0
    from_spatial = 0

    for r in ng_full:
        sid = r.get("source_id")
        loc = None

        # Step 1: Pre-rebuild exact match
        if sid and sid in prev_localities:
            loc = prev_localities[sid]
            from_prev += 1

        # Step 2: addr tags
        if not loc:
            addr = r.get("addr") or {}
            loc = (
                addr.get("suburb") or
                addr.get("neighbourhood") or
                addr.get("quarter") or
                addr.get("district")
            )
            if loc:
                from_addr += 1

        # Step 3: Spatial nearest-neighbour within 4,000 meters
        if not loc:
            city_name = (r.get("city") or "").lower().strip()
            loc_key = CITY_TO_LOCALITY_KEY.get(city_name)
            candidate_locs = localities_by_city.get(loc_key, []) if loc_key else []
            rlat = r.get("latitude")
            rlon = r.get("longitude")

            if candidate_locs and rlat is not None and rlon is not None:
                best_dist = 4000.0  # 4 km cap
                best_name = None
                for candidate in candidate_locs:
                    d = haversine(rlat, rlon, candidate["lat"], candidate["lon"])
                    if d < best_dist:
                        best_dist = d
                        best_name = candidate["name"]
                if best_name:
                    loc = best_name
                    from_spatial += 1

        r["locality"] = loc
        if loc:
            restored_count += 1

    print("\n--- LOCALITY RESTORATION SUMMARY ---")
    print(f"Total places:            {len(ng_full)}")
    print(f"Places with locality:    {restored_count} ({restored_count / len(ng_full) * 100:.1f}%)")
    print(f"  From pre-rebuild:      {from_prev}")
    print(f"  From addr tags:        {from_addr}")
    print(f"  From spatial nearest:  {from_spatial}")

    # Save to data/processed/restaurants_ng_full.json
    with open(NG_FULL_PATH, "w", encoding="utf-8") as f:
        json.dump(ng_full, f, indent=2, ensure_ascii=False)
    print(f"\nSaved updated {NG_FULL_PATH}")

    # Also sync to public dataset
    if PUBLIC_NG_PATH.exists():
        with open(PUBLIC_NG_PATH, "w", encoding="utf-8") as f:
            json.dump(ng_full, f, indent=2, ensure_ascii=False)
        print(f"Synced to {PUBLIC_NG_PATH}")

    print("SUCCESS: Locality restored.")


if __name__ == "__main__":
    main()
