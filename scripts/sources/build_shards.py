#!/usr/bin/env python3
"""
scripts/sources/build_shards.py
================================
Compiles multi-country sharded architecture for TasteMatch:
- data/out/countries.json & tastematch/public/data/countries.json
- data/out/countries/<CODE>.json & tastematch/public/data/countries/<CODE>.json
- data/out/shards/<CODE>/<city-slug>-<n>.json & tastematch/public/data/shards/<CODE>/...
- Shards capped at 8 MB raw each.
- Builds are strictly deterministic / idempotent (sorted keys, stable sort).
"""

import json
import re
import sys
from pathlib import Path
from collections import defaultdict
from datetime import datetime, timezone

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ZOMATO_PATH = REPO_ROOT / "tastematch" / "public" / "data" / "restaurants.json"
NG_FULL_PATH = REPO_ROOT / "data" / "processed" / "restaurants_ng_full.json"

OUT_DIR = REPO_ROOT / "data" / "out"
PUBLIC_DATA_DIR = REPO_ROOT / "tastematch" / "public" / "data"

MAX_SHARD_BYTES = 8 * 1024 * 1024  # 8 MB raw cap

# Country ISO 3166-1 alpha-2 mapping
COUNTRY_CODES = {
    "Nigeria": "NG",
    "India": "IN",
    "United States": "US",
    "USA": "US",
    "Australia": "AU",
    "Brazil": "BR",
    "Canada": "CA",
    "Indonesia": "ID",
    "New Zealand": "NZ",
    "Philippines": "PH",
    "Qatar": "QA",
    "Singapore": "SG",
    "South Africa": "ZA",
    "Sri Lanka": "LK",
    "Turkey": "TR",
    "UAE": "AE",
    "United Arab Emirates": "AE",
    "United Kingdom": "GB",
}

LICENCES = {
    "NG": {
        "sources": ["OpenStreetMap"],
        "licence": "ODbL 1.0",
        "attribution": "© OpenStreetMap contributors, licensed under the Open Data Commons Open Database License (ODbL).",
    },
    "DEFAULT": {
        "sources": ["Zomato Kaggle Archive"],
        "licence": "CC0 / Public Domain",
        "attribution": "Zomato Restaurant Kaggle archive for exploratory data analysis.",
    },
}


def slugify(text: str) -> str:
    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return s or "unassigned"


