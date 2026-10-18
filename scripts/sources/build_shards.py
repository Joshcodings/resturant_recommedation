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
import math
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

# Canonical alias mapping for Nigerian cities to prevent duplicate shards, collisions, and fragmentation
CITY_ALIASES = {
    # Abuja variants
    "ABUJA": "Abuja",
    "abuja": "Abuja",
    "Abuja Area": "Abuja",
    "Abuja Nigeria": "Abuja",
    # Benin City variants
    "Benin City Area": "Benin City",
    "Benin city": "Benin City",
    "benin city": "Benin City",
    # Ibadan variants
    "IBADAN": "Ibadan",
    "Ibadan Area": "Ibadan",
    "Mokola, Ibadam": "Ibadan",
    # Jos variants
    "jos": "Jos",
    "Jos Area": "Jos",
    "Jos-North": "Jos",
    # Kano variants
    "kano": "Kano",
    "Kano Area": "Kano",
    # Lekki variants
    "LEKKI": "Lekki",
    "lekki": "Lekki",
    "Lekki, Lagos": "Lekki",
    # Lagos variants
    "lagos": "Lagos",
    "Lagos Area": "Lagos",
    "Lagaos": "Lagos",
    "Lagos Island": "Lagos",
    "Ilupeju, Lagos": "Lagos",
    # Port Harcourt variants
    "port harcourt": "Port Harcourt",
    "Port Harcourt Area": "Port Harcourt",
    "Choba Port Harcourt": "Port Harcourt",
    "Choba/Port Harcourt": "Port Harcourt",
    "Rumualogu/Port Harcourt": "Port Harcourt",
    "University of Port Harcourt, Abuja Campus, Choba, Rivers State.": "Port Harcourt",
    # Owerri variants
    "Owerri Area": "Owerri",
    # Ilorin variants
    "Ilorin Area": "Ilorin",
    "Ilorin, Kwara State, Nigeria": "Ilorin",
    # Kaduna variants
    "Kaduna Area": "Kaduna",
    "Kaduna North": "Kaduna",
    # Calabar variants
    "Calabar Area": "Calabar",
    "Calabar, Cross River": "Calabar",
    # Uyo variants
    "Uyo Area": "Uyo",
    # Warri variants
    "Warri Area": "Warri",
    # Bauchi variants
    "Bauchi Area": "Bauchi",
    # Gombe variants
    "Gombe Area": "Gombe",
    # Maiduguri variants
    "Maiduguri Area": "Maiduguri",
    # Yola variants
    "Yola Area": "Yola",
    # Lokoja variants
    "Lokoja Area": "Lokoja",
    # Makurdi variants
    "Makurdi Area": "Makurdi",
    # Osogbo variants
    "Oshogbo": "Osogbo",
    # Other case normalizations and suburban districts
    "Birnin kebbi": "Birnin Kebbi",
    "agbor": "Agbor",
    "Yenagoa, Bayelsa state": "Yenagoa",
    "Gwarinpa": "Abuja",
    "Gwagwalada": "Abuja",
    "Woji": "Port Harcourt",
    "Rumuosi junctin": "Port Harcourt",
    "Dadi Riba": "Kano",
    "Fagge D2": "Kano",
    "Mariri": "Kano",
    "Kureken Sani": "Kano",
    "Unguwar Shanu": "Kaduna",
    "Joe": "Jos",
    "Ikot Akpan-Ata": "Uyo",
    "Nsukka": "Enugu",
}


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def slugify(text: str) -> str:
    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return s or "unassigned"
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
        "sources": ["OpenStreetMap", "Overture Maps"],
        "licence": "ODbL 1.0 (OSM) / CDLA Permissive 2.0 (Overture)",
        "attribution": "© OpenStreetMap contributors (ODbL) & Data © Overture Maps Foundation (CDLA Permissive 2.0). https://overturemaps.org",
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

    # Group by Country -> City with logged alias mappings
    country_groups: dict[str, dict[str, list[dict]]] = defaultdict(lambda: defaultdict(list))
    alias_merge_log: dict[str, int] = defaultdict(int)

    for r in ng_places:
        country_name = r.get("country", "Nigeria")
        raw_city = r.get("city", "Unassigned")
        if raw_city in CITY_ALIASES:
            canonical_city = CITY_ALIASES[raw_city]
            alias_merge_log[f"{raw_city} -> {canonical_city}"] += 1
        else:
            canonical_city = raw_city
        r["city"] = canonical_city
        country_groups[country_name][canonical_city].append(r)

    print("\n============================================================")
    print("CITY ALIAS MERGE LOG:")
    print("============================================================")
    for mapping, cnt in sorted(alias_merge_log.items(), key=lambda x: -x[1]):
        print(f"  Merged {cnt:>2} place(s): {mapping}")
    print(f"Total merged alias mappings applied: {len(alias_merge_log)}")
    print("============================================================\n")

    for r in zomato_places:
        country_name = r.get("country", "India")
        city_name = r.get("city", "New Delhi")
        country_groups[country_name][city_name].append(r)

    # Build countries catalog
    countries_catalog = []
    build_timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

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
            "retrieved_at": build_timestamp,
            "sources": lic_info["sources"],
            "licence": lic_info["licence"],
            "attribution": lic_info["attribution"],
            "data_base_url": f"data/shards/{code}/",
        }
        countries_catalog.append(country_entry)

        # Clear existing shard files for this country to prevent stale/overwritten shards
        for base in [OUT_DIR, PUBLIC_DATA_DIR]:
            shard_dir = base / "shards" / code
            if shard_dir.exists():
                for old_f in shard_dir.glob("*.json"):
                    old_f.unlink()
            shard_dir.mkdir(parents=True, exist_ok=True)

        # Build country index with capabilities: countries/<CODE>.json
        city_index = {}
        for city_name in sorted(cities_map.keys()):
            places = cities_map[city_name]
            # Deterministic sort by uid
            places.sort(key=lambda x: str(x.get("uid", "")))

            # Compute centroid, bounds, and radius from places with valid coords
            coords_places = [
                p for p in places
                if p.get("latitude") is not None
                and p.get("longitude") is not None
                and (p.get("latitude") != 0 or p.get("longitude") != 0)
            ]

            centroid = None
            bounds = None
            radius_km = None

            if coords_places:
                avg_lat = sum(p["latitude"] for p in coords_places) / len(coords_places)
                avg_lon = sum(p["longitude"] for p in coords_places) / len(coords_places)
                centroid = {
                    "latitude": round(avg_lat, 6),
                    "longitude": round(avg_lon, 6),
                }
                bounds = {
                    "minLatitude": round(min(p["latitude"] for p in coords_places), 6),
                    "maxLatitude": round(max(p["latitude"] for p in coords_places), 6),
                    "minLongitude": round(min(p["longitude"] for p in coords_places), 6),
                    "maxLongitude": round(max(p["longitude"] for p in coords_places), 6),
                }
                max_d = max(haversine_km(avg_lat, avg_lon, p["latitude"], p["longitude"]) for p in coords_places)
                radius_km = round(max(max_d, 1.0), 2)

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
                "limitedCoverage": len(places) < 5,
                "centroid": centroid,
                "bounds": bounds,
                "radiusKm": radius_km,
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

    # Write reconciled manifest.json with real build time
    manifest_data = [
        {
            "file": "restaurants_ng.json",
            "recordCount": len(ng_places),
            "retrieved_at": build_timestamp,
            "source": "OpenStreetMap & Overture Maps",
            "licence": "ODbL 1.0 / CDLA Permissive 2.0",
        },
        {
            "file": "restaurants.json",
            "recordCount": len(zomato_places),
            "retrieved_at": build_timestamp,
            "source": "Zomato Kaggle Archive",
            "licence": "CC0 / Public Domain",
        },
    ]

    for m_path in [REPO_ROOT / "data" / "manifest.json", PUBLIC_DATA_DIR / "manifest.json"]:
        m_path.parent.mkdir(parents=True, exist_ok=True)
        with open(m_path, "w", encoding="utf-8") as f:
            json.dump(manifest_data, f, indent=2, sort_keys=True)
    print(f"Updated manifest.json with real build timestamp ({build_timestamp}) and reconciled record counts.")

    print(f"Generated {len(countries_catalog)} countries in countries.json")
    print(f"Shards generated and synced to both data/out/ and tastematch/public/data/")
    print("Idempotent build complete.")


if __name__ == "__main__":
    main()