def main() -> None:
    print("Building sharded architecture for TasteMatch...")

    # 1. Load Nigeria OSM dataset
    ng_places = []
    if NG_FULL_PATH.exists():
        with open(NG_FULL_PATH, "r", encoding="utf-8") as f:
            ng_places = json.load(f)
        print(f"Loaded {len(ng_places)} Nigerian OSM records from {NG_FULL_PATH.name}")
    else:
        print(f"ERROR: {NG_FULL_PATH} not found", file=sys.stderr)
        sys.exit(1)

    # 2. Load Zomato dataset
    zomato_places = []
    if ZOMATO_PATH.exists():
        with open(ZOMATO_PATH, "r", encoding="utf-8") as f:
            zomato_places = json.load(f)
        print(f"Loaded {len(zomato_places)} Zomato records from {ZOMATO_PATH.name}")
    else:
        print(f"ERROR: {ZOMATO_PATH} not found", file=sys.stderr)
        sys.exit(1)

    # Ensure every Zomato record has a deterministic uid
    for r in zomato_places:
        if not r.get("uid"):
            r["uid"] = f"zomato:{r['restaurant_id']}"

    # Group by Country -> City
    country_groups: dict[str, dict[str, list[dict]]] = defaultdict(lambda: defaultdict(list))

    for r in ng_places:
        country_name = r.get("country", "Nigeria")
        city_name = r.get("city", "Unassigned")
        country_groups[country_name][city_name].append(r)

    for r in zomato_places:
        country_name = r.get("country", "India")
        city_name = r.get("city", "New Delhi")
        country_groups[country_name][city_name].append(r)

    # Build countries catalog
    countries_catalog = []

    for country_name in sorted(country_groups.keys()):
        code = COUNTRY_CODES.get(country_name, country_name[:2].upper())
        cities_map = country_groups[country_name]
        total_places = sum(len(places) for places in cities_map.values())
        lic_info = LICENCES.get(code, LICENCES["DEFAULT"])

        country_entry = {
            "code": code,
            "name": country_name,
            "status": "available",
            "places": total_places,
            "cities": len(cities_map),
            "retrieved_at": "2026-10-09T00:00:00Z",
            "sources": lic_info["sources"],
            "licence": lic_info["licence"],
            "attribution": lic_info["attribution"],
            "data_base_url": f"data/shards/{code}/",
        }
        countries_catalog.append(country_entry)

        # Build country index with capabilities: countries/<CODE>.json
        city_index = {}
        for city_name in sorted(cities_map.keys()):
            places = cities_map[city_name]
            # Deterministic sort by uid
            places.sort(key=lambda x: str(x.get("uid", "")))

            has_prices = any(p.get("price_range") is not None for p in places)
            has_ratings = any(p.get("aggregate_rating") is not None for p in places)
            has_booking = any(p.get("has_table_booking") == 1 for p in places)
            has_delivery = any(p.get("has_online_delivery") == 1 for p in places)
            has_hours = any(bool(p.get("opening_hours")) for p in places)

            # Sharding: split if shard exceeds MAX_SHARD_BYTES
            city_slug = slugify(city_name)
            shard_chunks: list[list[dict]] = []
            current_chunk: list[dict] = []
            current_bytes = 0

            for p in places:
                p_bytes = len(json.dumps(p, sort_keys=True).encode("utf-8")) + 2
                if current_bytes + p_bytes > MAX_SHARD_BYTES and current_chunk:
                    shard_chunks.append(current_chunk)
                    current_chunk = [p]
                    current_bytes = p_bytes
                else:
                    current_chunk.append(p)
                    current_bytes += p_bytes

            if current_chunk:
                shard_chunks.append(current_chunk)

            shard_filenames = []
            for idx, chunk in enumerate(shard_chunks, start=1):
                filename = f"{city_slug}-{idx}.json"
                shard_filenames.append(filename)

                # Write shard to both data/out and public/data
                for base in [OUT_DIR, PUBLIC_DATA_DIR]:
                    shard_dir = base / "shards" / code
                    shard_dir.mkdir(parents=True, exist_ok=True)
                    shard_path = shard_dir / filename
                    with open(shard_path, "w", encoding="utf-8") as f:
                        json.dump(chunk, f, indent=2, sort_keys=True, ensure_ascii=False)

            city_index[city_name] = {
                "count": len(places),
                "hasPrices": has_prices,
                "hasRatings": has_ratings,
                "hasBooking": has_booking,
                "hasDelivery": has_delivery,
                "hasHours": has_hours,
                "shards": shard_filenames,
            }

        country_index_data = {
            "country": country_name,
            "code": code,
            "cities": city_index,
        }

        # Write country index
        for base in [OUT_DIR, PUBLIC_DATA_DIR]:
            c_dir = base / "countries"
            c_dir.mkdir(parents=True, exist_ok=True)
            c_path = c_dir / f"{code}.json"
            with open(c_path, "w", encoding="utf-8") as f:
                json.dump(country_index_data, f, indent=2, sort_keys=True, ensure_ascii=False)

    # Write countries catalog
    for base in [OUT_DIR, PUBLIC_DATA_DIR]:
        base.mkdir(parents=True, exist_ok=True)
        cat_path = base / "countries.json"
        with open(cat_path, "w", encoding="utf-8") as f:
            json.dump(countries_catalog, f, indent=2, sort_keys=True, ensure_ascii=False)

    # Sync public/data/restaurants_ng.json with full Nigeria extract
    pub_ng = PUBLIC_DATA_DIR / "restaurants_ng.json"
    with open(pub_ng, "w", encoding="utf-8") as f:
        # Sort deterministically
        ng_places.sort(key=lambda x: str(x.get("uid", "")))
        json.dump(ng_places, f, indent=2, sort_keys=True, ensure_ascii=False)

    print(f"Generated {len(countries_catalog)} countries in countries.json")
    print(f"Shards generated and synced to both data/out/ and tastematch/public/data/")
    print("Idempotent build complete.")


if __name__ == "__main__":
    main()
